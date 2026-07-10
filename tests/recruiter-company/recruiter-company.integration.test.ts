import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-company-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let mutations: typeof import("@/features/recruiter-company/server/mutations");
let data: typeof import("@/features/recruiter-company/server/data");
let recruiterAId: string;
let recruiterBId: string;
let recruiterMemberId: string;
let candidateId: string;
const companyIds = new Set<string>();

function getTestDatabaseURL() {
  if (
    process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Database integration tests require explicit opt-in and TEST_DATABASE_URL.",
    );
  }
  if (
    [process.env.DATABASE_URL, process.env.DIRECT_URL].some(
      (url) => url && url === process.env.TEST_DATABASE_URL,
    )
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not match an application database URL.",
    );
  }
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }
  return process.env.TEST_DATABASE_URL;
}

function actor(userId: string, role: "RECRUITER" | "CANDIDATE") {
  return { userId, role } as const;
}

const completeCompany = {
  name: `${testPrefix} Northstar`,
  tagline: "Builds useful tools",
  description: "A complete integration-test company profile.",
  industry: "Technology",
  headquarters: "Baku",
  websiteUrl: "https://example.test/",
  companySize: "ELEVEN_TO_FIFTY" as const,
  foundedYear: 2020,
};

databaseDescribe(
  databaseIntegrationEnabled
    ? "Recruiter and Company database boundaries"
    : "Recruiter and Company database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [prismaModule, mutationModule, dataModule] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/recruiter-company/server/mutations"),
        import("@/features/recruiter-company/server/data"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      mutations = mutationModule;
      data = dataModule;

      const users = await Promise.all(
        ["recruiter-a", "recruiter-b", "recruiter-member", "candidate"].map(
          (label) =>
            prisma.user.create({
              data: {
                id: `${testPrefix}-${label}`,
                name: `Company Test ${label}`,
                email: `${testPrefix}-${label}@example.test`,
                role: label === "candidate" ? "CANDIDATE" : "RECRUITER",
              },
              select: { id: true },
            }),
        ),
      );
      [recruiterAId, recruiterBId, recruiterMemberId, candidateId] = users.map(
        ({ id }) => id,
      );
    }, 30_000);

    afterAll(async () => {
      if (prisma) {
        await prisma.company.deleteMany({
          where: { id: { in: [...companyIds] } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
        await prisma.$disconnect();
      }
    }, 30_000);

    it("allows a Recruiter to create a profile and blocks a Candidate", async () => {
      await mutations.upsertRecruiterProfile(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        {
          jobTitle: "Talent lead",
          bio: "Builds hiring systems.",
          linkedinUrl: "https://linkedin.com/in/test",
        },
      );
      await expect(
        prisma.recruiterProfile.findUnique({ where: { userId: recruiterAId } }),
      ).resolves.toMatchObject({ jobTitle: "Talent lead" });
      await expect(
        mutations.upsertRecruiterProfile(
          prisma,
          actor(candidateId, "CANDIDATE"),
          {
            jobTitle: "Blocked",
            bio: "",
            linkedinUrl: "",
          },
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("creates a Company and OWNER membership atomically", async () => {
      const company = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        completeCompany,
      );
      companyIds.add(company.id);
      expect(company.isPublished).toBe(false);
      await expect(
        prisma.companyMembership.findUnique({
          where: {
            userId_companyId: { userId: recruiterAId, companyId: company.id },
          },
        }),
      ).resolves.toMatchObject({ role: "OWNER" });
    });

    it("prevents duplicate CompanyMembership", async () => {
      const company = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterBId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Duplicate Membership` },
      );
      companyIds.add(company.id);
      await expect(
        prisma.companyMembership.create({
          data: { userId: recruiterBId, companyId: company.id, role: "MEMBER" },
        }),
      ).rejects.toMatchObject({ code: "P2002" });
    });

    it("denies private view and edit across Recruiters, and denies MEMBER edits", async () => {
      const company = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterBId, "RECRUITER"),
        { ...completeCompany, name: `${testPrefix} Private B` },
      );
      companyIds.add(company.id);
      expect(
        await data.getCompanyWorkspace(prisma, recruiterAId, company.id),
      ).toBeNull();
      await expect(
        mutations.updateRecruiterCompany(
          prisma,
          actor(recruiterAId, "RECRUITER"),
          company.id,
          {
            ...completeCompany,
            name: "Unauthorized A edit",
          },
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await prisma.companyMembership.create({
        data: {
          userId: recruiterMemberId,
          companyId: company.id,
          role: "MEMBER",
        },
      });
      await expect(
        mutations.updateRecruiterCompany(
          prisma,
          actor(recruiterMemberId, "RECRUITER"),
          company.id,
          {
            ...completeCompany,
            name: "Unauthorized member edit",
          },
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await mutations.updateRecruiterCompany(
        prisma,
        actor(recruiterBId, "RECRUITER"),
        company.id,
        {
          ...completeCompany,
          name: `${testPrefix} Owner Updated`,
        },
      );
      await expect(
        prisma.company.findUnique({ where: { id: company.id } }),
      ).resolves.toMatchObject({ name: `${testPrefix} Owner Updated` });
    });

    it("enforces completeness, publishing, public discovery, and immediate unpublishing", async () => {
      const incomplete = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        {
          ...completeCompany,
          name: `${testPrefix} Publication`,
          description: "",
        },
      );
      companyIds.add(incomplete.id);
      await expect(
        mutations.publishRecruiterCompany(
          prisma,
          actor(recruiterAId, "RECRUITER"),
          incomplete.id,
        ),
      ).rejects.toMatchObject({ code: "INCOMPLETE" });
      expect(
        await data.getPublishedCompanyBySlug(prisma, incomplete.slug),
      ).toBeNull();

      await mutations.updateRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        incomplete.id,
        completeCompany,
      );
      await mutations.publishRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        incomplete.id,
      );
      expect(
        await data.getPublishedCompanyBySlug(prisma, incomplete.slug),
      ).toMatchObject({ id: incomplete.id, isPublished: true });
      expect(
        await data.getPublishedCompanies(prisma, {
          q: completeCompany.name,
          industry: "Technology",
          headquarters: "Baku",
        }),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: incomplete.id }),
        ]),
      );

      await mutations.unpublishRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        incomplete.id,
      );
      expect(
        await data.getPublishedCompanyBySlug(prisma, incomplete.slug),
      ).toBeNull();
      expect(
        (
          await data.getPublishedCompanies(prisma, {
            q: completeCompany.name,
            industry: "",
            headquarters: "",
          })
        ).some(({ id }) => id === incomplete.id),
      ).toBe(false);
    });

    it("handles duplicate Company names with deterministic unique slugs", async () => {
      const name = `${testPrefix} Same Name`;
      const first = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterAId, "RECRUITER"),
        { ...completeCompany, name },
      );
      const second = await mutations.createRecruiterCompany(
        prisma,
        actor(recruiterBId, "RECRUITER"),
        { ...completeCompany, name },
      );
      companyIds.add(first.id);
      companyIds.add(second.id);
      expect(second.slug).toBe(`${first.slug}-2`);
    });
  },
);
