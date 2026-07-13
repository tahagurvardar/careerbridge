import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ValidatedInterviewSchedule } from "@/features/interviews/schemas";

vi.mock("server-only", () => ({}));

// Deliberately avoids the substring "interview" so public-projection privacy
// assertions can scan serialized reads for leaked interview data.
const prefix = `cb-p5a-${Date.now()}-${randomBytes(4).toString("hex")}`;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = enabled ? describe.sequential : describe.skip;

let prisma: PrismaClient;
let mutations: typeof import("@/features/interviews/server/mutations");
let data: typeof import("@/features/interviews/server/data");
let jobsData: typeof import("@/features/jobs/server/data");
let companyData: typeof import("@/features/recruiter-company/server/data");
let ownerId: string;
let coOwnerId: string;
let memberId: string;
let rivalId: string;
let candidateId: string;
let otherCandidateId: string;
let adminId: string;
let companyAId: string;
let jobA1Slug: string;
let companyASlug: string;
let jobB1Id: string;

const ownerActor = () => ({ userId: ownerId, role: "RECRUITER" as const });
const coOwnerActor = () => ({ userId: coOwnerId, role: "RECRUITER" as const });
const memberActor = () => ({ userId: memberId, role: "RECRUITER" as const });
const rivalActor = () => ({ userId: rivalId, role: "RECRUITER" as const });
const candidateActor = () => ({
  userId: candidateId,
  role: "CANDIDATE" as const,
});
const otherCandidateActor = () => ({
  userId: otherCandidateId,
  role: "CANDIDATE" as const,
});
const adminActor = () => ({ userId: adminId, role: "ADMIN" as const });

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
  role: "CANDIDATE" | "RECRUITER" | "ADMIN",
) {
  return prisma.user.create({
    data: {
      id: `${prefix}-${label}`,
      name: `${label} Test User`,
      email: `${prefix}-${label}@example.test`,
      role,
    },
    select: { id: true },
  });
}

let jobNumber = 0;
async function createJob(companyId: string) {
  jobNumber += 1;
  return prisma.job.create({
    data: {
      companyId,
      title: `${prefix} Role ${jobNumber}`,
      slug: `${prefix}-role-${jobNumber}`,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    select: { id: true, slug: true },
  });
}

async function createApplication(
  candidate: string,
  jobId: string,
  status:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "INTERVIEW"
    | "OFFER"
    | "HIRED"
    | "REJECTED"
    | "WITHDRAWN" = "UNDER_REVIEW",
) {
  return prisma.jobApplication.create({
    data: { candidateId: candidate, jobId, status },
    select: { id: true },
  });
}

// Non-overlapping hourly windows, far in the future, so unrelated tests can
// never trip the candidate/organizer conflict rules by accident.
const SLOT_BASE = Date.now() + 30 * 24 * 60 * 60 * 1000;
let slotNumber = 0;
function nextSlot(durationMinutes = 60) {
  slotNumber += 1;
  const startAt = new Date(SLOT_BASE + slotNumber * 2 * 60 * 60 * 1000);
  return {
    startAt,
    endAt: new Date(startAt.getTime() + durationMinutes * 60_000),
  };
}

function makeSchedule(
  slot: { startAt: Date; endAt: Date },
  overrides: Partial<ValidatedInterviewSchedule> = {},
): ValidatedInterviewSchedule {
  return {
    title: "Integration interview",
    format: "VIDEO",
    startAt: slot.startAt,
    endAt: slot.endAt,
    timeZone: "Europe/Istanbul",
    location: null,
    meetingUrl: "https://meet.example.test/room",
    instructions: null,
    ...overrides,
  };
}

async function footprint(applicationId: string) {
  const [interviews, events, notifications, outbox] = await Promise.all([
    prisma.interview.count({ where: { applicationId } }),
    prisma.interviewEvent.count({
      where: { interview: { applicationId } },
    }),
    prisma.notification.count({ where: { applicationId } }),
    prisma.emailOutbox.count({ where: { applicationId } }),
  ]);
  return { interviews, events, notifications, outbox };
}

function expectMutationError(error: unknown, code: string) {
  expect(error).toBeInstanceOf(mutations.InterviewMutationError);
  expect((error as { code: string }).code).toBe(code);
}

databaseDescribe(
  enabled
    ? "interview scheduling database boundaries"
    : "interview scheduling database boundaries (skipped: explicit isolated database opt-in required)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        mutationModule,
        dataModule,
        jobsModule,
        companyModule,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/interviews/server/mutations"),
        import("@/features/interviews/server/data"),
        import("@/features/jobs/server/data"),
        import("@/features/recruiter-company/server/data"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(testDatabaseUrl());
      mutations = mutationModule;
      data = dataModule;
      jobsData = jobsModule;
      companyData = companyModule;

      const [owner, coOwner, member, rival, candidate, otherCandidate, admin] =
        await Promise.all([
          createUser("owner", "RECRUITER"),
          createUser("co-owner", "RECRUITER"),
          createUser("member", "RECRUITER"),
          createUser("rival", "RECRUITER"),
          createUser("candidate", "CANDIDATE"),
          createUser("candidate-2", "CANDIDATE"),
          createUser("admin", "ADMIN"),
        ]);
      ownerId = owner.id;
      coOwnerId = coOwner.id;
      memberId = member.id;
      rivalId = rival.id;
      candidateId = candidate.id;
      otherCandidateId = otherCandidate.id;
      adminId = admin.id;

      companyASlug = `${prefix}-company-a`;
      const [companyA, companyB] = await Promise.all([
        prisma.company.create({
          data: {
            name: `${prefix} Company A`,
            slug: companyASlug,
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
        }),
        prisma.company.create({
          data: {
            name: `${prefix} Company B`,
            slug: `${prefix}-company-b`,
            isPublished: true,
            memberships: { create: [{ userId: rivalId, role: "OWNER" }] },
          },
          select: { id: true },
        }),
      ]);
      companyAId = companyA.id;

      const jobA1 = await createJob(companyAId);
      jobA1Slug = jobA1.slug;
      const jobB1 = await createJob(companyB.id);
      jobB1Id = jobB1.id;
    });

    afterAll(async () => {
      if (!prisma) return;
      try {
        // Notification/outbox links to applications are SetNull, so clean them
        // by recipient prefix before the cascading company/user deletions.
        await prisma.emailOutbox.deleteMany({
          where: {
            OR: [
              { dedupeKey: { contains: prefix } },
              { recipientUserId: { startsWith: prefix } },
            ],
          },
        });
        await prisma.notification.deleteMany({
          where: {
            OR: [
              { recipientUserId: { startsWith: prefix } },
              { actorUserId: { startsWith: prefix } },
            ],
          },
        });
        await prisma.userEmailPreference.deleteMany({
          where: { userId: { startsWith: prefix } },
        });
        // Companies cascade jobs → applications → interviews → events.
        await prisma.company.deleteMany({
          where: { slug: { startsWith: prefix } },
        });
        await prisma.user.deleteMany({
          where: { id: { startsWith: prefix } },
        });
      } finally {
        await prisma.$disconnect();
      }
    });

    // -----------------------------------------------------------------------
    // Creation
    // -----------------------------------------------------------------------

    it("lets an OWNER schedule an interview atomically with event, notification, and outbox", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const slot = nextSlot();
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(slot, { instructions: "Bring questions." }),
      );

      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
        include: { events: true },
      });
      expect(interview.status).toBe("PENDING_RESPONSE");
      expect(interview.version).toBe(1);
      expect(interview.organizerUserId).toBe(ownerId);
      expect(interview.startAt).toEqual(slot.startAt);
      expect(interview.endAt).toEqual(slot.endAt);
      expect(interview.timeZone).toBe("Europe/Istanbul");
      expect(interview.candidateRespondedAt).toBeNull();

      expect(interview.events).toHaveLength(1);
      expect(interview.events[0]).toMatchObject({
        type: "CREATED",
        actorUserId: ownerId,
        fromStatus: null,
        toStatus: "PENDING_RESPONSE",
        timeZone: "Europe/Istanbul",
      });
      expect(interview.events[0].startAt).toEqual(slot.startAt);

      const notification = await prisma.notification.findFirstOrThrow({
        where: { applicationId: application.id, type: "INTERVIEW_SCHEDULED" },
      });
      expect(notification.recipientUserId).toBe(candidateId);
      expect(notification.href).toBe(`/candidate/interviews/${created.id}`);
      expect(notification.message).not.toContain("meet.example.test");

      const outbox = await prisma.emailOutbox.findFirstOrThrow({
        where: {
          applicationId: application.id,
          eventType: "INTERVIEW_SCHEDULED",
        },
      });
      expect(outbox.recipientUserId).toBe(candidateId);
      expect(outbox.status).toBe("PENDING");
      expect(outbox.destinationPath).toBe(
        `/candidate/interviews/${created.id}`,
      );
      expect(outbox.textBody).not.toContain("meet.example.test");
      expect(outbox.htmlBody).not.toContain("meet.example.test");
    });

    it("denies MEMBER, cross-company, Candidate, and Admin scheduling without leaking existence", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const before = await footprint(application.id);

      for (const [actor, code] of [
        [memberActor(), "NOT_FOUND"],
        [rivalActor(), "NOT_FOUND"],
        [candidateActor(), "FORBIDDEN"],
        [adminActor(), "FORBIDDEN"],
      ] as const) {
        try {
          await mutations.scheduleInterview(
            prisma,
            actor,
            application.id,
            makeSchedule(nextSlot()),
          );
          expect.unreachable("scheduling should have been rejected");
        } catch (error) {
          expectMutationError(error, code);
        }
      }
      expect(await footprint(application.id)).toEqual(before);
    });

    it("rejects scheduling for terminal applications", async () => {
      for (const status of ["HIRED", "REJECTED", "WITHDRAWN"] as const) {
        const job = await createJob(companyAId);
        const application = await createApplication(
          otherCandidateId,
          job.id,
          status,
        );
        try {
          await mutations.scheduleInterview(
            prisma,
            ownerActor(),
            application.id,
            makeSchedule(nextSlot()),
          );
          expect.unreachable("terminal application should reject scheduling");
        } catch (error) {
          expectMutationError(error, "NOT_ELIGIBLE");
        }
        expect(await footprint(application.id)).toEqual({
          interviews: 0,
          events: 0,
          notifications: 0,
          outbox: 0,
        });
      }
    });

    it("suppresses email for a disabled candidate preference while keeping the notification", async () => {
      await prisma.userEmailPreference.create({
        data: {
          userId: candidateId,
          eventType: "INTERVIEW_SCHEDULED",
          enabled: false,
        },
      });
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      const outbox = await prisma.emailOutbox.findFirstOrThrow({
        where: {
          applicationId: application.id,
          eventType: "INTERVIEW_SCHEDULED",
        },
      });
      expect(outbox.status).toBe("SUPPRESSED");
      expect(outbox.lastErrorCode).toBe("USER_PREFERENCE");
      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            recipientUserId: candidateId,
            type: "INTERVIEW_SCHEDULED",
          },
        }),
      ).toBe(1);

      await prisma.userEmailPreference.deleteMany({
        where: { userId: candidateId, eventType: "INTERVIEW_SCHEDULED" },
      });
      await prisma.interview.delete({ where: { id: created.id } });
    });

    // -----------------------------------------------------------------------
    // Conflict detection
    // -----------------------------------------------------------------------

    it("rejects overlapping active candidate interviews, even across companies", async () => {
      const slot = nextSlot();
      const jobA = await createJob(companyAId);
      const applicationA = await createApplication(candidateId, jobA.id);
      await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        applicationA.id,
        makeSchedule(slot),
      );

      // The same candidate's application at ANOTHER company, overlapping time.
      const applicationB = await createApplication(candidateId, jobB1Id);
      const overlap = {
        startAt: new Date(slot.startAt.getTime() + 30 * 60_000),
        endAt: new Date(slot.endAt.getTime() + 30 * 60_000),
      };
      try {
        await mutations.scheduleInterview(
          prisma,
          rivalActor(),
          applicationB.id,
          makeSchedule(overlap),
        );
        expect.unreachable("candidate conflict should reject");
      } catch (error) {
        expectMutationError(error, "CANDIDATE_CONFLICT");
      }
      expect(await footprint(applicationB.id)).toEqual({
        interviews: 0,
        events: 0,
        notifications: 0,
        outbox: 0,
      });
    });

    it("rejects overlapping active organizer interviews while another OWNER stays free", async () => {
      const slot = nextSlot();
      const jobA = await createJob(companyAId);
      const applicationA = await createApplication(candidateId, jobA.id);
      await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        applicationA.id,
        makeSchedule(slot),
      );

      const job = await createJob(companyAId);
      const applicationB = await createApplication(otherCandidateId, job.id);
      try {
        await mutations.scheduleInterview(
          prisma,
          ownerActor(),
          applicationB.id,
          makeSchedule(slot),
        );
        expect.unreachable("organizer conflict should reject");
      } catch (error) {
        expectMutationError(error, "ORGANIZER_CONFLICT");
      }

      // A different organizer with a free calendar can take the same window.
      const created = await mutations.scheduleInterview(
        prisma,
        coOwnerActor(),
        applicationB.id,
        makeSchedule(slot),
      );
      expect(created.id).toBeTruthy();
    });

    it("allows exactly adjacent interviews", async () => {
      const window = nextSlot(120);
      const first = {
        startAt: window.startAt,
        endAt: new Date(window.startAt.getTime() + 30 * 60_000),
      };
      const second = {
        startAt: first.endAt,
        endAt: new Date(first.endAt.getTime() + 30 * 60_000),
      };
      const job = await createJob(companyAId);
      const applicationA = await createApplication(candidateId, job.id);
      await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        applicationA.id,
        makeSchedule(first),
      );
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        applicationA.id,
        makeSchedule(second),
      );
      expect(created.id).toBeTruthy();
    });

    it("does not let CANCELED, DECLINED, or COMPLETED interviews block a slot", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const slot = nextSlot();

      // Terminal/declined interviews occupying the same window, seeded directly.
      await prisma.interview.createMany({
        data: (["CANCELED", "DECLINED", "COMPLETED"] as const).map(
          (status) => ({
            applicationId: application.id,
            organizerUserId: ownerId,
            title: `Blocked ${status}`,
            format: "VIDEO",
            status,
            startAt: slot.startAt,
            endAt: slot.endAt,
            timeZone: "UTC",
          }),
        ),
      });

      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(slot),
      );
      expect(created.id).toBeTruthy();
    });

    it("allows only one of two concurrent overlapping creations", async () => {
      const slot = nextSlot();
      const jobX = await createJob(companyAId);
      const jobY = await createJob(companyAId);
      const applicationX = await createApplication(candidateId, jobX.id);
      const applicationY = await createApplication(candidateId, jobY.id);

      // Different organizers so only the candidate window is contested.
      const results = await Promise.allSettled([
        mutations.scheduleInterview(
          prisma,
          ownerActor(),
          applicationX.id,
          makeSchedule(slot),
        ),
        mutations.scheduleInterview(
          prisma,
          coOwnerActor(),
          applicationY.id,
          makeSchedule(slot),
        ),
      ]);
      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const active = await prisma.interview.count({
        where: {
          application: { candidateId },
          status: { in: ["PENDING_RESPONSE", "ACCEPTED"] },
          startAt: { lt: slot.endAt },
          endAt: { gt: slot.startAt },
        },
      });
      expect(active).toBe(1);
    });

    // -----------------------------------------------------------------------
    // Candidate response
    // -----------------------------------------------------------------------

    it("lets the owning candidate accept and notifies every OWNER atomically", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      const result = await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        1,
        "ACCEPTED",
      );
      expect(result.status).toBe("ACCEPTED");

      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
      expect(interview.status).toBe("ACCEPTED");
      expect(interview.version).toBe(2);
      expect(interview.candidateRespondedAt).not.toBeNull();
      expect(interview.events.map((event) => event.type)).toEqual([
        "CREATED",
        "ACCEPTED",
      ]);

      const notifications = await prisma.notification.findMany({
        where: {
          applicationId: application.id,
          type: "INTERVIEW_RESPONSE_RECEIVED",
        },
        select: { recipientUserId: true, message: true, href: true },
      });
      expect(notifications.map((row) => row.recipientUserId).sort()).toEqual(
        [ownerId, coOwnerId].sort(),
      );
      expect(
        notifications.every(
          (row) => row.href === `/recruiter/interviews/${created.id}`,
        ),
      ).toBe(true);
      // Never the member, the candidate, the admin, or another company.
      expect(
        notifications.some((row) =>
          [memberId, candidateId, adminId, rivalId].includes(
            row.recipientUserId,
          ),
        ),
      ).toBe(false);

      const outbox = await prisma.emailOutbox.findMany({
        where: {
          applicationId: application.id,
          eventType: "INTERVIEW_RESPONSE_RECEIVED",
        },
        select: { recipientUserId: true, status: true },
      });
      expect(outbox.map((row) => row.recipientUserId).sort()).toEqual(
        [ownerId, coOwnerId].sort(),
      );
      expect(outbox.every((row) => row.status === "PENDING")).toBe(true);
    });

    it("lets the owning candidate decline a pending interview", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      const result = await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        1,
        "DECLINED",
      );
      expect(result.status).toBe("DECLINED");
      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(interview.status).toBe("DECLINED");
      expect(interview.version).toBe(2);
      expect(
        await prisma.interviewEvent.count({
          where: { interviewId: created.id, type: "DECLINED" },
        }),
      ).toBe(1);
    });

    it("denies responses from other candidates, recruiters, stale versions, and answered interviews", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      try {
        await mutations.respondToInterview(
          prisma,
          otherCandidateActor(),
          created.id,
          1,
          "ACCEPTED",
        );
        expect.unreachable("other candidate should be denied");
      } catch (error) {
        expectMutationError(error, "NOT_FOUND");
      }
      try {
        await mutations.respondToInterview(
          prisma,
          ownerActor(),
          created.id,
          1,
          "ACCEPTED",
        );
        expect.unreachable("recruiter role cannot use candidate responses");
      } catch (error) {
        expectMutationError(error, "FORBIDDEN");
      }

      await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        1,
        "ACCEPTED",
      );
      // Stale token after the version moved on.
      try {
        await mutations.respondToInterview(
          prisma,
          candidateActor(),
          created.id,
          1,
          "DECLINED",
        );
        expect.unreachable("stale version should be rejected");
      } catch (error) {
        expectMutationError(error, "STALE_VERSION");
      }
      // Fresh token, but the interview is already answered.
      try {
        await mutations.respondToInterview(
          prisma,
          candidateActor(),
          created.id,
          2,
          "DECLINED",
        );
        expect.unreachable("answered interview cannot be re-answered");
      } catch (error) {
        expectMutationError(error, "INVALID_TRANSITION");
      }
      expect(
        await prisma.interviewEvent.count({
          where: { interviewId: created.id },
        }),
      ).toBe(2);
    });

    it("lets exactly one of two concurrent responses win", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      const results = await Promise.allSettled([
        mutations.respondToInterview(
          prisma,
          candidateActor(),
          created.id,
          1,
          "ACCEPTED",
        ),
        mutations.respondToInterview(
          prisma,
          candidateActor(),
          created.id,
          1,
          "DECLINED",
        ),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(interview.version).toBe(2);
      expect(["ACCEPTED", "DECLINED"]).toContain(interview.status);
      expect(
        await prisma.interviewEvent.count({
          where: {
            interviewId: created.id,
            type: { in: ["ACCEPTED", "DECLINED"] },
          },
        }),
      ).toBe(1);
    });

    it("suppresses a disabled OWNER response preference while other OWNERs still get email", async () => {
      await prisma.userEmailPreference.create({
        data: {
          userId: coOwnerId,
          eventType: "INTERVIEW_RESPONSE_RECEIVED",
          enabled: false,
        },
      });
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );
      await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        1,
        "ACCEPTED",
      );

      const rows = await prisma.emailOutbox.findMany({
        where: {
          applicationId: application.id,
          eventType: "INTERVIEW_RESPONSE_RECEIVED",
        },
        select: { recipientUserId: true, status: true },
      });
      expect(
        rows.find((row) => row.recipientUserId === coOwnerId)?.status,
      ).toBe("SUPPRESSED");
      expect(rows.find((row) => row.recipientUserId === ownerId)?.status).toBe(
        "PENDING",
      );
      // In-app notifications are unaffected by email preferences.
      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            type: "INTERVIEW_RESPONSE_RECEIVED",
          },
        }),
      ).toBe(2);

      await prisma.userEmailPreference.deleteMany({
        where: { userId: coOwnerId },
      });
    });

    // -----------------------------------------------------------------------
    // Reschedule
    // -----------------------------------------------------------------------

    it("reschedules with a fresh pending cycle, new organizer, and preserved history", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );
      await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        1,
        "DECLINED",
      );

      const newSlot = nextSlot();
      await mutations.rescheduleInterview(
        prisma,
        coOwnerActor(),
        created.id,
        2,
        makeSchedule(newSlot, { title: "Rescheduled interview" }),
      );

      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
      expect(interview.status).toBe("PENDING_RESPONSE");
      expect(interview.version).toBe(3);
      expect(interview.candidateRespondedAt).toBeNull();
      expect(interview.organizerUserId).toBe(coOwnerId);
      expect(interview.title).toBe("Rescheduled interview");
      expect(interview.startAt).toEqual(newSlot.startAt);
      // Prior events remain immutable and in place.
      expect(interview.events.map((event) => event.type)).toEqual([
        "CREATED",
        "DECLINED",
        "RESCHEDULED",
      ]);
      const rescheduleEvent = interview.events[2];
      expect(rescheduleEvent.fromStatus).toBe("DECLINED");
      expect(rescheduleEvent.toStatus).toBe("PENDING_RESPONSE");
      expect(rescheduleEvent.startAt).toEqual(newSlot.startAt);

      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            recipientUserId: candidateId,
            type: "INTERVIEW_RESCHEDULED",
          },
        }),
      ).toBe(1);
      expect(
        await prisma.emailOutbox.count({
          where: {
            applicationId: application.id,
            recipientUserId: candidateId,
            eventType: "INTERVIEW_RESCHEDULED",
          },
        }),
      ).toBe(1);

      // The candidate can respond again to the new cycle.
      await mutations.respondToInterview(
        prisma,
        candidateActor(),
        created.id,
        3,
        "ACCEPTED",
      );
    });

    it("re-checks authorization, eligibility, conflicts, and versions on reschedule", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const firstSlot = nextSlot();
      const blocked = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(firstSlot),
      );
      const job2 = await createJob(companyAId);
      const application2 = await createApplication(candidateId, job2.id);
      const targetSlot = nextSlot();
      const target = await mutations.scheduleInterview(
        prisma,
        coOwnerActor(),
        application2.id,
        makeSchedule(targetSlot),
      );

      // MEMBER and cross-company recruiters cannot even see it.
      for (const actor of [memberActor(), rivalActor()]) {
        try {
          await mutations.rescheduleInterview(
            prisma,
            actor,
            target.id,
            1,
            makeSchedule(nextSlot()),
          );
          expect.unreachable("unauthorized reschedule should be rejected");
        } catch (error) {
          expectMutationError(error, "NOT_FOUND");
        }
      }

      // Conflict against the candidate's other active interview window.
      try {
        await mutations.rescheduleInterview(
          prisma,
          ownerActor(),
          target.id,
          1,
          makeSchedule(firstSlot),
        );
        expect.unreachable("conflicting reschedule should be rejected");
      } catch (error) {
        expectMutationError(error, "CANDIDATE_CONFLICT");
      }

      // Stale version.
      try {
        await mutations.rescheduleInterview(
          prisma,
          ownerActor(),
          target.id,
          99,
          makeSchedule(nextSlot()),
        );
        expect.unreachable("stale reschedule should be rejected");
      } catch (error) {
        expectMutationError(error, "STALE_VERSION");
      }

      // Terminal application blocks rescheduling but history remains.
      await prisma.jobApplication.update({
        where: { id: application2.id },
        data: { status: "WITHDRAWN" },
      });
      try {
        await mutations.rescheduleInterview(
          prisma,
          ownerActor(),
          target.id,
          1,
          makeSchedule(nextSlot()),
        );
        expect.unreachable("withdrawn application should block reschedule");
      } catch (error) {
        expectMutationError(error, "NOT_ELIGIBLE");
      }
      expect(await prisma.interview.count({ where: { id: target.id } })).toBe(
        1,
      );

      // Cleanup for later slots: cancel the blocking interview.
      await mutations.cancelInterview(prisma, ownerActor(), blocked.id, 1);
    });

    // -----------------------------------------------------------------------
    // Cancel
    // -----------------------------------------------------------------------

    it("cancels once, notifies the candidate, and never duplicates on replay", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      try {
        await mutations.cancelInterview(prisma, memberActor(), created.id, 1);
        expect.unreachable("MEMBER cannot cancel");
      } catch (error) {
        expectMutationError(error, "NOT_FOUND");
      }

      await mutations.cancelInterview(prisma, ownerActor(), created.id, 1);
      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(interview.status).toBe("CANCELED");
      expect(interview.version).toBe(2);
      expect(interview.canceledAt).not.toBeNull();

      // Replays: stale token, then fresh token on a terminal status.
      try {
        await mutations.cancelInterview(prisma, ownerActor(), created.id, 1);
        expect.unreachable("replayed cancel should be rejected");
      } catch (error) {
        expectMutationError(error, "STALE_VERSION");
      }
      try {
        await mutations.cancelInterview(prisma, ownerActor(), created.id, 2);
        expect.unreachable("terminal cancel should be rejected");
      } catch (error) {
        expectMutationError(error, "INVALID_TRANSITION");
      }

      expect(
        await prisma.interviewEvent.count({
          where: { interviewId: created.id, type: "CANCELED" },
        }),
      ).toBe(1);
      expect(
        await prisma.notification.count({
          where: {
            applicationId: application.id,
            type: "INTERVIEW_CANCELED",
          },
        }),
      ).toBe(1);
      expect(
        await prisma.emailOutbox.count({
          where: {
            applicationId: application.id,
            eventType: "INTERVIEW_CANCELED",
          },
        }),
      ).toBe(1);
      // Canceled interviews cannot be restored or completed.
      try {
        await mutations.completeInterview(prisma, ownerActor(), created.id, 2);
        expect.unreachable("canceled interview cannot complete");
      } catch (error) {
        expectMutationError(error, "INVALID_TRANSITION");
      }
    });

    // -----------------------------------------------------------------------
    // Complete
    // -----------------------------------------------------------------------

    it("completes only accepted interviews that have started, with no notification", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      // Started an hour ago; accepted. Seeded directly to age the schedule.
      const started = await prisma.interview.create({
        data: {
          applicationId: application.id,
          organizerUserId: ownerId,
          title: "Completed fixture",
          format: "PHONE",
          status: "ACCEPTED",
          startAt: new Date(Date.now() - 60 * 60_000),
          endAt: new Date(Date.now() - 30 * 60_000),
          timeZone: "UTC",
          candidateRespondedAt: new Date(),
        },
        select: { id: true },
      });

      await mutations.completeInterview(prisma, ownerActor(), started.id, 1);
      const interview = await prisma.interview.findUniqueOrThrow({
        where: { id: started.id },
      });
      expect(interview.status).toBe("COMPLETED");
      expect(interview.version).toBe(2);
      expect(interview.completedAt).not.toBeNull();
      expect(
        await prisma.interviewEvent.count({
          where: { interviewId: started.id, type: "COMPLETED" },
        }),
      ).toBe(1);
      // Completion sends nothing in this phase.
      expect(
        await prisma.notification.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);
      expect(
        await prisma.emailOutbox.count({
          where: { applicationId: application.id },
        }),
      ).toBe(0);

      // Far-future accepted interviews cannot be completed yet.
      const future = await prisma.interview.create({
        data: {
          applicationId: application.id,
          organizerUserId: ownerId,
          title: "Future fixture",
          format: "PHONE",
          status: "ACCEPTED",
          startAt: new Date(Date.now() + 2 * 60 * 60_000),
          endAt: new Date(Date.now() + 3 * 60 * 60_000),
          timeZone: "UTC",
        },
        select: { id: true },
      });
      try {
        await mutations.completeInterview(prisma, ownerActor(), future.id, 1);
        expect.unreachable("future interview cannot complete");
      } catch (error) {
        expectMutationError(error, "INVALID_TRANSITION");
      }

      // Pending and declined interviews cannot be completed either.
      const pending = await prisma.interview.create({
        data: {
          applicationId: application.id,
          organizerUserId: ownerId,
          title: "Pending fixture",
          format: "PHONE",
          status: "PENDING_RESPONSE",
          startAt: new Date(Date.now() - 2 * 60 * 60_000),
          endAt: new Date(Date.now() - 60 * 60_000),
          timeZone: "UTC",
        },
        select: { id: true },
      });
      for (const [id, status] of [
        [pending.id, "PENDING_RESPONSE"],
        [pending.id, "DECLINED"],
      ] as const) {
        await prisma.interview.update({ where: { id }, data: { status } });
        try {
          await mutations.completeInterview(prisma, ownerActor(), id, 1);
          expect.unreachable(`${status} interview cannot complete`);
        } catch (error) {
          expectMutationError(error, "INVALID_TRANSITION");
        }
      }
    });

    // -----------------------------------------------------------------------
    // Reads, privacy, and retention
    // -----------------------------------------------------------------------

    it("scopes candidate reads to the owning candidate", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      const own = await data.getCandidateInterview(
        prisma,
        candidateId,
        created.id,
      );
      expect(own?.id).toBe(created.id);
      expect(own?.events.length).toBeGreaterThan(0);
      // Explicit projection: application exposes id/status/job only — no
      // notes, no outbox, no membership or dedupe data.
      expect(Object.keys(own?.application ?? {}).sort()).toEqual([
        "id",
        "job",
        "status",
      ]);

      // Possessing the notification (and its href/id) grants nothing to
      // another candidate.
      expect(
        await data.getCandidateInterview(prisma, otherCandidateId, created.id),
      ).toBeNull();

      const agenda = await data.getCandidateInterviews(
        prisma,
        otherCandidateId,
        new Date(),
      );
      expect(
        agenda.upcoming.some((interview) => interview.id === created.id),
      ).toBe(false);
    });

    it("scopes recruiter reads to OWNER membership only", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );

      expect(
        (await data.getRecruiterInterview(prisma, ownerId, created.id))?.id,
      ).toBe(created.id);
      // MEMBER, cross-company, admin: nothing — the email/notification href
      // (interview id) grants no access either.
      expect(
        await data.getRecruiterInterview(prisma, memberId, created.id),
      ).toBeNull();
      expect(
        await data.getRecruiterInterview(prisma, rivalId, created.id),
      ).toBeNull();
      expect(
        await data.getRecruiterInterview(prisma, adminId, created.id),
      ).toBeNull();

      const memberAgenda = await data.getRecruiterInterviews(
        prisma,
        memberId,
        new Date(),
      );
      expect(memberAgenda.upcoming).toHaveLength(0);
      expect(memberAgenda.past).toHaveLength(0);
      expect(memberAgenda.pendingResponseCount).toBe(0);
    });

    it("exposes no interview data through public job and company reads", async () => {
      const publicJob = await jobsData.getPublishedJobBySlug(prisma, jobA1Slug);
      expect(publicJob).not.toBeNull();
      const serializedJob = JSON.stringify(publicJob);
      expect(serializedJob).not.toContain("interview");
      expect(serializedJob).not.toContain("meet.example.test");

      const publicCompany = await companyData.getPublishedCompanyBySlug(
        prisma,
        companyASlug,
      );
      expect(publicCompany).not.toBeNull();
      const serializedCompany = JSON.stringify(publicCompany);
      expect(serializedCompany).not.toContain("interview");
      expect(serializedCompany).not.toContain("meet.example.test");
    });

    it("keeps interview history readable after the application terminates", async () => {
      const job = await createJob(companyAId);
      const application = await createApplication(candidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        ownerActor(),
        application.id,
        makeSchedule(nextSlot()),
      );
      await prisma.jobApplication.update({
        where: { id: application.id },
        data: { status: "WITHDRAWN" },
      });

      expect(
        (await data.getCandidateInterview(prisma, candidateId, created.id))?.id,
      ).toBe(created.id);
      expect(
        (await data.getRecruiterInterview(prisma, ownerId, created.id))?.id,
      ).toBe(created.id);
      expect(
        await prisma.interviewEvent.count({
          where: { interviewId: created.id },
        }),
      ).toBeGreaterThan(0);
    });

    it("revokes recruiter interview access when ownership is removed", async () => {
      const tempOwner = await createUser("temp-owner", "RECRUITER");
      const company = await prisma.company.create({
        data: {
          name: `${prefix} Company C`,
          slug: `${prefix}-company-c`,
          isPublished: true,
          memberships: { create: [{ userId: tempOwner.id, role: "OWNER" }] },
        },
        select: { id: true },
      });
      const job = await createJob(company.id);
      const application = await createApplication(otherCandidateId, job.id);
      const created = await mutations.scheduleInterview(
        prisma,
        { userId: tempOwner.id, role: "RECRUITER" },
        application.id,
        makeSchedule(nextSlot()),
      );
      expect(
        (await data.getRecruiterInterview(prisma, tempOwner.id, created.id))
          ?.id,
      ).toBe(created.id);

      await prisma.companyMembership.updateMany({
        where: { companyId: company.id, userId: tempOwner.id },
        data: { role: "MEMBER" },
      });

      expect(
        await data.getRecruiterInterview(prisma, tempOwner.id, created.id),
      ).toBeNull();
      try {
        await mutations.cancelInterview(
          prisma,
          { userId: tempOwner.id, role: "RECRUITER" },
          created.id,
          1,
        );
        expect.unreachable("demoted owner cannot manage interviews");
      } catch (error) {
        expectMutationError(error, "NOT_FOUND");
      }
    });
  },
);
