import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  isRecruiterActor,
  type RecruiterActor,
} from "@/features/recruiter-company/authorization";
import { getCompanyPublicationReadiness } from "@/features/recruiter-company/publication";
import type {
  ValidatedCompany,
  ValidatedRecruiterProfile,
} from "@/features/recruiter-company/schemas";
import {
  getAvailableCompanySlug,
  normalizeCompanySlug,
} from "@/features/recruiter-company/slug";

export class RecruiterCompanyMutationError extends Error {
  constructor(
    readonly code: "FORBIDDEN" | "NOT_FOUND" | "INCOMPLETE" | "CONFLICT",
    readonly details?: readonly string[],
  ) {
    super("Recruiter Company workspace mutation failed.");
    this.name = "RecruiterCompanyMutationError";
  }
}

function assertRecruiter(actor: RecruiterActor) {
  if (!isRecruiterActor(actor)) {
    throw new RecruiterCompanyMutationError("FORBIDDEN");
  }
}

function nullable(value: string) {
  return value || null;
}

function companyData(input: ValidatedCompany) {
  return {
    name: input.name,
    tagline: nullable(input.tagline),
    description: nullable(input.description),
    industry: nullable(input.industry),
    headquarters: nullable(input.headquarters),
    websiteUrl: nullable(input.websiteUrl),
    companySize: input.companySize || null,
    foundedYear: input.foundedYear,
  };
}

function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

async function allocateCompanySlug(
  transaction: Prisma.TransactionClient,
  companyName: string,
) {
  const baseSlug = normalizeCompanySlug(companyName);
  const matches = await transaction.company.findMany({
    where: {
      OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
    },
    select: { slug: true },
  });
  const exactFamily = new RegExp(
    `^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:-\\d+)?$`,
  );

  return getAvailableCompanySlug(
    baseSlug,
    matches.map(({ slug }) => slug).filter((slug) => exactFamily.test(slug)),
  );
}

export async function upsertRecruiterProfile(
  prisma: PrismaClient,
  actor: RecruiterActor,
  input: ValidatedRecruiterProfile,
) {
  assertRecruiter(actor);
  const data = {
    jobTitle: nullable(input.jobTitle),
    bio: nullable(input.bio),
    linkedinUrl: nullable(input.linkedinUrl),
  };

  return prisma.recruiterProfile.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, ...data },
    update: data,
  });
}

export async function createRecruiterCompany(
  prisma: PrismaClient,
  actor: RecruiterActor,
  input: ValidatedCompany,
) {
  assertRecruiter(actor);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const slug = await allocateCompanySlug(transaction, input.name);
          return transaction.company.create({
            data: {
              ...companyData(input),
              slug,
              memberships: {
                create: { userId: actor.userId, role: "OWNER" },
              },
            },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        attempt < 2 &&
        (isPrismaErrorCode(error, "P2002") || isPrismaErrorCode(error, "P2034"))
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new RecruiterCompanyMutationError("CONFLICT");
}

export async function updateRecruiterCompany(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  input: ValidatedCompany,
) {
  assertRecruiter(actor);
  const result = await prisma.company.updateMany({
    where: {
      id: companyId,
      memberships: { some: { userId: actor.userId, role: "OWNER" } },
    },
    data: companyData(input),
  });

  if (result.count !== 1) {
    throw new RecruiterCompanyMutationError("NOT_FOUND");
  }
}

async function setCompanyPublication(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  isPublished: boolean,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const company = await transaction.company.findFirst({
      where: {
        id: companyId,
        memberships: { some: { userId: actor.userId, role: "OWNER" } },
      },
      select: {
        name: true,
        description: true,
        industry: true,
        headquarters: true,
        websiteUrl: true,
      },
    });

    if (!company) {
      throw new RecruiterCompanyMutationError("NOT_FOUND");
    }

    if (isPublished) {
      const readiness = getCompanyPublicationReadiness(company);
      if (!readiness.isReady) {
        throw new RecruiterCompanyMutationError(
          "INCOMPLETE",
          readiness.missingFields.map(({ label }) => label),
        );
      }
    }

    const result = await transaction.company.updateMany({
      where: {
        id: companyId,
        memberships: { some: { userId: actor.userId, role: "OWNER" } },
      },
      data: { isPublished },
    });

    if (result.count !== 1) {
      throw new RecruiterCompanyMutationError("NOT_FOUND");
    }

    return transaction.company.findUniqueOrThrow({ where: { id: companyId } });
  });
}

export function publishRecruiterCompany(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
) {
  return setCompanyPublication(prisma, actor, companyId, true);
}

export function unpublishRecruiterCompany(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
) {
  return setCompanyPublication(prisma, actor, companyId, false);
}
