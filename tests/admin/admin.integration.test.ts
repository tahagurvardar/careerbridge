import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { CareerBridgeAuth } from "@/lib/auth-config";

vi.mock("server-only", () => ({}));

const prefix = `cb-admin-${Date.now()}-${randomBytes(4).toString("hex")}`;
const password = `${randomBytes(18).toString("base64url")}Aa1!`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let auth: CareerBridgeAuth;
let mutations: typeof import("@/features/admin/server/mutations");
let adminData: typeof import("@/features/admin/server/data");
let companyData: typeof import("@/features/recruiter-company/server/data");
let jobData: typeof import("@/features/jobs/server/data");
let applicationMutations: typeof import("@/features/applications/server/mutations");

let adminId: string;
let otherAdminId: string;
let candidateId: string;
let recruiterId: string;
let companyId: string;
let companySlug: string;
let jobId: string;
let jobSlug: string;
let applicationId: string;
let interviewId: string;
let candidateCookie: string;

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

function adminActor() {
  return {
    userId: adminId,
    role: "ADMIN" as const,
    accountStatus: "ACTIVE" as const,
  };
}

function moderationInput(
  targetId: string,
  expectedVersion: number,
  reasonCode: "SPAM" | "FRAUD" | "ABUSE" | "SECURITY_RISK" = "ABUSE",
  reasonNote?: string,
) {
  return { targetId, expectedVersion, reasonCode, reasonNote };
}

const emptyJobSearch = {
  q: "",
  location: "",
  employmentType: "" as const,
  workplaceType: "" as const,
  experienceLevel: "" as const,
};

databaseDescribe(
  databaseIntegrationEnabled
    ? "Admin trust and moderation database boundaries"
    : "Admin trust and moderation database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      for (const name of ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
        if (!process.env[name]) {
          throw new Error(
            `Missing required integration-test variable: ${name}`,
          );
        }
      }

      const [
        prismaModule,
        authModule,
        mutationModule,
        adminDataModule,
        companyDataModule,
        jobDataModule,
        applicationMutationModule,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/lib/auth-config"),
        import("@/features/admin/server/mutations"),
        import("@/features/admin/server/data"),
        import("@/features/recruiter-company/server/data"),
        import("@/features/jobs/server/data"),
        import("@/features/applications/server/mutations"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      auth = authModule.createAuth({
        enableNextCookies: false,
        prismaClient: prisma,
      });
      mutations = mutationModule;
      adminData = adminDataModule;
      companyData = companyDataModule;
      jobData = jobDataModule;
      applicationMutations = applicationMutationModule;

      const candidateRegistration = await auth.api.signUpEmail({
        returnHeaders: true,
        body: {
          email: `${prefix}-candidate@example.test`,
          password,
          name: "Admin Test Candidate",
          role: "CANDIDATE",
        },
      });
      candidateId = candidateRegistration.response.user.id;
      candidateCookie = candidateRegistration.headers
        .getSetCookie()
        .map((value) => value.split(";", 1)[0])
        .join("; ");

      const [admin, otherAdmin, recruiter] = await Promise.all([
        prisma.user.create({
          data: {
            id: `${prefix}-admin`,
            name: "Admin Test Actor",
            email: `${prefix}-admin@example.test`,
            role: "ADMIN",
          },
          select: { id: true },
        }),
        prisma.user.create({
          data: {
            id: `${prefix}-other-admin`,
            name: "Other Admin Test",
            email: `${prefix}-other-admin@example.test`,
            role: "ADMIN",
          },
          select: { id: true },
        }),
        prisma.user.create({
          data: {
            id: `${prefix}-recruiter`,
            name: "Admin Test Recruiter",
            email: `${prefix}-recruiter@example.test`,
            role: "RECRUITER",
          },
          select: { id: true },
        }),
      ]);
      adminId = admin.id;
      otherAdminId = otherAdmin.id;
      recruiterId = recruiter.id;

      companySlug = `${prefix}-company`;
      const company = await prisma.company.create({
        data: {
          name: `${prefix} Company`,
          slug: companySlug,
          description: "Synthetic Company for isolated moderation tests.",
          industry: "Technology",
          headquarters: "Baku",
          websiteUrl: "https://example.test",
          isPublished: true,
          memberships: {
            create: { userId: recruiterId, role: "OWNER" },
          },
        },
        select: { id: true },
      });
      companyId = company.id;

      jobSlug = `${prefix}-job`;
      const job = await prisma.job.create({
        data: {
          companyId,
          title: `${prefix} Engineer`,
          slug: jobSlug,
          status: "PUBLISHED",
          publishedAt: new Date(),
        },
        select: { id: true },
      });
      jobId = job.id;

      const application = await prisma.jobApplication.create({
        data: {
          jobId,
          candidateId,
          status: "SUBMITTED",
          history: {
            create: {
              fromStatus: null,
              toStatus: "SUBMITTED",
              changedByUserId: candidateId,
            },
          },
        },
        select: { id: true },
      });
      applicationId = application.id;
      await prisma.savedJob.create({ data: { candidateId, jobId } });
      const interview = await prisma.interview.create({
        data: {
          applicationId,
          organizerUserId: recruiterId,
          title: "Synthetic interview",
          format: "VIDEO",
          status: "PENDING_RESPONSE",
          startAt: new Date("2030-01-01T10:00:00.000Z"),
          endAt: new Date("2030-01-01T11:00:00.000Z"),
          timeZone: "Asia/Baku",
          meetingUrl: "https://meet.example.test/synthetic",
          events: {
            create: {
              actorUserId: recruiterId,
              type: "CREATED",
              fromStatus: null,
              toStatus: "PENDING_RESPONSE",
              startAt: new Date("2030-01-01T10:00:00.000Z"),
              endAt: new Date("2030-01-01T11:00:00.000Z"),
              timeZone: "Asia/Baku",
            },
          },
        },
        select: { id: true },
      });
      interviewId = interview.id;
      const note = await prisma.applicationNote.create({
        data: {
          applicationId,
          authorUserId: recruiterId,
          body: "Synthetic private note",
        },
        select: { id: true },
      });
      await prisma.applicationNoteRevision.create({
        data: {
          noteId: note.id,
          version: 1,
          action: "CREATED",
          body: "Synthetic private note",
          actorUserId: recruiterId,
        },
      });
      await prisma.notification.create({
        data: {
          recipientUserId: candidateId,
          actorUserId: recruiterId,
          type: "APPLICATION_STATUS_CHANGED",
          title: "Synthetic notification",
          message: "Synthetic moderation retention fixture.",
          href: `/candidate/applications/${applicationId}`,
          applicationId,
          jobId,
          companyId,
          dedupeKey: `${prefix}:notification`,
        },
      });
      await prisma.emailOutbox.create({
        data: {
          recipientUserId: candidateId,
          recipientEmail: `${prefix}-candidate@example.test`,
          eventType: "APPLICATION_STATUS_CHANGED",
          subject: "Synthetic event",
          textBody: "Synthetic event",
          htmlBody: "<p>Synthetic event</p>",
          destinationPath: `/candidate/applications/${applicationId}`,
          dedupeKey: `${prefix}:email`,
          status: "SUPPRESSED",
          applicationId,
          companyId,
        },
      });
      await prisma.companyMembershipEvent.create({
        data: {
          companyId,
          actorUserId: recruiterId,
          subjectUserId: recruiterId,
          type: "MEMBER_PROMOTED_TO_OWNER",
          fromRole: "MEMBER",
          toRole: "OWNER",
        },
      });
      await prisma.session.create({
        data: {
          id: `${prefix}-recruiter-session`,
          token: `${prefix}-recruiter-token`,
          userId: recruiterId,
          expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        },
      });
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.emailOutbox.deleteMany({
        where: { dedupeKey: { startsWith: prefix } },
      });
      await prisma.adminAuditEvent.deleteMany({
        where: {
          OR: [
            { actor: { email: { startsWith: prefix } } },
            { targetUser: { email: { startsWith: prefix } } },
            { targetCompany: { name: { startsWith: prefix } } },
            { targetJob: { slug: { startsWith: prefix } } },
          ],
        },
      });
      await prisma.company.deleteMany({
        where: { name: { startsWith: prefix } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: prefix } },
      });
      await prisma.$disconnect();
    }, 60_000);

    it("re-authorizes moderation mutations for an active Admin", async () => {
      await expect(
        mutations.moderateCompany(
          prisma,
          {
            userId: candidateId,
            role: "CANDIDATE",
            accountStatus: "ACTIVE",
          },
          "HIDE",
          moderationInput(companyId, 1),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        mutations.moderateCompany(
          prisma,
          {
            userId: adminId,
            role: "ADMIN",
            accountStatus: "SUSPENDED",
          },
          "HIDE",
          moderationInput(companyId, 1),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        mutations.moderateCompany(
          prisma,
          {
            userId: candidateId,
            role: "ADMIN",
            accountStatus: "ACTIVE",
          },
          "HIDE",
          moderationInput(companyId, 1),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("suspends a Candidate atomically, revokes sessions, and blocks sign-in", async () => {
      expect(
        await prisma.session.count({ where: { userId: candidateId } }),
      ).toBeGreaterThan(0);

      await mutations.moderateUserAccount(
        prisma,
        adminActor(),
        "SUSPEND",
        moderationInput(candidateId, 1, "SECURITY_RISK"),
      );

      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: candidateId },
        select: {
          role: true,
          accountStatus: true,
          moderationVersion: true,
          suspendedAt: true,
        },
      });
      expect(stored).toMatchObject({
        role: "CANDIDATE",
        accountStatus: "SUSPENDED",
        moderationVersion: 2,
      });
      expect(stored.suspendedAt).not.toBeNull();
      expect(
        await prisma.session.count({ where: { userId: candidateId } }),
      ).toBe(0);
      expect(
        await prisma.adminAuditEvent.count({
          where: { targetUserId: candidateId, action: "USER_SUSPENDED" },
        }),
      ).toBe(1);
      expect(
        await prisma.jobApplication.count({ where: { candidateId } }),
      ).toBe(1);

      const staleSession = await auth.api.getSession({
        headers: new Headers({ cookie: candidateCookie }),
      });
      expect(staleSession).toBeNull();
      await expect(
        auth.api.signInEmail({
          body: {
            email: `${prefix}-candidate@example.test`,
            password,
          },
        }),
      ).rejects.toMatchObject({ statusCode: 403 });

      await expect(
        mutations.moderateUserAccount(
          prisma,
          adminActor(),
          "SUSPEND",
          moderationInput(candidateId, 1),
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(
        await prisma.adminAuditEvent.count({
          where: { targetUserId: candidateId, action: "USER_SUSPENDED" },
        }),
      ).toBe(1);
    });

    it("restores the Candidate without creating a session", async () => {
      await mutations.moderateUserAccount(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(candidateId, 2),
      );
      await expect(
        prisma.user.findUniqueOrThrow({ where: { id: candidateId } }),
      ).resolves.toMatchObject({
        accountStatus: "ACTIVE",
        moderationVersion: 3,
        suspendedAt: null,
      });
      expect(
        await prisma.session.count({ where: { userId: candidateId } }),
      ).toBe(0);
      const signedIn = await auth.api.signInEmail({
        body: {
          email: `${prefix}-candidate@example.test`,
          password,
        },
      });
      expect(signedIn.user.id).toBe(candidateId);
      await prisma.session.deleteMany({ where: { userId: candidateId } });
    });

    it("rejects self and other-Admin targets", async () => {
      await expect(
        mutations.moderateUserAccount(
          prisma,
          adminActor(),
          "SUSPEND",
          moderationInput(adminId, 1),
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        mutations.moderateUserAccount(
          prisma,
          adminActor(),
          "SUSPEND",
          moderationInput(otherAdminId, 1),
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("allows only one concurrent Recruiter suspension", async () => {
      const outcomes = await Promise.allSettled([
        mutations.moderateUserAccount(
          prisma,
          adminActor(),
          "SUSPEND",
          moderationInput(recruiterId, 1, "FRAUD"),
        ),
        mutations.moderateUserAccount(
          prisma,
          adminActor(),
          "SUSPEND",
          moderationInput(recruiterId, 1, "FRAUD"),
        ),
      ]);
      expect(
        outcomes.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        outcomes.filter(({ status }) => status === "rejected"),
      ).toHaveLength(1);
      expect(
        await prisma.adminAuditEvent.count({
          where: { targetUserId: recruiterId, action: "USER_SUSPENDED" },
        }),
      ).toBe(1);
      expect(
        await prisma.session.count({ where: { userId: recruiterId } }),
      ).toBe(0);
      expect(
        await prisma.companyMembership.count({
          where: { userId: recruiterId },
        }),
      ).toBe(1);

      await mutations.moderateUserAccount(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(recruiterId, 2),
      );
    });

    it("hides and restores a Company without changing publication or history", async () => {
      const privateReason = "admin-company-note-not-for-members";
      await mutations.moderateCompany(
        prisma,
        adminActor(),
        "HIDE",
        moderationInput(companyId, 1, "ABUSE", privateReason),
      );

      expect(
        await companyData.getPublishedCompanyBySlug(prisma, companySlug),
      ).toBeNull();
      expect(
        (
          await companyData.getPublishedCompanies(prisma, {
            q: prefix,
            industry: "",
            headquarters: "",
          })
        ).some(({ id }) => id === companyId),
      ).toBe(false);
      expect(await jobData.getPublishedJobBySlug(prisma, jobSlug)).toBeNull();

      const workspace = await companyData.getCompanyWorkspace(
        prisma,
        recruiterId,
        companyId,
      );
      expect(workspace?.company).toMatchObject({
        isPublished: true,
        moderationStatus: "HIDDEN",
      });
      expect(JSON.stringify(workspace)).not.toContain(privateReason);
      expect(
        await prisma.jobApplication.count({ where: { id: applicationId } }),
      ).toBe(1);

      await mutations.moderateCompany(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(companyId, 2),
      );
      await expect(
        prisma.company.findUniqueOrThrow({ where: { id: companyId } }),
      ).resolves.toMatchObject({
        isPublished: true,
        moderationStatus: "VISIBLE",
        moderationVersion: 3,
      });
      const publicCompany = await companyData.getPublishedCompanyBySlug(
        prisma,
        companySlug,
      );
      expect(publicCompany).not.toBeNull();
      expect(publicCompany).not.toHaveProperty("moderationStatus");
      expect(publicCompany).not.toHaveProperty("moderationVersion");
    });

    it("hides a Job, blocks new applications, and retains private history", async () => {
      const privateReason = "admin-job-note-not-for-recruiters";
      await mutations.moderateJob(
        prisma,
        adminActor(),
        "HIDE",
        moderationInput(jobId, 1, "SPAM", privateReason),
      );

      expect(await jobData.getPublishedJobBySlug(prisma, jobSlug)).toBeNull();
      expect(
        (
          await jobData.getPublishedJobs(prisma, {
            ...emptyJobSearch,
            q: prefix,
          })
        ).some(({ slug }) => slug === jobSlug),
      ).toBe(false);
      await expect(
        applicationMutations.createJobApplication(
          prisma,
          { userId: candidateId, role: "CANDIDATE" },
          jobSlug,
          "",
        ),
      ).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });

      const workspace = await jobData.getRecruiterJob(
        prisma,
        recruiterId,
        jobId,
      );
      expect(workspace?.moderationStatus).toBe("HIDDEN");
      expect(JSON.stringify(workspace)).not.toContain(privateReason);
      expect(
        await prisma.jobApplication.count({ where: { id: applicationId } }),
      ).toBe(1);
      expect(await prisma.interview.count({ where: { id: interviewId } })).toBe(
        1,
      );
      expect(
        await prisma.applicationNote.count({ where: { applicationId } }),
      ).toBe(1);
      expect(
        await prisma.savedJob.count({ where: { candidateId, jobId } }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: { recipientUserId: candidateId },
        }),
      ).toBe(1);
      expect(
        await prisma.emailOutbox.count({
          where: { recipientUserId: candidateId },
        }),
      ).toBe(1);
      expect(
        await prisma.companyMembershipEvent.count({ where: { companyId } }),
      ).toBe(1);

      await mutations.moderateJob(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(jobId, 2),
      );
      await expect(
        prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
      ).resolves.toMatchObject({
        status: "PUBLISHED",
        moderationStatus: "VISIBLE",
        moderationVersion: 3,
      });
    });

    it("restores moderation visibility without publishing a Draft", async () => {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: "DRAFT", publishedAt: null },
      });
      await mutations.moderateJob(
        prisma,
        adminActor(),
        "HIDE",
        moderationInput(jobId, 3),
      );
      await mutations.moderateJob(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(jobId, 4),
      );
      await expect(
        prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
      ).resolves.toMatchObject({
        status: "DRAFT",
        moderationStatus: "VISIBLE",
        moderationVersion: 5,
      });
      expect(await jobData.getPublishedJobBySlug(prisma, jobSlug)).toBeNull();
    });

    it("retains audit history when an actor or target is later deleted", async () => {
      const disposableAdmin = await prisma.user.create({
        data: {
          id: `${prefix}-disposable-admin`,
          name: "Disposable Admin Test",
          email: `${prefix}-disposable-admin@example.test`,
          role: "ADMIN",
        },
        select: { id: true },
      });
      await mutations.moderateJob(
        prisma,
        {
          userId: disposableAdmin.id,
          role: "ADMIN",
          accountStatus: "ACTIVE",
        },
        "HIDE",
        moderationInput(jobId, 5),
      );
      const actorEvent = await prisma.adminAuditEvent.findFirstOrThrow({
        where: {
          actorAdminUserId: disposableAdmin.id,
          targetJobId: jobId,
          action: "JOB_HIDDEN",
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      await prisma.user.delete({ where: { id: disposableAdmin.id } });
      await expect(
        prisma.adminAuditEvent.findUniqueOrThrow({
          where: { id: actorEvent.id },
        }),
      ).resolves.toMatchObject({ actorAdminUserId: null, targetJobId: jobId });
      await mutations.moderateJob(
        prisma,
        adminActor(),
        "RESTORE",
        moderationInput(jobId, 6),
      );

      const disposableTarget = await prisma.user.create({
        data: {
          id: `${prefix}-disposable-target`,
          name: "Disposable Candidate Test",
          email: `${prefix}-disposable-target@example.test`,
          role: "CANDIDATE",
        },
        select: { id: true },
      });
      await mutations.moderateUserAccount(
        prisma,
        adminActor(),
        "SUSPEND",
        moderationInput(disposableTarget.id, 1),
      );
      const targetEvent = await prisma.adminAuditEvent.findFirstOrThrow({
        where: {
          actorAdminUserId: adminId,
          targetUserId: disposableTarget.id,
          action: "USER_SUSPENDED",
        },
        select: { id: true },
      });
      await prisma.user.delete({ where: { id: disposableTarget.id } });
      await expect(
        prisma.adminAuditEvent.findUniqueOrThrow({
          where: { id: targetEvent.id },
        }),
      ).resolves.toMatchObject({
        actorAdminUserId: adminId,
        targetUserId: null,
      });
    });

    it("returns bounded, filterable, privacy-safe Admin summaries", async () => {
      const audit = await adminData.getAdminAudit(prisma, {
        action: "JOB_HIDDEN",
        reason: "SPAM",
        page: 1,
      });
      expect(audit.total).toBeGreaterThan(0);
      expect(
        audit.items.every(
          (event) =>
            event.action === "JOB_HIDDEN" && event.reasonCode === "SPAM",
        ),
      ).toBe(true);

      const userDetail = await adminData.getAdminUserDetail(
        prisma,
        candidateId,
      );
      const companyDetail = await adminData.getAdminCompanyDetail(
        prisma,
        companyId,
      );
      const jobDetail = await adminData.getAdminJobDetail(prisma, jobId);
      const serialized = JSON.stringify({
        userDetail,
        companyDetail,
        jobDetail,
      });
      for (const privateField of [
        "password",
        "sessions",
        "coverLetter",
        "meetingUrl",
        "recipientEmail",
        "textBody",
        "htmlBody",
        "applicationNotes",
      ]) {
        expect(serialized).not.toContain(privateField);
      }

      const dashboard = await adminData.getAdminDashboard(prisma);
      expect(dashboard.recentAudit.length).toBeLessThanOrEqual(10);
      expect(
        dashboard.recentAudit.every((event) => !("reasonNote" in event)),
      ).toBe(true);
      expect(dashboard.counts.totalUsers).toBeGreaterThanOrEqual(4);
    });

    it("enforces audit target/action compatibility at the database", async () => {
      await expect(
        prisma.adminAuditEvent.create({
          data: {
            actorAdminUserId: adminId,
            targetCompanyId: companyId,
            action: "USER_SUSPENDED",
            reasonCode: "OTHER",
          },
        }),
      ).rejects.toBeTruthy();
    });
  },
);
