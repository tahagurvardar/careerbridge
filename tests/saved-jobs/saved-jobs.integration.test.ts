import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-saved-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let savedJobs: typeof import("@/features/saved-jobs/server/mutations");
let savedJobData: typeof import("@/features/saved-jobs/server/data");
let jobData: typeof import("@/features/jobs/server/data");

let candidateAId: string;
let candidateBId: string;
let recruiterId: string;
let adminId: string;
let publishedCompanyId: string;
let unpublishedCompanyId: string;

const jobs = new Map<string, { id: string; slug: string }>();
let jobSequence = 0;

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

function actor(userId: string, role: PlatformRole) {
  return { userId, role } as const;
}

async function createJob(
  label: string,
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED",
  companyId = publishedCompanyId,
) {
  jobSequence += 1;
  const job = await prisma.job.create({
    data: {
      companyId,
      title: `${testPrefix} ${label}`,
      slug: `${testPrefix}-${label.toLowerCase().replaceAll(" ", "-")}-${jobSequence}`,
      location: "Baku",
      employmentType: "FULL_TIME",
      workplaceType: "HYBRID",
      experienceLevel: "MID",
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      closedAt: status === "CLOSED" ? new Date() : null,
    },
    select: { id: true, slug: true },
  });
  jobs.set(label, job);
  return job;
}

function saveAs(userId: string, role: PlatformRole, slug: string) {
  return savedJobs.saveJob(prisma, actor(userId, role), slug);
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Saved jobs database boundaries"
    : "Saved jobs database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [prismaModule, mutationsModule, dataModule, jobDataModule] =
        await Promise.all([
          import("@/lib/prisma"),
          import("@/features/saved-jobs/server/mutations"),
          import("@/features/saved-jobs/server/data"),
          import("@/features/jobs/server/data"),
        ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      savedJobs = mutationsModule;
      savedJobData = dataModule;
      jobData = jobDataModule;

      const users = await Promise.all(
        (
          [
            ["candidate-a", "CANDIDATE"],
            ["candidate-b", "CANDIDATE"],
            ["recruiter", "RECRUITER"],
            ["admin", "ADMIN"],
          ] as const
        ).map(([label, role]) =>
          prisma.user.create({
            data: {
              id: `${testPrefix}-${label}`,
              name: `Saved Test ${label}`,
              email: `${testPrefix}-${label}@example.test`,
              role,
            },
            select: { id: true },
          }),
        ),
      );
      [candidateAId, candidateBId, recruiterId, adminId] = users.map(
        ({ id }) => id,
      );

      const [publishedCompany, unpublishedCompany] = await Promise.all([
        prisma.company.create({
          data: {
            name: `${testPrefix} Published Company`,
            slug: `${testPrefix}-published-company`,
            isPublished: true,
          },
          select: { id: true },
        }),
        prisma.company.create({
          data: {
            name: `${testPrefix} Unpublished Company`,
            slug: `${testPrefix}-unpublished-company`,
            isPublished: false,
          },
          select: { id: true },
        }),
      ]);
      publishedCompanyId = publishedCompany.id;
      unpublishedCompanyId = unpublishedCompany.id;
      await prisma.companyMembership.create({
        data: {
          userId: recruiterId,
          companyId: publishedCompanyId,
          role: "OWNER",
        },
      });

      await createJob("Published", "PUBLISHED");
      await createJob("Draft", "DRAFT");
      await createJob("Closed", "CLOSED");
      await createJob("Archived", "ARCHIVED");
      await createJob("Unpublished Company", "PUBLISHED", unpublishedCompanyId);
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.company.deleteMany({
        where: { name: { startsWith: testPrefix } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: testPrefix } },
      });
      await prisma.$disconnect();
    }, 60_000);

    it("allows a Candidate to save an eligible job", async () => {
      await expect(
        saveAs(candidateAId, "CANDIDATE", jobs.get("Published")!.slug),
      ).resolves.toEqual({ saved: true });

      const open = await savedJobData.getCandidateSavedJobs(
        prisma,
        candidateAId,
        { q: "", availability: "OPEN" },
      );
      expect(
        open.some(({ job }) => job.slug === jobs.get("Published")!.slug),
      ).toBe(true);
    });

    it.each(["Draft", "Closed", "Archived"])(
      "rejects saving a %s job",
      async (label) => {
        await expect(
          saveAs(candidateAId, "CANDIDATE", jobs.get(label)!.slug),
        ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
      },
    );

    it("rejects a job under an unpublished company", async () => {
      await expect(
        saveAs(
          candidateAId,
          "CANDIDATE",
          jobs.get("Unpublished Company")!.slug,
        ),
      ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    });

    it.each([
      ["recruiter", () => recruiterId, "RECRUITER"],
      ["admin", () => adminId, "ADMIN"],
    ] as const)("rejects a %s save", async (_label, userId, role) => {
      await expect(
        saveAs(userId(), role, jobs.get("Published")!.slug),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("treats duplicate and concurrent duplicate saves idempotently", async () => {
      const job = await createJob("Concurrent", "PUBLISHED");
      await Promise.all([
        saveAs(candidateAId, "CANDIDATE", job.slug),
        saveAs(candidateAId, "CANDIDATE", job.slug),
        saveAs(candidateAId, "CANDIDATE", job.slug),
      ]);
      expect(
        await prisma.savedJob.count({
          where: { candidateId: candidateAId, jobId: job.id },
        }),
      ).toBe(1);
      await expect(
        saveAs(candidateAId, "CANDIDATE", job.slug),
      ).resolves.toEqual({ saved: true });
    });

    it("allows only the Candidate's own relation to be removed and is idempotent", async () => {
      const job = await createJob("Ownership", "PUBLISHED");
      await saveAs(candidateAId, "CANDIDATE", job.slug);

      await savedJobs.unsaveJob(
        prisma,
        actor(candidateBId, "CANDIDATE"),
        job.slug,
      );
      expect(
        await prisma.savedJob.count({
          where: { candidateId: candidateAId, jobId: job.id },
        }),
      ).toBe(1);

      await savedJobs.unsaveJob(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        job.slug,
      );
      await expect(
        savedJobs.unsaveJob(prisma, actor(candidateAId, "CANDIDATE"), job.slug),
      ).resolves.toEqual({ saved: false });
    });

    it("returns only the authenticated Candidate's saved jobs", async () => {
      const aJob = await createJob("Candidate A", "PUBLISHED");
      const bJob = await createJob("Candidate B", "PUBLISHED");
      await saveAs(candidateAId, "CANDIDATE", aJob.slug);
      await saveAs(candidateBId, "CANDIDATE", bJob.slug);

      const rows = await savedJobData.getCandidateSavedJobs(
        prisma,
        candidateAId,
        { q: "", availability: "ALL" },
      );
      expect(rows.some(({ job }) => job.slug === aJob.slug)).toBe(true);
      expect(rows.some(({ job }) => job.slug === bJob.slug)).toBe(false);
    });

    it.each([
      ["CLOSED", "closed"],
      ["ARCHIVED", "archived"],
    ] as const)(
      "retains a saved job after it becomes %s and classifies it unavailable",
      async (status, label) => {
        const job = await createJob(`Retained ${label}`, "PUBLISHED");
        await saveAs(candidateAId, "CANDIDATE", job.slug);
        await prisma.job.update({ where: { id: job.id }, data: { status } });

        const unavailable = await savedJobData.getCandidateSavedJobs(
          prisma,
          candidateAId,
          { q: `${testPrefix} Retained ${label}`, availability: "UNAVAILABLE" },
        );
        expect(unavailable.some(({ job: row }) => row.slug === job.slug)).toBe(
          true,
        );
      },
    );

    it("retains a saved job privately after its company becomes unpublished", async () => {
      const company = await prisma.company.create({
        data: {
          name: `${testPrefix} Retained Company`,
          slug: `${testPrefix}-retained-company`,
          isPublished: true,
        },
        select: { id: true },
      });
      const job = await createJob(
        "Retained Company Job",
        "PUBLISHED",
        company.id,
      );
      await saveAs(candidateAId, "CANDIDATE", job.slug);
      await prisma.company.update({
        where: { id: company.id },
        data: { isPublished: false },
      });

      const unavailable = await savedJobData.getCandidateSavedJobs(
        prisma,
        candidateAId,
        { q: "", availability: "UNAVAILABLE" },
      );
      expect(unavailable.some(({ job: row }) => row.slug === job.slug)).toBe(
        true,
      );
      expect(await jobData.getPublishedJobBySlug(prisma, job.slug)).toBeNull();
    });

    it("does not expose saved relations through public or recruiter job queries", async () => {
      const slug = jobs.get("Published")!.slug;
      const publicJob = await jobData.getPublishedJobBySlug(prisma, slug);
      expect(Object.keys(publicJob ?? {})).not.toContain("savedBy");

      const recruiterJob = await jobData.getRecruiterJob(
        prisma,
        recruiterId,
        jobs.get("Published")!.id,
      );
      expect(Object.keys(recruiterJob ?? {})).not.toContain("savedBy");
    });
  },
);
