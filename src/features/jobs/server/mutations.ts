import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  isRecruiterActor,
  type RecruiterActor,
} from "@/features/recruiter-company/authorization";
import {
  canEditJob,
  canTransitionJob,
  type JobLifecycleAction,
  nextJobStatus,
} from "@/features/jobs/lifecycle";
import { getJobPublicationReadiness } from "@/features/jobs/publication";
import {
  getSkillLookupName,
  isPastCalendarDate,
  type ValidatedJobContent,
  type ValidatedJobCreate,
} from "@/features/jobs/schemas";
import { getAvailableJobSlug, normalizeJobSlug } from "@/features/jobs/slug";

export type JobMutationErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "INCOMPLETE"
  | "DUPLICATE_SKILL"
  | "CONFLICT";

export class JobMutationError extends Error {
  constructor(
    readonly code: JobMutationErrorCode,
    readonly details?: readonly string[],
  ) {
    super("Job workspace mutation failed.");
    this.name = "JobMutationError";
  }
}

function assertRecruiter(actor: RecruiterActor) {
  if (!isRecruiterActor(actor)) {
    throw new JobMutationError("FORBIDDEN");
  }
}

/** Restricts a job query to companies the actor OWNS — the IDOR boundary. */
function ownedJobWhere(userId: string, jobId: string): Prisma.JobWhereInput {
  return {
    id: jobId,
    company: { memberships: { some: { userId, role: "OWNER" } } },
  };
}

function nullable(value: string) {
  return value || null;
}

function toDeadlineDate(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function jobContentData(input: ValidatedJobContent) {
  return {
    title: input.title,
    summary: nullable(input.summary),
    description: nullable(input.description),
    responsibilities: nullable(input.responsibilities),
    requirements: nullable(input.requirements),
    location: nullable(input.location),
    employmentType: input.employmentType || null,
    workplaceType: input.workplaceType || null,
    experienceLevel: input.experienceLevel || null,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    salaryCurrency: input.salaryCurrency || null,
    applicationDeadline: toDeadlineDate(input.applicationDeadline),
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

async function allocateJobSlug(
  transaction: Prisma.TransactionClient,
  title: string,
) {
  const baseSlug = normalizeJobSlug(title);
  const matches = await transaction.job.findMany({
    where: {
      OR: [{ slug: baseSlug }, { slug: { startsWith: `${baseSlug}-` } }],
    },
    select: { slug: true },
  });
  const exactFamily = new RegExp(
    `^${baseSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:-\\d+)?$`,
  );

  return getAvailableJobSlug(
    baseSlug,
    matches.map(({ slug }) => slug).filter((slug) => exactFamily.test(slug)),
  );
}

export async function createJob(
  prisma: PrismaClient,
  actor: RecruiterActor,
  input: ValidatedJobCreate,
) {
  assertRecruiter(actor);
  const { companyId, ...content } = input;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const ownedCompany = await transaction.company.findFirst({
            where: {
              id: companyId,
              memberships: { some: { userId: actor.userId, role: "OWNER" } },
            },
            select: { id: true },
          });

          if (!ownedCompany) {
            throw new JobMutationError("NOT_FOUND");
          }

          const slug = await allocateJobSlug(transaction, content.title);
          return transaction.job.create({
            data: {
              companyId: ownedCompany.id,
              slug,
              status: "DRAFT",
              ...jobContentData(content),
            },
            select: { id: true, slug: true },
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (error instanceof JobMutationError) throw error;
      if (
        attempt < 2 &&
        (isPrismaErrorCode(error, "P2002") || isPrismaErrorCode(error, "P2034"))
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new JobMutationError("CONFLICT");
}

export async function updateJob(
  prisma: PrismaClient,
  actor: RecruiterActor,
  jobId: string,
  input: ValidatedJobContent,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findFirst({
      where: ownedJobWhere(actor.userId, jobId),
      select: {
        id: true,
        status: true,
        company: { select: { isPublished: true } },
        _count: { select: { skills: true } },
      },
    });

    if (!job) throw new JobMutationError("NOT_FOUND");
    if (!canEditJob(job.status)) {
      throw new JobMutationError("INVALID_TRANSITION");
    }

    const data = jobContentData(input);

    // A published job must stay complete and valid after an edit.
    if (job.status === "PUBLISHED") {
      const readiness = getJobPublicationReadiness({
        companyIsPublished: job.company.isPublished,
        skillCount: job._count.skills,
        job: {
          title: data.title,
          summary: data.summary,
          description: data.description,
          responsibilities: data.responsibilities,
          requirements: data.requirements,
          location: data.location,
          employmentType: data.employmentType,
          workplaceType: data.workplaceType,
          experienceLevel: data.experienceLevel,
        },
      });
      if (!readiness.isReady) {
        throw new JobMutationError(
          "INCOMPLETE",
          readiness.missingFields.map(({ label }) => label),
        );
      }
      if (
        input.applicationDeadline &&
        isPastCalendarDate(input.applicationDeadline)
      ) {
        throw new JobMutationError("INCOMPLETE", [
          "Application deadline cannot be in the past",
        ]);
      }
    }

    await transaction.job.update({ where: { id: job.id }, data });
  });
}

export async function transitionJob(
  prisma: PrismaClient,
  actor: RecruiterActor,
  jobId: string,
  action: JobLifecycleAction,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findFirst({
      where: ownedJobWhere(actor.userId, jobId),
      select: {
        id: true,
        status: true,
        title: true,
        summary: true,
        description: true,
        responsibilities: true,
        requirements: true,
        location: true,
        employmentType: true,
        workplaceType: true,
        experienceLevel: true,
        applicationDeadline: true,
        company: { select: { isPublished: true } },
        _count: { select: { skills: true } },
      },
    });

    if (!job) throw new JobMutationError("NOT_FOUND");
    if (!canTransitionJob(job.status, action)) {
      throw new JobMutationError("INVALID_TRANSITION");
    }

    if (action === "publish") {
      const readiness = getJobPublicationReadiness({
        companyIsPublished: job.company.isPublished,
        skillCount: job._count.skills,
        job: {
          title: job.title,
          summary: job.summary,
          description: job.description,
          responsibilities: job.responsibilities,
          requirements: job.requirements,
          location: job.location,
          employmentType: job.employmentType,
          workplaceType: job.workplaceType,
          experienceLevel: job.experienceLevel,
        },
      });
      if (!readiness.isReady) {
        throw new JobMutationError(
          "INCOMPLETE",
          readiness.missingFields.map(({ label }) => label),
        );
      }
      if (
        job.applicationDeadline &&
        isPastCalendarDate(job.applicationDeadline.toISOString().slice(0, 10))
      ) {
        throw new JobMutationError("INCOMPLETE", [
          "Application deadline cannot be in the past",
        ]);
      }
    }

    const nextStatus = nextJobStatus(action);
    const data: Prisma.JobUpdateInput = { status: nextStatus };
    if (action === "publish") data.publishedAt = new Date();
    if (action === "close") data.closedAt = new Date();

    await transaction.job.update({ where: { id: job.id }, data });
    return { status: nextStatus };
  });
}

export async function addJobSkill(
  prisma: PrismaClient,
  actor: RecruiterActor,
  jobId: string,
  name: string,
) {
  assertRecruiter(actor);
  const normalizedName = getSkillLookupName(name);

  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findFirst({
      where: ownedJobWhere(actor.userId, jobId),
      select: { id: true, status: true },
    });

    if (!job) throw new JobMutationError("NOT_FOUND");
    if (!canEditJob(job.status)) {
      throw new JobMutationError("INVALID_TRANSITION");
    }

    const skill = await transaction.skill.upsert({
      where: { normalizedName },
      create: { name, normalizedName },
      update: {},
      select: { id: true },
    });
    const assignment = await transaction.jobSkill.createMany({
      data: [{ jobId: job.id, skillId: skill.id }],
      skipDuplicates: true,
    });

    if (assignment.count !== 1) {
      throw new JobMutationError("DUPLICATE_SKILL");
    }
  });
}

export async function removeJobSkill(
  prisma: PrismaClient,
  actor: RecruiterActor,
  jobId: string,
  skillId: string,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const job = await transaction.job.findFirst({
      where: ownedJobWhere(actor.userId, jobId),
      select: { id: true, status: true },
    });

    if (!job) throw new JobMutationError("NOT_FOUND");
    if (!canEditJob(job.status)) {
      throw new JobMutationError("INVALID_TRANSITION");
    }

    // Keep the invariant that a published job always has a required skill.
    if (job.status === "PUBLISHED") {
      const remaining = await transaction.jobSkill.count({
        where: { jobId: job.id },
      });
      if (remaining <= 1) {
        throw new JobMutationError("INCOMPLETE", [
          "A published job needs at least one skill",
        ]);
      }
    }

    const result = await transaction.jobSkill.deleteMany({
      where: { jobId: job.id, skillId },
    });

    if (result.count !== 1) {
      throw new JobMutationError("NOT_FOUND");
    }
  });
}
