import "dotenv/config";

import { unlink } from "node:fs/promises";

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";

import {
  APPROVED_ROOTS,
  CleanupSafetyError,
  runExecute,
  runPreview,
} from "../../scripts/production-synthetic-data-cleanup";

vi.mock("server-only", () => ({}));

const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

const users = APPROVED_ROOTS.flatMap((root, rootIndex) =>
  (["CANDIDATE", "RECRUITER", "ADMIN"] as const).map((role) => ({
    id: `ops-cleanup-user-${rootIndex}-${role.toLowerCase()}`,
    name: root.displayName,
    email: `${root.userMarker}-${role.toLowerCase()}@example.test`,
    role,
  })),
);
const companies = APPROVED_ROOTS.map((root, index) => ({
  id: `ops-cleanup-company-${index}`,
  name: root.displayName,
  slug: root.companySlug,
}));
const planFiles = new Set<string>();

let prisma: PrismaClient;
let testDatabaseURL: string;

function getTestDatabaseURL(): string {
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
      (value) => value && value === process.env.TEST_DATABASE_URL,
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

async function resetFixture(): Promise<void> {
  await prisma.company.deleteMany({
    where: { id: { in: companies.map((company) => company.id) } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: users.map((user) => user.id) } },
  });
}

async function seedFixture(): Promise<void> {
  await resetFixture();
  await prisma.user.createMany({
    data: users.map((user) => ({
      ...user,
      accountStatus: "ACTIVE",
    })),
  });
  await prisma.account.createMany({
    data: users.map((user, index) => ({
      id: `ops-cleanup-account-${index}`,
      accountId: user.email,
      providerId: "credential",
      userId: user.id,
      password: "integration-only-password-hash-placeholder",
    })),
  });
  await prisma.session.createMany({
    data: users.slice(0, 5).map((user, index) => ({
      id: `ops-cleanup-session-${index}`,
      userId: user.id,
      token: `ops-cleanup-secret-session-token-${index}`,
      expiresAt: new Date("2026-07-30T00:00:00.000Z"),
    })),
  });
  await prisma.candidateProfile.create({
    data: {
      id: "ops-cleanup-candidate-profile",
      userId: users.find((user) => user.role === "CANDIDATE")!.id,
    },
  });
  await prisma.recruiterProfile.create({
    data: {
      id: "ops-cleanup-recruiter-profile",
      userId: users.find(
        (user) =>
          user.role === "RECRUITER" &&
          user.name === APPROVED_ROOTS[1].displayName,
      )!.id,
    },
  });
  await prisma.company.createMany({ data: companies });
  await prisma.companyMembership.createMany({
    data: companies.map((company, index) => ({
      id: `ops-cleanup-membership-${index}`,
      companyId: company.id,
      userId: users.find(
        (user) =>
          user.role === "RECRUITER" &&
          user.name === APPROVED_ROOTS[index]!.displayName,
      )!.id,
      role: "OWNER",
    })),
  });
  await prisma.job.createMany({
    data: companies.map((company, index) => ({
      id: `ops-cleanup-job-${index}`,
      companyId: company.id,
      title: `Approved synthetic job ${index}`,
      slug: APPROVED_ROOTS[index]!.jobSlug,
      status: "PUBLISHED",
    })),
  });
}

async function fixtureCounts() {
  const [userCount, companyCount, sessionCount] = await Promise.all([
    prisma.user.count({ where: { id: { in: users.map((user) => user.id) } } }),
    prisma.company.count({
      where: { id: { in: companies.map((company) => company.id) } },
    }),
    prisma.session.count({
      where: {
        id: {
          in: users
            .slice(0, 5)
            .map((_, index) => `ops-cleanup-session-${index}`),
        },
      },
    }),
  ]);
  return { userCount, companyCount, sessionCount };
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "production synthetic cleanup isolated database behavior"
    : "production synthetic cleanup isolated database behavior (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      testDatabaseURL = getTestDatabaseURL();
      const prismaModule = await import("@/lib/prisma");
      prisma =
        prismaModule.createPrismaClientForConnectionString(testDatabaseURL);
    });

    afterEach(async () => {
      await resetFixture();
      await Promise.all(
        [...planFiles].map((planFile) =>
          unlink(planFile).catch(() => undefined),
        ),
      );
      planFiles.clear();
    });

    afterAll(async () => {
      await prisma?.$disconnect();
    });

    it("deletes the exact graph in dependency-safe order and leaves preview idempotent", async () => {
      await seedFixture();
      const preview = await runPreview(testDatabaseURL);
      planFiles.add(preview.planFile);
      expect(preview.plan.status).toBe("ready");
      expect(preview.plan.approvedUserMarkers).toEqual(
        APPROVED_ROOTS.map((root) => root.userMarker),
      );
      expect(preview.plan.approvedCompanySlugs).toEqual(
        APPROVED_ROOTS.map((root) => root.companySlug),
      );
      expect(preview.plan.approvedJobSlugs).toEqual(
        APPROVED_ROOTS.map((root) => root.jobSlug),
      );
      expect(preview.plan.records.Company.map((record) => record.slug)).toEqual(
        APPROVED_ROOTS.map((root) => root.companySlug),
      );
      expect(preview.plan.records.Job.map((record) => record.slug)).toEqual(
        APPROVED_ROOTS.map((root) => root.jobSlug),
      );

      await runExecute({
        connectionString: testDatabaseURL,
        planFile: preview.planFile,
        confirmDigest: preview.digest,
        authorization: "true",
        confirmation: "DELETE_APPROVED_SYNTHETIC_PRODUCTION_DATA",
      });
      await expect(fixtureCounts()).resolves.toEqual({
        userCount: 0,
        companyCount: 0,
        sessionCount: 0,
      });

      const postCleanupPreview = await runPreview(testDatabaseURL);
      planFiles.add(postCleanupPreview.planFile);
      expect(postCleanupPreview.plan.status).toBe("no_matches");
      expect(postCleanupPreview.plan.counts.User).toBe(0);
    }, 120_000);

    it("rejects old marker-only Company slugs during discovery", async () => {
      await seedFixture();
      await prisma.company.update({
        where: { id: companies[0]!.id },
        data: { slug: APPROVED_ROOTS[0].userMarker },
      });

      await expect(runPreview(testDatabaseURL)).rejects.toThrow(
        "Company count changed: expected 2, found 1",
      );
    }, 120_000);

    it("audits and rejects an unexpected additional Job", async () => {
      await seedFixture();
      await prisma.job.create({
        data: {
          id: "ops-cleanup-unexpected-job",
          companyId: companies[0]!.id,
          title: "Unexpected synthetic job",
          slug: "ops-cleanup-unexpected-job",
          status: "PUBLISHED",
        },
      });

      await expect(runPreview(testDatabaseURL)).rejects.toThrow(
        "Job count changed: expected 2, found 3",
      );
    }, 120_000);

    it("rejects an approved Company Job with the wrong slug", async () => {
      await seedFixture();
      await prisma.job.update({
        where: { id: "ops-cleanup-job-0" },
        data: { slug: "ops-cleanup-wrong-job-slug" },
      });

      await expect(runPreview(testDatabaseURL)).rejects.toThrow(
        `exact approved Job slug ${APPROVED_ROOTS[0].jobSlug}`,
      );
    }, 120_000);

    it("rolls back every deletion when a final assertion fails", async () => {
      await seedFixture();
      const preview = await runPreview(testDatabaseURL);
      planFiles.add(preview.planFile);

      await expect(
        runExecute({
          connectionString: testDatabaseURL,
          planFile: preview.planFile,
          confirmDigest: preview.digest,
          authorization: "true",
          confirmation: "DELETE_APPROVED_SYNTHETIC_PRODUCTION_DATA",
          beforeCommit: () => {
            throw new CleanupSafetyError("forced pre-commit assertion failure");
          },
        }),
      ).rejects.toThrow("forced pre-commit assertion failure");
      await expect(fixtureCounts()).resolves.toEqual({
        userCount: 6,
        companyCount: 2,
        sessionCount: 5,
      });
    }, 120_000);
  },
);
