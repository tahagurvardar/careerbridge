import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  getSkillLookupName,
  type ValidatedJobContent,
} from "@/features/jobs/schemas";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-job-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let jobs: typeof import("@/features/jobs/server/mutations");
let jobData: typeof import("@/features/jobs/server/data");
let companies: typeof import("@/features/recruiter-company/server/mutations");

let recruiterAId: string;
let recruiterBId: string;
let memberId: string;
let candidateId: string;
let publishedCompanyId: string;
let unpublishedCompanyId: string;
let companyBId: string;

const createdJobIds = new Set<string>();
const createdCompanyIds = new Set<string>();
const createdSkillNames = new Set<string>();

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

function actor(userId: string, role: "RECRUITER" | "CANDIDATE" = "RECRUITER") {
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

const completeContent = {
  title: `${testPrefix} Frontend Engineer`,
  summary: "Build product UI.",
  description: "A complete description of the role.",
  responsibilities: "Ship features.",
  requirements: "React experience.",
  location: "Baku",
  employmentType: "FULL_TIME" as const,
  workplaceType: "HYBRID" as const,
  experienceLevel: "MID" as const,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "",
  applicationDeadline: "",
};

const emptyContent = {
  title: `${testPrefix} Draft Only`,
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  location: "",
  employmentType: "" as const,
  workplaceType: "" as const,
  experienceLevel: "" as const,
  salaryMin: null,
  salaryMax: null,
  salaryCurrency: "",
  applicationDeadline: "",
};

const emptySearch = {
  q: "",
  location: "",
  employmentType: "" as const,
  workplaceType: "" as const,
  experienceLevel: "" as const,
};

databaseDescribe(
  databaseIntegrationEnabled
    ? "Job lifecycle and discovery database boundaries"
    : "Job lifecycle and discovery database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    async function createDraft(
      companyId: string,
      content: ValidatedJobContent = completeContent,
      as = recruiterAId,
    ) {
      const job = await jobs.createJob(prisma, actor(as), {
        companyId,
        ...content,
      });
      createdJobIds.add(job.id);
      return job;
    }

    async function addSkill(jobId: string, name: string, as = recruiterAId) {
      createdSkillNames.add(name);
      await jobs.addJobSkill(prisma, actor(as), jobId, name);
    }

    beforeAll(async () => {
      const [prismaModule, jobMutations, jobDataModule, companyMutations] =
        await Promise.all([
          import("@/lib/prisma"),
          import("@/features/jobs/server/mutations"),
          import("@/features/jobs/server/data"),
          import("@/features/recruiter-company/server/mutations"),
        ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      jobs = jobMutations;
      jobData = jobDataModule;
      companies = companyMutations;

      const users = await Promise.all(
        ["recruiter-a", "recruiter-b", "recruiter-member", "candidate"].map(
          (label) =>
            prisma.user.create({
              data: {
                id: `${testPrefix}-${label}`,
                name: `Job Test ${label}`,
                email: `${testPrefix}-${label}@example.test`,
                role: label === "candidate" ? "CANDIDATE" : "RECRUITER",
              },
              select: { id: true },
            }),
        ),
      );
      [recruiterAId, recruiterBId, memberId, candidateId] = users.map(
        ({ id }) => id,
      );

      const published = await companies.createRecruiterCompany(
        prisma,
        actor(recruiterAId),
        { ...completeCompany, name: `${testPrefix} Published Co` },
      );
      const unpublished = await companies.createRecruiterCompany(
        prisma,
        actor(recruiterAId),
        { ...completeCompany, name: `${testPrefix} Unpublished Co` },
      );
      const companyB = await companies.createRecruiterCompany(
        prisma,
        actor(recruiterBId),
        { ...completeCompany, name: `${testPrefix} Company B` },
      );
      publishedCompanyId = published.id;
      unpublishedCompanyId = unpublished.id;
      companyBId = companyB.id;
      [published.id, unpublished.id, companyB.id].forEach((id) =>
        createdCompanyIds.add(id),
      );

      await companies.publishRecruiterCompany(
        prisma,
        actor(recruiterAId),
        publishedCompanyId,
      );
      await companies.publishRecruiterCompany(
        prisma,
        actor(recruiterBId),
        companyBId,
      );
      await prisma.companyMembership.create({
        data: {
          userId: memberId,
          companyId: publishedCompanyId,
          role: "MEMBER",
        },
      });
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      // Match by prefix as well as tracked IDs so a partial setup failure still
      // cleans up every company (and its cascaded jobs and skills) it created.
      await prisma.company.deleteMany({
        where: {
          OR: [
            { id: { in: [...createdCompanyIds] } },
            { name: { startsWith: testPrefix } },
          ],
        },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: testPrefix } },
      });
      // Remove only skill catalog rows this suite created that are now orphaned.
      await prisma.skill.deleteMany({
        where: {
          normalizedName: {
            in: [...createdSkillNames].map(getSkillLookupName),
          },
          candidates: { none: {} },
          jobs: { none: {} },
        },
      });
      await prisma.$disconnect();
    }, 60_000);

    it("lets an OWNER create a draft job and blocks members, non-owners, and candidates", async () => {
      const job = await createDraft(publishedCompanyId);
      const stored = await prisma.job.findUnique({ where: { id: job.id } });
      expect(stored).toMatchObject({
        status: "DRAFT",
        companyId: publishedCompanyId,
        publishedAt: null,
      });

      await expect(
        jobs.createJob(prisma, actor(memberId), {
          companyId: publishedCompanyId,
          ...completeContent,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        jobs.createJob(prisma, actor(recruiterAId), {
          companyId: companyBId,
          ...completeContent,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      await expect(
        jobs.createJob(prisma, actor(candidateId, "CANDIDATE"), {
          companyId: publishedCompanyId,
          ...completeContent,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("lets an OWNER edit their job while denying other recruiters view and edit", async () => {
      const job = await createDraft(publishedCompanyId);

      await jobs.updateJob(prisma, actor(recruiterAId), job.id, {
        ...completeContent,
        title: `${testPrefix} Updated Title`,
      });
      await expect(
        prisma.job.findUnique({ where: { id: job.id } }),
      ).resolves.toMatchObject({ title: `${testPrefix} Updated Title` });

      expect(
        await jobData.getRecruiterJob(prisma, recruiterBId, job.id),
      ).toBeNull();
      await expect(
        jobs.updateJob(prisma, actor(recruiterBId), job.id, completeContent),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("lets an OWNER assign skills and prevents duplicates", async () => {
      const job = await createDraft(publishedCompanyId);
      await addSkill(job.id, "React");
      await expect(
        jobs.addJobSkill(prisma, actor(recruiterAId), job.id, "react"),
      ).rejects.toMatchObject({ code: "DUPLICATE_SKILL" });

      const count = await prisma.jobSkill.count({ where: { jobId: job.id } });
      expect(count).toBe(1);
    });

    it("blocks publishing an incomplete job or a job under an unpublished company", async () => {
      const incomplete = await createDraft(publishedCompanyId, emptyContent);
      await expect(
        jobs.transitionJob(
          prisma,
          actor(recruiterAId),
          incomplete.id,
          "publish",
        ),
      ).rejects.toMatchObject({ code: "INCOMPLETE" });
      expect(
        await jobData.getPublishedJobBySlug(prisma, incomplete.slug),
      ).toBeNull();

      const underUnpublished = await createDraft(unpublishedCompanyId);
      await addSkill(underUnpublished.id, "React");
      await expect(
        jobs.transitionJob(
          prisma,
          actor(recruiterAId),
          underUnpublished.id,
          "publish",
        ),
      ).rejects.toMatchObject({ code: "INCOMPLETE" });
    });

    it("publishes a complete job under a published company and exposes it publicly", async () => {
      const job = await createDraft(publishedCompanyId, {
        ...completeContent,
        title: `${testPrefix} Publishable Engineer`,
      });
      await addSkill(job.id, "TypeScript");

      const result = await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        job.id,
        "publish",
      );
      expect(result.status).toBe("PUBLISHED");

      const stored = await prisma.job.findUnique({ where: { id: job.id } });
      expect(stored?.status).toBe("PUBLISHED");
      expect(stored?.publishedAt).not.toBeNull();

      expect(
        await jobData.getPublishedJobBySlug(prisma, job.slug),
      ).toMatchObject({
        slug: job.slug,
        title: `${testPrefix} Publishable Engineer`,
      });

      const directory = await jobData.getPublishedJobs(prisma, {
        ...emptySearch,
        q: testPrefix,
      });
      expect(directory.some((entry) => entry.slug === job.slug)).toBe(true);
    });

    it("keeps drafts, closed, and archived jobs out of public discovery", async () => {
      const draft = await createDraft(publishedCompanyId);
      await addSkill(draft.id, "React");
      expect(
        await jobData.getPublishedJobBySlug(prisma, draft.slug),
      ).toBeNull();

      const toClose = await createDraft(publishedCompanyId, {
        ...completeContent,
        title: `${testPrefix} Closing Role`,
      });
      await addSkill(toClose.id, "React");
      await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        toClose.id,
        "publish",
      );
      expect(
        await jobData.getPublishedJobBySlug(prisma, toClose.slug),
      ).not.toBeNull();
      const closed = await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        toClose.id,
        "close",
      );
      expect(closed.status).toBe("CLOSED");
      expect(
        await jobData.getPublishedJobBySlug(prisma, toClose.slug),
      ).toBeNull();
      const closedRow = await prisma.job.findUnique({
        where: { id: toClose.id },
      });
      expect(closedRow?.closedAt).not.toBeNull();

      const toArchive = await createDraft(publishedCompanyId, {
        ...completeContent,
        title: `${testPrefix} Archiving Role`,
      });
      await addSkill(toArchive.id, "React");
      await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        toArchive.id,
        "publish",
      );
      await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        toArchive.id,
        "archive",
      );
      expect(
        await jobData.getPublishedJobBySlug(prisma, toArchive.slug),
      ).toBeNull();
    });

    it("rejects invalid lifecycle transitions and edits to archived jobs", async () => {
      const draft = await createDraft(publishedCompanyId);
      await expect(
        jobs.transitionJob(prisma, actor(recruiterAId), draft.id, "close"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      await addSkill(draft.id, "React");
      await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        draft.id,
        "publish",
      );
      await expect(
        jobs.transitionJob(prisma, actor(recruiterAId), draft.id, "publish"),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      await jobs.transitionJob(
        prisma,
        actor(recruiterAId),
        draft.id,
        "archive",
      );
      await expect(
        jobs.updateJob(prisma, actor(recruiterAId), draft.id, completeContent),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    });

    it("returns only matching published jobs and never exposes membership data", async () => {
      const job = await createDraft(publishedCompanyId, {
        ...completeContent,
        title: `${testPrefix} Rust Engineer`,
      });
      await addSkill(job.id, "Rust");
      await jobs.transitionJob(prisma, actor(recruiterAId), job.id, "publish");

      const matching = await jobData.getPublishedJobs(prisma, {
        ...emptySearch,
        q: `${testPrefix} Rust`,
      });
      expect(matching.every((entry) => entry.title.includes("Rust"))).toBe(
        true,
      );
      expect(matching.some((entry) => entry.slug === job.slug)).toBe(true);

      const nonMatching = await jobData.getPublishedJobs(prisma, {
        ...emptySearch,
        q: `${testPrefix}-no-such-term`,
      });
      expect(nonMatching).toHaveLength(0);

      const detail = await jobData.getPublishedJobBySlug(prisma, job.slug);
      expect(detail).not.toBeNull();
      const keys = Object.keys(detail ?? {});
      expect(keys).not.toContain("id");
      expect(keys).not.toContain("companyId");
      expect(keys).not.toContain("status");
      expect(Object.keys(detail?.company ?? {})).toEqual(["name", "slug"]);
    });

    it("allocates unique slugs for jobs that share a title", async () => {
      const title = `${testPrefix} Duplicate Title Role`;
      const first = await createDraft(publishedCompanyId, {
        ...completeContent,
        title,
      });
      const second = await createDraft(publishedCompanyId, {
        ...completeContent,
        title,
      });
      expect(second.slug).toBe(`${first.slug}-2`);
    });
  },
);
