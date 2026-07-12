import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-notes-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let notes: typeof import("@/features/application-notes/server/mutations");
let noteData: typeof import("@/features/application-notes/server/data");
let applicationData: typeof import("@/features/applications/server/data");
let jobData: typeof import("@/features/jobs/server/data");

let ownerId: string;
let coOwnerId: string;
let memberId: string;
let otherOwnerId: string;
let candidateId: string;
let adminId: string;
let companyId: string;
let otherCompanyId: string;
let jobId: string;
let applicationId: string;

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

async function createUser(label: string, role: PlatformRole) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-${label}`,
      name: `Notes Test ${label}`,
      email: `${testPrefix}-${label}@example.test`,
      role,
    },
    select: { id: true },
  });
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Recruiter application note database boundaries"
    : "Recruiter application note database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        mutationModule,
        dataModule,
        appDataModule,
        jobDataModule,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/application-notes/server/mutations"),
        import("@/features/application-notes/server/data"),
        import("@/features/applications/server/data"),
        import("@/features/jobs/server/data"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      notes = mutationModule;
      noteData = dataModule;
      applicationData = appDataModule;
      jobData = jobDataModule;

      const users = await Promise.all([
        createUser("owner", "RECRUITER"),
        createUser("co-owner", "RECRUITER"),
        createUser("member", "RECRUITER"),
        createUser("other-owner", "RECRUITER"),
        createUser("candidate", "CANDIDATE"),
        createUser("admin", "ADMIN"),
      ]);
      [ownerId, coOwnerId, memberId, otherOwnerId, candidateId, adminId] =
        users.map(({ id }) => id);

      const company = await prisma.company.create({
        data: {
          name: `${testPrefix} Company`,
          slug: `${testPrefix}-company`,
          isPublished: true,
          memberships: {
            create: [
              { userId: ownerId, role: "OWNER" },
              { userId: coOwnerId, role: "OWNER" },
              { userId: memberId, role: "MEMBER" },
              // Even a forged OWNER membership must not give an Admin note reads.
              { userId: adminId, role: "OWNER" },
            ],
          },
        },
        select: { id: true },
      });
      companyId = company.id;

      const otherCompany = await prisma.company.create({
        data: {
          name: `${testPrefix} Other Company`,
          slug: `${testPrefix}-other-company`,
          memberships: { create: { userId: otherOwnerId, role: "OWNER" } },
        },
        select: { id: true },
      });
      otherCompanyId = otherCompany.id;

      const job = await prisma.job.create({
        data: {
          companyId,
          title: `${testPrefix} Engineer`,
          slug: `${testPrefix}-engineer`,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        select: { id: true },
      });
      jobId = job.id;

      const application = await prisma.jobApplication.create({
        data: { jobId, candidateId, status: "SUBMITTED" },
        select: { id: true },
      });
      applicationId = application.id;
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.company.deleteMany({
        where: { id: { in: [companyId, otherCompanyId].filter(Boolean) } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: testPrefix } },
      });
      await prisma.$disconnect();
    }, 60_000);

    it("creates a note and its first immutable revision atomically", async () => {
      const created = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Initial private assessment",
      );
      expect(created.revision).toBe(1);

      const stored = await prisma.applicationNote.findUnique({
        where: { id: created.id },
        include: { revisions: true },
      });
      expect(stored).toMatchObject({
        applicationId,
        authorUserId: ownerId,
        body: "Initial private assessment",
        revision: 1,
        deletedAt: null,
      });
      expect(stored?.revisions).toEqual([
        expect.objectContaining({
          version: 1,
          action: "CREATED",
          body: "Initial private assessment",
          actorUserId: ownerId,
        }),
      ]);
    });

    it("allows only Recruiter Company OWNERs to read notes and history", async () => {
      const created = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Owner-scoped note",
      );

      expect(
        await noteData.getApplicationNotes(prisma, ownerId, applicationId),
      ).not.toBeNull();
      expect(
        await noteData.getApplicationNotes(prisma, coOwnerId, applicationId),
      ).not.toBeNull();
      expect(
        await noteData.getApplicationNotes(prisma, memberId, applicationId),
      ).toBeNull();
      expect(
        await noteData.getApplicationNotes(prisma, otherOwnerId, applicationId),
      ).toBeNull();
      expect(
        await noteData.getApplicationNotes(prisma, candidateId, applicationId),
      ).toBeNull();
      expect(
        await noteData.getApplicationNotes(prisma, adminId, applicationId),
      ).toBeNull();

      expect(
        await noteData.getApplicationNoteHistory(
          prisma,
          coOwnerId,
          applicationId,
          created.id,
        ),
      ).not.toBeNull();
      expect(
        await noteData.getApplicationNoteHistory(
          prisma,
          memberId,
          applicationId,
          created.id,
        ),
      ).toBeNull();
    });

    it("blocks non-Recruiters, MEMBERs, cross-company owners, and co-owners from author mutations", async () => {
      await expect(
        notes.createApplicationNote(
          prisma,
          actor(candidateId, "CANDIDATE"),
          applicationId,
          "Blocked candidate note",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        notes.createApplicationNote(
          prisma,
          actor(adminId, "ADMIN"),
          applicationId,
          "Blocked admin note",
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        notes.createApplicationNote(
          prisma,
          actor(memberId, "RECRUITER"),
          applicationId,
          "Blocked member note",
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        notes.createApplicationNote(
          prisma,
          actor(otherOwnerId, "RECRUITER"),
          applicationId,
          "Blocked other-company note",
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });

      const created = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Only the author can change this",
      );
      await expect(
        notes.editApplicationNote(
          prisma,
          actor(coOwnerId, "RECRUITER"),
          applicationId,
          created.id,
          1,
          "Co-owner edit",
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        notes.deleteApplicationNote(
          prisma,
          actor(coOwnerId, "RECRUITER"),
          applicationId,
          created.id,
          1,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("uses expectedRevision for safe conflicts and preserves every snapshot", async () => {
      const created = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Version one",
      );
      await notes.editApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        created.id,
        1,
        "Version two",
      );

      await expect(
        notes.editApplicationNote(
          prisma,
          actor(ownerId, "RECRUITER"),
          applicationId,
          created.id,
          1,
          "Stale overwrite",
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      const concurrent = await Promise.allSettled([
        notes.editApplicationNote(
          prisma,
          actor(ownerId, "RECRUITER"),
          applicationId,
          created.id,
          2,
          "Concurrent winner A",
        ),
        notes.editApplicationNote(
          prisma,
          actor(ownerId, "RECRUITER"),
          applicationId,
          created.id,
          2,
          "Concurrent winner B",
        ),
      ]);
      expect(
        concurrent.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        concurrent.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);

      const stored = await prisma.applicationNote.findUnique({
        where: { id: created.id },
        include: { revisions: { orderBy: { version: "asc" } } },
      });
      expect(stored?.revision).toBe(3);
      expect(stored?.revisions.map(({ version }) => version)).toEqual([
        1, 2, 3,
      ]);
      expect(stored?.revisions.map(({ body }) => body)).toEqual([
        "Version one",
        "Version two",
        stored?.body,
      ]);
    });

    it("soft-deletes only at the expected revision and keeps the audit body", async () => {
      const created = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Final body before deletion",
      );
      await expect(
        notes.deleteApplicationNote(
          prisma,
          actor(ownerId, "RECRUITER"),
          applicationId,
          created.id,
          2,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });

      await notes.deleteApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        created.id,
        1,
      );
      const stored = await prisma.applicationNote.findUnique({
        where: { id: created.id },
        include: { revisions: { orderBy: { version: "asc" } } },
      });
      expect(stored?.deletedAt).not.toBeNull();
      expect(stored?.revision).toBe(2);
      expect(stored?.revisions.at(-1)).toMatchObject({
        version: 2,
        action: "DELETED",
        body: "Final body before deletion",
      });

      const visible = await noteData.getApplicationNotes(
        prisma,
        ownerId,
        applicationId,
      );
      expect(visible?.active.some(({ id }) => id === created.id)).toBe(false);
      expect(visible?.deleted.some(({ id }) => id === created.id)).toBe(true);
      expect(
        visible?.deleted.find(({ id }) => id === created.id),
      ).not.toHaveProperty("body");
    });

    it("returns active counts without note bodies in recruiter lists", async () => {
      await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Counted but never projected",
      );
      const deleted = await notes.createApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        "Deleted and not counted",
      );
      await notes.deleteApplicationNote(
        prisma,
        actor(ownerId, "RECRUITER"),
        applicationId,
        deleted.id,
        1,
      );

      const expectedActiveCount = await prisma.applicationNote.count({
        where: { applicationId, deletedAt: null },
      });
      const list = await applicationData.getRecruiterApplications(
        prisma,
        ownerId,
        { q: "", status: "", companyId: "", jobId: "" },
      );
      const listRow = list.find(({ id }) => id === applicationId);
      expect(listRow?.activeNoteCount).toBe(expectedActiveCount);
      expect(listRow).not.toHaveProperty("notes");
      expect(JSON.stringify(listRow)).not.toContain(
        "Counted but never projected",
      );

      const pipeline = await applicationData.getJobApplicantPipeline(
        prisma,
        ownerId,
        jobId,
      );
      const pipelineRow = pipeline?.applications.find(
        ({ id }) => id === applicationId,
      );
      expect(pipelineRow?._count.notes).toBe(expectedActiveCount);
      expect(pipelineRow).not.toHaveProperty("notes");

      const summary = await applicationData.getJobApplicationSummary(
        prisma,
        ownerId,
        jobId,
      );
      expect(summary.activeNoteCount).toBe(expectedActiveCount);
      expect(summary.recent[0]).not.toHaveProperty("notes");
    });

    it("keeps Candidate and public projections free of note data and metadata", async () => {
      const candidateApplication =
        await applicationData.getCandidateApplication(
          prisma,
          candidateId,
          applicationId,
        );
      expect(candidateApplication).not.toHaveProperty("notes");
      expect(candidateApplication).not.toHaveProperty("activeNoteCount");
      expect(candidateApplication).not.toHaveProperty("_count");

      const publicJob = await jobData.getPublishedJobBySlug(
        prisma,
        `${testPrefix}-engineer`,
      );
      expect(publicJob).not.toHaveProperty("applications");
      expect(JSON.stringify(publicJob)).not.toContain("applicationNote");
    });
  },
);
