import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-notif-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let applications: typeof import("@/features/applications/server/mutations");
let applicationData: typeof import("@/features/applications/server/data");
let notifications: typeof import("@/features/notifications/server/mutations");
let notifData: typeof import("@/features/notifications/server/data");
let jobData: typeof import("@/features/jobs/server/data");
let companyData: typeof import("@/features/recruiter-company/server/data");

let ownerId: string;
let coOwnerId: string;
let memberId: string;
let adminId: string;
let otherOwnerId: string;
let candidateId: string;
let otherCandidateId: string;
let companyAId: string;
let companyBId: string;
let skillId: string;

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

function recipient(userId: string, role: "CANDIDATE" | "RECRUITER") {
  return { userId, role } as const;
}

function createUser(label: string, role: PlatformRole) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-${label}`,
      name: `Notifications Test ${label}`,
      email: `${testPrefix}-${label}@example.test`,
      role,
    },
    select: { id: true },
  });
}

async function createEligibleCandidateProfile(userId: string) {
  await prisma.candidateProfile.create({
    data: {
      userId,
      headline: "Senior Widget Engineer",
      location: "Remote",
      skills: { create: { skillId } },
    },
    select: { id: true },
  });
}

let jobCounter = 0;
async function createPublishedJob(companyId: string) {
  jobCounter += 1;
  return prisma.job.create({
    data: {
      companyId,
      title: `${testPrefix} Engineer ${jobCounter}`,
      slug: `${testPrefix}-engineer-${jobCounter}`,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { id: true, slug: true, title: true },
  });
}

function submit(candidateUserId: string, slug: string) {
  return applications.createJobApplication(
    prisma,
    actor(candidateUserId, "CANDIDATE"),
    slug,
    "I am excited to apply for this role.",
  );
}

function notificationsForApplication(applicationId: string) {
  return prisma.notification.findMany({ where: { applicationId } });
}

function unreadCountFor(userId: string) {
  return prisma.notification.count({
    where: { recipientUserId: userId, readAt: null },
  });
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Notification activity center database boundaries"
    : "Notification activity center database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        applicationsModule,
        applicationDataModule,
        notificationsModule,
        notifDataModule,
        jobDataModule,
        companyDataModule,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/applications/server/mutations"),
        import("@/features/applications/server/data"),
        import("@/features/notifications/server/mutations"),
        import("@/features/notifications/server/data"),
        import("@/features/jobs/server/data"),
        import("@/features/recruiter-company/server/data"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      applications = applicationsModule;
      applicationData = applicationDataModule;
      notifications = notificationsModule;
      notifData = notifDataModule;
      jobData = jobDataModule;
      companyData = companyDataModule;

      const users = await Promise.all([
        createUser("owner", "RECRUITER"),
        createUser("co-owner", "RECRUITER"),
        createUser("member", "RECRUITER"),
        createUser("admin", "ADMIN"),
        createUser("other-owner", "RECRUITER"),
        createUser("candidate", "CANDIDATE"),
        createUser("other-candidate", "CANDIDATE"),
      ]);
      [
        ownerId,
        coOwnerId,
        memberId,
        adminId,
        otherOwnerId,
        candidateId,
        otherCandidateId,
      ] = users.map(({ id }) => id);

      const skill = await prisma.skill.create({
        data: {
          name: `${testPrefix} Widgets`,
          normalizedName: `${testPrefix}-widgets`,
        },
        select: { id: true },
      });
      skillId = skill.id;

      await createEligibleCandidateProfile(candidateId);
      await createEligibleCandidateProfile(otherCandidateId);

      const companyA = await prisma.company.create({
        data: {
          name: `${testPrefix} Company A`,
          slug: `${testPrefix}-company-a`,
          isPublished: true,
          memberships: {
            create: [
              { userId: ownerId, role: "OWNER" },
              { userId: coOwnerId, role: "OWNER" },
              { userId: memberId, role: "MEMBER" },
              // A forged OWNER membership must NOT make an Admin a recipient.
              { userId: adminId, role: "OWNER" },
            ],
          },
        },
        select: { id: true },
      });
      companyAId = companyA.id;

      const companyB = await prisma.company.create({
        data: {
          name: `${testPrefix} Company B`,
          slug: `${testPrefix}-company-b`,
          isPublished: true,
          memberships: { create: { userId: otherOwnerId, role: "OWNER" } },
        },
        select: { id: true },
      });
      companyBId = companyB.id;
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      // Cleanup hardened against partial setup: every step is a filtered
      // deleteMany that tolerates missing rows, in FK-safe order.
      try {
        await prisma.emailOutbox.deleteMany({
          where: { recipientEmail: { startsWith: testPrefix } },
        });
      } catch {
        /* ignore */
      }
      try {
        await prisma.notification.deleteMany({
          where: { recipientUserId: { startsWith: testPrefix } },
        });
      } catch {
        /* ignore */
      }
      try {
        await prisma.company.deleteMany({
          where: { id: { in: [companyAId, companyBId].filter(Boolean) } },
        });
      } catch {
        /* ignore */
      }
      try {
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
      } catch {
        /* ignore */
      }
      try {
        await prisma.skill.deleteMany({
          where: { normalizedName: { startsWith: testPrefix } },
        });
      } catch {
        /* ignore */
      }
      await prisma.$disconnect();
    }, 60_000);

    // -----------------------------------------------------------------------
    // Application submission
    // -----------------------------------------------------------------------

    it("notifies every current Company OWNER Recruiter — and no one else — on submission", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);

      const rows = await notificationsForApplication(application.id);
      const recipients = rows.map((row) => row.recipientUserId).sort();
      expect(recipients).toEqual([ownerId, coOwnerId].sort());

      // One each for the two OWNER Recruiters.
      expect(
        rows.filter((row) => row.recipientUserId === ownerId),
      ).toHaveLength(1);
      expect(
        rows.filter((row) => row.recipientUserId === coOwnerId),
      ).toHaveLength(1);
      // MEMBER, the submitting Candidate, and the OWNER-membership Admin get none.
      expect(
        rows.some((row) =>
          [memberId, candidateId, adminId, otherOwnerId].includes(
            row.recipientUserId,
          ),
        ),
      ).toBe(false);

      const sample = rows.find((row) => row.recipientUserId === ownerId);
      expect(sample?.type).toBe("APPLICATION_SUBMITTED");
      expect(sample?.href).toBe(`/recruiter/applications/${application.id}`);
      expect(sample?.actorUserId).toBe(candidateId);
    });

    it("keeps application, initial history, and notifications atomically consistent", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);

      const stored = await prisma.jobApplication.findUnique({
        where: { id: application.id },
        select: { status: true, history: true },
      });
      expect(stored?.status).toBe("SUBMITTED");
      expect(stored?.history).toHaveLength(1);
      expect(stored?.history[0]).toMatchObject({
        fromStatus: null,
        toStatus: "SUBMITTED",
      });
      expect(await notificationsForApplication(application.id)).toHaveLength(2);
    });

    it("creates no duplicate notifications on a repeated (already-applied) submission", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await expect(submit(candidateId, job.slug)).rejects.toMatchObject({
        code: "ALREADY_APPLIED",
      });
      expect(await notificationsForApplication(application.id)).toHaveLength(2);
    });

    it("creates exactly one notification per OWNER under concurrent duplicate submission", async () => {
      const job = await createPublishedJob(companyAId);
      const results = await Promise.allSettled([
        submit(candidateId, job.slug),
        submit(candidateId, job.slug),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

      const application = await prisma.jobApplication.findUnique({
        where: { jobId_candidateId: { jobId: job.id, candidateId } },
        select: { id: true },
      });
      const rows = await notificationsForApplication(application!.id);
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.recipientUserId).sort()).toEqual(
        [ownerId, coOwnerId].sort(),
      );
    });

    // -----------------------------------------------------------------------
    // Status changes
    // -----------------------------------------------------------------------

    it("notifies the Candidate with safe status copy on a recruiter transition", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);

      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(ownerId, "RECRUITER"),
        application.id,
        "UNDER_REVIEW",
      );

      const statusNotifs = await prisma.notification.findMany({
        where: {
          applicationId: application.id,
          type: "APPLICATION_STATUS_CHANGED",
        },
      });
      expect(statusNotifs).toHaveLength(1);
      const notif = statusNotifs[0];
      expect(notif.recipientUserId).toBe(candidateId);
      expect(notif.message).toBe(
        `Your application for ${job.title} is now Under review.`,
      );
      // Safe copy: no email, no raw enum, no cover letter.
      expect(notif.message).not.toContain("@example.test");
      expect(notif.message).not.toContain("UNDER_REVIEW");
      expect(notif.href).toBe(`/candidate/applications/${application.id}`);
    });

    it("creates no notification for an invalid or terminal-state transition", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(ownerId, "RECRUITER"),
        application.id,
        "REJECTED",
      );
      const afterReject = await prisma.notification.count({
        where: {
          applicationId: application.id,
          type: "APPLICATION_STATUS_CHANGED",
        },
      });
      expect(afterReject).toBe(1);

      // From the terminal REJECTED state, any further transition is rejected.
      await expect(
        applications.transitionApplicationByRecruiter(
          prisma,
          actor(ownerId, "RECRUITER"),
          application.id,
          "UNDER_REVIEW",
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      // A repeated invalid action adds nothing.
      await expect(
        applications.transitionApplicationByRecruiter(
          prisma,
          actor(ownerId, "RECRUITER"),
          application.id,
          "UNDER_REVIEW",
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            type: "APPLICATION_STATUS_CHANGED",
          },
        }),
      ).toBe(1);
    });

    it("keeps status update, history, and notification consistent per transition", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(ownerId, "RECRUITER"),
        application.id,
        "UNDER_REVIEW",
      );
      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(coOwnerId, "RECRUITER"),
        application.id,
        "INTERVIEW",
      );

      const stored = await prisma.jobApplication.findUnique({
        where: { id: application.id },
        select: { status: true, history: { select: { toStatus: true } } },
      });
      expect(stored?.status).toBe("INTERVIEW");
      // Two distinct status-change notifications for the Candidate.
      const statusNotifs = await prisma.notification.count({
        where: {
          applicationId: application.id,
          type: "APPLICATION_STATUS_CHANGED",
          recipientUserId: candidateId,
        },
      });
      expect(statusNotifs).toBe(2);
    });

    // -----------------------------------------------------------------------
    // Withdrawal
    // -----------------------------------------------------------------------

    it("notifies every Company OWNER on withdrawal, excluding MEMBER and the withdrawing Candidate", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.withdrawJobApplication(
        prisma,
        actor(candidateId, "CANDIDATE"),
        application.id,
      );

      const rows = await prisma.notification.findMany({
        where: {
          applicationId: application.id,
          type: "APPLICATION_WITHDRAWN",
        },
      });
      expect(rows.map((r) => r.recipientUserId).sort()).toEqual(
        [ownerId, coOwnerId].sort(),
      );
      expect(
        rows.some((r) =>
          [memberId, candidateId, adminId].includes(r.recipientUserId),
        ),
      ).toBe(false);
      const sample = rows[0];
      expect(sample.message).toContain("withdrew their application for");
      expect(sample.message).not.toContain("@example.test");
    });

    it("creates no duplicate notification on a repeated withdrawal", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.withdrawJobApplication(
        prisma,
        actor(candidateId, "CANDIDATE"),
        application.id,
      );
      await expect(
        applications.withdrawJobApplication(
          prisma,
          actor(candidateId, "CANDIDATE"),
          application.id,
        ),
      ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });

      const withdrawnCount = await prisma.notification.count({
        where: {
          applicationId: application.id,
          type: "APPLICATION_WITHDRAWN",
        },
      });
      expect(withdrawnCount).toBe(2);
    });

    it("keeps withdrawal, history, and notifications consistent", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.withdrawJobApplication(
        prisma,
        actor(candidateId, "CANDIDATE"),
        application.id,
      );
      const stored = await prisma.jobApplication.findUnique({
        where: { id: application.id },
        select: {
          status: true,
          withdrawnAt: true,
          history: { where: { toStatus: "WITHDRAWN" } },
        },
      });
      expect(stored?.status).toBe("WITHDRAWN");
      expect(stored?.withdrawnAt).not.toBeNull();
      expect(stored?.history).toHaveLength(1);
    });

    // -----------------------------------------------------------------------
    // Notification ownership and reads
    // -----------------------------------------------------------------------

    it("returns only the recipient's own notifications from the Activity Center", async () => {
      const ownerPage = await notifData.getNotificationCenterPage(
        prisma,
        ownerId,
        { filter: "ALL", page: 1 },
      );
      const ownerTotal = await prisma.notification.count({
        where: { recipientUserId: ownerId },
      });
      expect(ownerPage.totalCount).toBe(ownerTotal);
      for (const item of ownerPage.items) {
        const belongs = await prisma.notification.findFirst({
          where: { id: item.id, recipientUserId: ownerId },
          select: { id: true },
        });
        expect(belongs).not.toBeNull();
      }

      const candidatePage = await notifData.getNotificationCenterPage(
        prisma,
        candidateId,
        { filter: "ALL", page: 1 },
      );
      for (const item of candidatePage.items) {
        const belongs = await prisma.notification.findFirst({
          where: { id: item.id, recipientUserId: candidateId },
          select: { id: true },
        });
        expect(belongs).not.toBeNull();
      }
    });

    it("gives an Admin no implicit Notification Center and unknown identities nothing", async () => {
      const adminPage = await notifData.getNotificationCenterPage(
        prisma,
        adminId,
        { filter: "ALL", page: 1 },
      );
      expect(adminPage.totalCount).toBe(0);
      expect(adminPage.items).toEqual([]);

      const unknownPage = await notifData.getNotificationCenterPage(
        prisma,
        `${testPrefix}-nobody`,
        { filter: "ALL", page: 1 },
      );
      expect(unknownPage.totalCount).toBe(0);
      expect(unknownPage.items).toEqual([]);
    });

    it("lets a recipient mark their own notification read, idempotently, and no one else's", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      await applications.transitionApplicationByRecruiter(
        prisma,
        actor(ownerId, "RECRUITER"),
        application.id,
        "UNDER_REVIEW",
      );
      const candidateNotif = await prisma.notification.findFirstOrThrow({
        where: {
          applicationId: application.id,
          recipientUserId: candidateId,
        },
        select: { id: true },
      });

      // Another user cannot mark it and cannot even tell it exists.
      const foreign = await notifications.markNotificationRead(
        prisma,
        recipient(ownerId, "RECRUITER"),
        candidateNotif.id,
      );
      expect(foreign.updated).toBe(0);
      expect(
        (
          await prisma.notification.findUnique({
            where: { id: candidateNotif.id },
            select: { readAt: true },
          })
        )?.readAt,
      ).toBeNull();

      const first = await notifications.markNotificationRead(
        prisma,
        recipient(candidateId, "CANDIDATE"),
        candidateNotif.id,
      );
      expect(first.updated).toBe(1);
      const second = await notifications.markNotificationRead(
        prisma,
        recipient(candidateId, "CANDIDATE"),
        candidateNotif.id,
      );
      expect(second.updated).toBe(0);
    });

    it("marks all read only for the current recipient and stays idempotent", async () => {
      const ownerUnreadBefore = await unreadCountFor(ownerId);
      const candidateUnreadBefore = await unreadCountFor(candidateId);
      expect(ownerUnreadBefore).toBeGreaterThan(0);

      const result = await notifications.markAllNotificationsRead(
        prisma,
        recipient(ownerId, "RECRUITER"),
      );
      expect(result.updated).toBe(ownerUnreadBefore);
      expect(await unreadCountFor(ownerId)).toBe(0);
      // The Candidate's unread notifications are untouched.
      expect(await unreadCountFor(candidateId)).toBe(candidateUnreadBefore);

      const again = await notifications.markAllNotificationsRead(
        prisma,
        recipient(ownerId, "RECRUITER"),
      );
      expect(again.updated).toBe(0);
    });

    it("reports accurate unread and filtered counts", async () => {
      const page = await notifData.getNotificationCenterPage(
        prisma,
        candidateId,
        { filter: "UNREAD", page: 1 },
      );
      const actualUnread = await unreadCountFor(candidateId);
      expect(page.unreadCount).toBe(actualUnread);
      expect(page.filteredCount).toBe(actualUnread);
      expect(page.readCount).toBe(page.totalCount - page.unreadCount);
      for (const item of page.items) {
        expect(item.readAt).toBeNull();
      }
    });

    // -----------------------------------------------------------------------
    // Privacy
    // -----------------------------------------------------------------------

    it("keeps notification data out of public Job and Company projections", async () => {
      const company = await companyData.getPublishedCompanyBySlug(
        prisma,
        `${testPrefix}-company-a`,
      );
      expect(JSON.stringify(company)).not.toContain("notification");
      expect(company).not.toHaveProperty("notifications");

      // A published job in Company A for a public read.
      const job = await createPublishedJob(companyAId);
      await submit(otherCandidateId, job.slug);
      const publicJob = await jobData.getPublishedJobBySlug(prisma, job.slug);
      expect(JSON.stringify(publicJob)).not.toContain("notification");
      expect(publicJob).not.toHaveProperty("notifications");
    });

    it("never exposes dedupeKey, recipientId, or private metadata in browser projections", async () => {
      const page = await notifData.getNotificationCenterPage(
        prisma,
        candidateId,
        { filter: "ALL", page: 1 },
      );
      expect(page.items.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(page.items);
      expect(serialized).not.toContain("dedupeKey");
      expect(serialized).not.toContain("application-status-changed:");
      expect(serialized).not.toContain("@example.test");
      for (const item of page.items) {
        expect(item).not.toHaveProperty("dedupeKey");
        expect(item).not.toHaveProperty("recipientUserId");
        expect(item).not.toHaveProperty("actorUserId");
        expect(item).not.toHaveProperty("applicationId");
        expect(Object.keys(item).sort()).toEqual(
          [
            "createdAt",
            "href",
            "id",
            "message",
            "readAt",
            "title",
            "type",
          ].sort(),
        );
      }

      const recent = await notifData.getRecentNotifications(
        prisma,
        candidateId,
      );
      expect(JSON.stringify(recent)).not.toContain("dedupeKey");
    });

    // -----------------------------------------------------------------------
    // Retention and independent re-authorization after role changes
    // -----------------------------------------------------------------------

    it("retains a notification with its original recipient after ownership is removed, without granting entity access", async () => {
      const job = await createPublishedJob(companyAId);
      const application = await submit(candidateId, job.slug);
      const coOwnerNotif = await prisma.notification.findFirstOrThrow({
        where: {
          applicationId: application.id,
          recipientUserId: coOwnerId,
        },
        select: { id: true },
      });

      // Before removal, the co-owner can reach the underlying application.
      expect(
        await applicationData.getRecruiterApplication(
          prisma,
          coOwnerId,
          application.id,
        ),
      ).not.toBeNull();

      // Remove the co-owner's OWNER membership.
      await prisma.companyMembership.deleteMany({
        where: { userId: coOwnerId, companyId: companyAId },
      });

      // The notification still belongs to the co-owner (retention).
      const stillOwned = await prisma.notification.findFirst({
        where: { id: coOwnerNotif.id, recipientUserId: coOwnerId },
        select: { id: true },
      });
      expect(stillOwned).not.toBeNull();
      const page = await notifData.getNotificationCenterPage(
        prisma,
        coOwnerId,
        { filter: "ALL", page: 1 },
      );
      expect(page.items.some((item) => item.id === coOwnerNotif.id)).toBe(true);

      // But the destination re-authorizes independently and now denies access.
      expect(
        await applicationData.getRecruiterApplication(
          prisma,
          coOwnerId,
          application.id,
        ),
      ).toBeNull();
    });
  },
);
