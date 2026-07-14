import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { EmailDeliveryProvider } from "@/features/email/server/provider";

vi.mock("server-only", () => ({}));

const prefix = `cb-email-${Date.now()}-${randomBytes(4).toString("hex")}`;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = enabled ? describe.sequential : describe.skip;

let prisma: PrismaClient;
let applicationMutations: typeof import("@/features/applications/server/mutations");
let teamMutations: typeof import("@/features/company-team/server/mutations");
let dispatcher: typeof import("@/features/email/server/dispatcher");
let ownerId: string;
let coOwnerId: string;
let memberId: string;
let candidateId: string;
let inviteeId: string;
let companyId: string;
let skillId: string;

function testDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true" || !value) {
    throw new Error("Integration database opt-in is required.");
  }
  if (
    [process.env.DATABASE_URL, process.env.DIRECT_URL].some(
      (url) => url && url === value,
    )
  ) {
    throw new Error("The test database must be isolated.");
  }
  return value;
}

async function createUser(
  label: string,
  role: "CANDIDATE" | "RECRUITER",
  preferredLocale: "EN" | "TR" | "AZ" | "RU" = "EN",
) {
  return prisma.user.create({
    data: {
      id: `${prefix}-${label}`,
      name: `${label} Test User`,
      email: `${prefix}-${label}@example.test`,
      role,
      preferredLocale,
    },
    select: { id: true },
  });
}

let jobNumber = 0;
async function createJob() {
  jobNumber += 1;
  return prisma.job.create({
    data: {
      companyId,
      title: `${prefix} Engineer ${jobNumber}`,
      slug: `${prefix}-engineer-${jobNumber}`,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { id: true, slug: true },
  });
}

async function submit(slug: string) {
  return applicationMutations.createJobApplication(
    prisma,
    { userId: candidateId, role: "CANDIDATE" },
    slug,
    "A safe integration-test cover letter.",
  );
}

function fakeProvider(
  send: EmailDeliveryProvider["send"],
): EmailDeliveryProvider {
  return { name: "fake", send };
}

async function createQueueFixture(label: string, maxAttempts = 5) {
  return prisma.emailOutbox.create({
    data: {
      recipientUserId: candidateId,
      recipientEmail: `${prefix}-snapshot@example.test`,
      eventType: "APPLICATION_STATUS_CHANGED",
      subject: "Test transactional email",
      textBody: "Open {{CAREERBRIDGE_DESTINATION_URL}}",
      htmlBody: '<p><a href="{{CAREERBRIDGE_DESTINATION_URL}}">Open</a></p>',
      destinationPath: "/candidate/applications/test",
      dedupeKey: `${prefix}:queue:${label}`,
      maxAttempts,
      nextAttemptAt: new Date(0),
    },
  });
}

databaseDescribe(
  enabled
    ? "transactional email outbox database boundaries"
    : "transactional email outbox database boundaries (skipped: explicit isolated database opt-in required)",
  () => {
    beforeAll(async () => {
      const [prismaModule, applicationModule, teamModule, dispatcherModule] =
        await Promise.all([
          import("@/lib/prisma"),
          import("@/features/applications/server/mutations"),
          import("@/features/company-team/server/mutations"),
          import("@/features/email/server/dispatcher"),
        ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(testDatabaseUrl());
      applicationMutations = applicationModule;
      teamMutations = teamModule;
      dispatcher = dispatcherModule;
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("EMAIL_APP_BASE_URL", "http://localhost:3000");

      const [owner, coOwner, member, candidate, invitee] = await Promise.all([
        createUser("owner", "RECRUITER", "TR"),
        createUser("co-owner", "RECRUITER", "RU"),
        createUser("member", "RECRUITER"),
        createUser("candidate", "CANDIDATE", "AZ"),
        createUser("invitee", "RECRUITER", "TR"),
      ]);
      ownerId = owner.id;
      coOwnerId = coOwner.id;
      memberId = member.id;
      candidateId = candidate.id;
      inviteeId = invitee.id;

      const company = await prisma.company.create({
        data: {
          name: `${prefix} Company`,
          slug: `${prefix}-company`,
          isPublished: true,
          memberships: {
            create: [
              { userId: ownerId, role: "OWNER" },
              { userId: coOwnerId, role: "OWNER" },
              { userId: memberId, role: "MEMBER" },
            ],
          },
        },
        select: { id: true },
      });
      companyId = company.id;
      const skill = await prisma.skill.create({
        data: {
          name: `${prefix} Skill`,
          normalizedName: `${prefix}-skill`,
        },
        select: { id: true },
      });
      skillId = skill.id;
      await prisma.candidateProfile.create({
        data: {
          userId: candidateId,
          headline: "Integration Engineer",
          location: "Remote",
          skills: { create: { skillId } },
        },
      });
    });

    afterAll(async () => {
      vi.unstubAllEnvs();
      if (!prisma) return;
      try {
        await prisma.emailDeliveryAttempt.deleteMany({
          where: {
            outbox: {
              OR: [
                { dedupeKey: { startsWith: prefix } },
                { recipientUserId: { startsWith: prefix } },
              ],
            },
          },
        });
        await prisma.emailOutbox.deleteMany({
          where: {
            OR: [
              { dedupeKey: { startsWith: prefix } },
              { recipientUserId: { startsWith: prefix } },
            ],
          },
        });
        await prisma.notification.deleteMany({
          where: { recipientUserId: { startsWith: prefix } },
        });
        await prisma.userEmailPreference.deleteMany({
          where: { userId: { startsWith: prefix } },
        });
        await prisma.company.deleteMany({ where: { id: companyId } });
        await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
        await prisma.skill.deleteMany({ where: { id: skillId } });
      } finally {
        await prisma.$disconnect();
      }
    });

    it("creates OWNER submission outbox rows atomically and excludes MEMBERs", async () => {
      const job = await createJob();
      const application = await submit(job.slug);
      const rows = await prisma.emailOutbox.findMany({
        where: {
          applicationId: application.id,
          eventType: "APPLICATION_SUBMITTED",
        },
        select: {
          recipientUserId: true,
          status: true,
          locale: true,
          subject: true,
          destinationPath: true,
        },
      });
      expect(rows).toHaveLength(2);
      expect(rows.map((row) => row.recipientUserId).sort()).toEqual(
        [ownerId, coOwnerId].sort(),
      );
      expect(rows.every((row) => row.status === "PENDING")).toBe(true);
      expect(rows.some((row) => row.recipientUserId === memberId)).toBe(false);
      const turkish = rows.find((row) => row.recipientUserId === ownerId);
      const russian = rows.find((row) => row.recipientUserId === coOwnerId);
      expect(turkish?.locale).toBe("TR");
      expect(russian?.locale).toBe("RU");
      expect(turkish?.subject).not.toBe(russian?.subject);
      expect(
        rows.every((row) => row.destinationPath.startsWith("/recruiter/")),
      ).toBe(true);

      const originalSnapshot = {
        locale: turkish?.locale,
        subject: turkish?.subject,
        destinationPath: turkish?.destinationPath,
      };
      await prisma.user.update({
        where: { id: ownerId },
        data: { preferredLocale: "AZ" },
      });
      const storedTurkish = await prisma.emailOutbox.findFirstOrThrow({
        where: {
          applicationId: application.id,
          recipientUserId: ownerId,
          eventType: "APPLICATION_SUBMITTED",
        },
      });
      expect(storedTurkish).toMatchObject(originalSnapshot);
      await prisma.user.update({
        where: { id: ownerId },
        data: { preferredLocale: "TR" },
      });
    });

    it("snapshots a disabled status preference as SUPPRESSED while preserving in-app notification", async () => {
      await prisma.userEmailPreference.create({
        data: {
          userId: candidateId,
          eventType: "APPLICATION_STATUS_CHANGED",
          enabled: false,
        },
      });
      const job = await createJob();
      const application = await submit(job.slug);
      await applicationMutations.transitionApplicationByRecruiter(
        prisma,
        { userId: ownerId, role: "RECRUITER" },
        application.id,
        "UNDER_REVIEW",
      );
      const outbox = await prisma.emailOutbox.findFirstOrThrow({
        where: {
          applicationId: application.id,
          eventType: "APPLICATION_STATUS_CHANGED",
        },
      });
      expect(outbox.status).toBe("SUPPRESSED");
      expect(outbox.locale).toBe("AZ");
      expect(outbox.lastErrorCode).toBe("USER_PREFERENCE");
      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            recipientUserId: candidateId,
            type: "APPLICATION_STATUS_CHANGED",
          },
        }),
      ).toBe(1);
    });

    it("creates one withdrawal intent per current OWNER with event-time preferences", async () => {
      await prisma.userEmailPreference.create({
        data: {
          userId: coOwnerId,
          eventType: "APPLICATION_WITHDRAWN",
          enabled: false,
        },
      });
      const job = await createJob();
      const application = await submit(job.slug);
      await applicationMutations.withdrawJobApplication(
        prisma,
        { userId: candidateId, role: "CANDIDATE" },
        application.id,
      );
      const rows = await prisma.emailOutbox.findMany({
        where: {
          applicationId: application.id,
          eventType: "APPLICATION_WITHDRAWN",
        },
        select: { recipientUserId: true, status: true, locale: true },
      });
      expect(rows).toEqual(
        expect.arrayContaining([
          { recipientUserId: ownerId, status: "PENDING", locale: "TR" },
          { recipientUserId: coOwnerId, status: "SUPPRESSED", locale: "RU" },
        ]),
      );
    });

    it("creates an invitee email intent in the invitation transaction", async () => {
      const invitation = await teamMutations.createCompanyInvitation(
        prisma,
        { userId: ownerId, role: "RECRUITER" },
        companyId,
        { email: `${prefix}-invitee@example.test` },
      );
      expect(
        await prisma.emailOutbox.count({
          where: {
            invitationId: invitation.invitationId,
            recipientUserId: inviteeId,
            eventType: "COMPANY_INVITATION_RECEIVED",
          },
        }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: {
            companyId,
            recipientUserId: inviteeId,
            type: "COMPANY_INVITATION_RECEIVED",
          },
        }),
      ).toBe(1);
    });

    it("claims once, records success atomically, and never resends SENT rows", async () => {
      await prisma.emailOutbox.updateMany({
        where: {
          recipientUserId: { startsWith: prefix },
          status: "PENDING",
          dedupeKey: { not: { startsWith: `${prefix}:queue:` } },
        },
        data: { nextAttemptAt: new Date("2999-01-01T00:00:00.000Z") },
      });
      const row = await createQueueFixture("success");
      const send = vi.fn().mockResolvedValue({
        provider: "fake",
        providerMessageId: "fake-message",
      });
      const first = await dispatcher.dispatchEmailBatch(
        prisma,
        fakeProvider(send),
        1,
      );
      const second = await dispatcher.dispatchEmailBatch(
        prisma,
        fakeProvider(send),
        1,
      );
      expect(first.sent).toBe(1);
      expect(second.claimed).toBe(0);
      expect(send).toHaveBeenCalledTimes(1);
      expect(
        await prisma.emailDeliveryAttempt.count({
          where: { outboxId: row.id },
        }),
      ).toBe(1);
      expect(
        await prisma.emailOutbox.findUniqueOrThrow({ where: { id: row.id } }),
      ).toMatchObject({ status: "SENT", attemptCount: 1, lockToken: null });
    });

    it("schedules retryable failures then dead-letters at the maximum", async () => {
      const row = await createQueueFixture("retry", 2);
      const send = vi.fn().mockRejectedValue(
        Object.assign(new Error("private provider detail"), {
          code: "PROVIDER_UNAVAILABLE",
          retryable: true,
        }),
      );
      await dispatcher.dispatchEmailBatch(prisma, fakeProvider(send), 1);
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: { nextAttemptAt: new Date(0) },
      });
      await dispatcher.dispatchEmailBatch(prisma, fakeProvider(send), 1);
      const final = await prisma.emailOutbox.findUniqueOrThrow({
        where: { id: row.id },
      });
      expect(final.status).toBe("DEAD_LETTER");
      expect(final.attemptCount).toBe(2);
      expect(
        await prisma.emailDeliveryAttempt.count({
          where: { outboxId: row.id },
        }),
      ).toBe(2);
      expect(final.lastErrorCode).toBe("PROVIDER_EXCEPTION");
    });

    it("uses SKIP LOCKED across workers and safely recovers stale processing", async () => {
      const row = await createQueueFixture("concurrent");
      const [first, second] = await Promise.all([
        dispatcher.claimDueEmails(prisma, 1),
        dispatcher.claimDueEmails(prisma, 1),
      ]);
      expect(first.length + second.length).toBe(1);
      const firstToken = [...first, ...second][0].lockToken;
      await prisma.emailOutbox.update({
        where: { id: row.id },
        data: { lockedAt: new Date(Date.now() - 11 * 60_000) },
      });
      const recovered = await dispatcher.claimDueEmails(prisma, 1);
      expect(recovered).toHaveLength(1);
      expect(recovered[0].lockToken).not.toBe(firstToken);
    });
  },
);
