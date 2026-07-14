import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const prefix = `cb-p6b-${Date.now()}-${randomBytes(4).toString("hex")}`;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = enabled ? describe.sequential : describe.skip;

let prisma: PrismaClient;
let adminAnalytics: typeof import("@/features/analytics/server/admin");
let recruiterAnalytics: typeof import("@/features/analytics/server/recruiter");
let candidateAnalytics: typeof import("@/features/analytics/server/candidate");
let analyticsDomain: typeof import("@/features/analytics/analytics");
let analyticsSchemas: typeof import("@/features/analytics/schemas");

const referenceNow = new Date("2026-07-14T18:25:30.000Z");
const daysAgo = (days: number) =>
  new Date(referenceNow.getTime() - days * 24 * 60 * 60 * 1000);

let adminId: string;
let suspendedAdminId: string;
let ownerId: string;
let memberId: string;
let rivalId: string;
let candidateAId: string;
let candidateBId: string;
let candidateStartId: string;
let candidateEndId: string;
let companyAId: string;
let companyBId: string;
let companyCId: string;
let jobA1Id: string;
let jobA2Id: string;
let jobA3Id: string;
let jobB1Id: string;
let appA1Id: string;
let appA2Id: string;
let appA3Id: string;
let appStartId: string;
let appEndId: string;
let appB1Id: string;

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

function actor(
  userId: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN",
  accountStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE",
) {
  return { userId, role, accountStatus } as const;
}

async function createUser(
  label: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN",
  accountStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE",
) {
  return prisma.user.create({
    data: {
      id: `${prefix}-${label}`,
      name: `${label} Synthetic User`,
      email: `${prefix}-${label}@example.test`,
      role,
      accountStatus,
      suspendedAt: accountStatus === "SUSPENDED" ? referenceNow : null,
    },
    select: { id: true },
  });
}

async function addHistory(
  applicationId: string,
  statuses: (
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "INTERVIEW"
    | "OFFER"
    | "HIRED"
    | "REJECTED"
    | "WITHDRAWN"
  )[],
) {
  await prisma.applicationStatusHistory.createMany({
    data: statuses.map((toStatus, index) => ({
      applicationId,
      fromStatus: index === 0 ? null : statuses[index - 1],
      toStatus,
      createdAt: new Date(daysAgo(9).getTime() + index * 60_000),
    })),
  });
}

databaseDescribe(
  enabled
    ? "Phase 6B analytics database boundaries"
    : "Phase 6B analytics database boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [
        prismaModule,
        adminModule,
        recruiterModule,
        candidateModule,
        domain,
        schemas,
      ] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/analytics/server/admin"),
        import("@/features/analytics/server/recruiter"),
        import("@/features/analytics/server/candidate"),
        import("@/features/analytics/analytics"),
        import("@/features/analytics/schemas"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(testDatabaseUrl());
      adminAnalytics = adminModule;
      recruiterAnalytics = recruiterModule;
      candidateAnalytics = candidateModule;
      analyticsDomain = domain;
      analyticsSchemas = schemas;

      const [
        admin,
        suspendedAdmin,
        owner,
        member,
        rival,
        candidateA,
        candidateB,
        candidateStart,
        candidateEnd,
      ] = await Promise.all([
        createUser("admin", "ADMIN"),
        createUser("suspended-admin", "ADMIN", "SUSPENDED"),
        createUser("owner", "RECRUITER"),
        createUser("member", "RECRUITER"),
        createUser("rival", "RECRUITER"),
        createUser("candidate-a", "CANDIDATE"),
        createUser("candidate-b", "CANDIDATE"),
        createUser("candidate-start", "CANDIDATE"),
        createUser("candidate-end", "CANDIDATE"),
      ]);
      adminId = admin.id;
      suspendedAdminId = suspendedAdmin.id;
      ownerId = owner.id;
      memberId = member.id;
      rivalId = rival.id;
      candidateAId = candidateA.id;
      candidateBId = candidateB.id;
      candidateStartId = candidateStart.id;
      candidateEndId = candidateEnd.id;

      const [companyA, companyB, companyC] = await Promise.all([
        prisma.company.create({
          data: {
            name: `${prefix} Company A`,
            slug: `${prefix}-company-a`,
            isPublished: true,
          },
          select: { id: true },
        }),
        prisma.company.create({
          data: {
            name: `${prefix} Company B`,
            slug: `${prefix}-company-b`,
            isPublished: true,
          },
          select: { id: true },
        }),
        prisma.company.create({
          data: {
            name: `${prefix} Hidden Company C`,
            slug: `${prefix}-company-c`,
            isPublished: true,
            moderationStatus: "HIDDEN",
            moderatedAt: referenceNow,
          },
          select: { id: true },
        }),
      ]);
      companyAId = companyA.id;
      companyBId = companyB.id;
      companyCId = companyC.id;

      await prisma.companyMembership.createMany({
        data: [
          { userId: ownerId, companyId: companyAId, role: "OWNER" },
          { userId: ownerId, companyId: companyCId, role: "OWNER" },
          { userId: memberId, companyId: companyAId, role: "MEMBER" },
          { userId: rivalId, companyId: companyBId, role: "OWNER" },
        ],
      });

      const [jobA1, jobA2, jobA3, jobB1] = await Promise.all([
        prisma.job.create({
          data: {
            companyId: companyAId,
            title: `${prefix} Public Role A1`,
            slug: `${prefix}-role-a1`,
            status: "PUBLISHED",
            publishedAt: daysAgo(60),
            createdAt: daysAgo(60),
          },
          select: { id: true },
        }),
        prisma.job.create({
          data: {
            companyId: companyAId,
            title: `${prefix} Hidden Role A2`,
            slug: `${prefix}-role-a2`,
            status: "CLOSED",
            moderationStatus: "HIDDEN",
            moderatedAt: referenceNow,
            createdAt: daysAgo(140),
          },
          select: { id: true },
        }),
        prisma.job.create({
          data: {
            companyId: companyAId,
            title: `${prefix} Public Role A3`,
            slug: `${prefix}-role-a3`,
            status: "PUBLISHED",
            publishedAt: daysAgo(20),
            createdAt: daysAgo(20),
          },
          select: { id: true },
        }),
        prisma.job.create({
          data: {
            companyId: companyBId,
            title: `${prefix} Rival Role B1`,
            slug: `${prefix}-role-b1`,
            status: "PUBLISHED",
            publishedAt: daysAgo(30),
            createdAt: daysAgo(30),
          },
          select: { id: true },
        }),
      ]);
      jobA1Id = jobA1.id;
      jobA2Id = jobA2.id;
      jobA3Id = jobA3.id;
      jobB1Id = jobB1.id;

      const range30 = analyticsDomain.resolveAnalyticsDateRange(
        "30D",
        referenceNow,
      );
      const [appA1, appA2, appA3, appStart, appEnd, appB1] = await Promise.all([
        prisma.jobApplication.create({
          data: {
            candidateId: candidateAId,
            jobId: jobA1Id,
            status: "HIRED",
            createdAt: daysAgo(10),
            submittedAt: daysAgo(10),
          },
          select: { id: true },
        }),
        prisma.jobApplication.create({
          data: {
            candidateId: candidateBId,
            jobId: jobA2Id,
            status: "REJECTED",
            createdAt: daysAgo(40),
            submittedAt: daysAgo(40),
          },
          select: { id: true },
        }),
        prisma.jobApplication.create({
          data: {
            candidateId: candidateAId,
            jobId: jobA2Id,
            status: "WITHDRAWN",
            createdAt: daysAgo(100),
            submittedAt: daysAgo(100),
            withdrawnAt: daysAgo(95),
          },
          select: { id: true },
        }),
        prisma.jobApplication.create({
          data: {
            candidateId: candidateStartId,
            jobId: jobA3Id,
            status: "SUBMITTED",
            createdAt: range30.startAt!,
            submittedAt: range30.startAt!,
          },
          select: { id: true },
        }),
        prisma.jobApplication.create({
          data: {
            candidateId: candidateEndId,
            jobId: jobA3Id,
            status: "SUBMITTED",
            createdAt: referenceNow,
            submittedAt: referenceNow,
          },
          select: { id: true },
        }),
        prisma.jobApplication.create({
          data: {
            candidateId: candidateAId,
            jobId: jobB1Id,
            status: "OFFER",
            createdAt: daysAgo(20),
            submittedAt: daysAgo(20),
          },
          select: { id: true },
        }),
      ]);
      appA1Id = appA1.id;
      appA2Id = appA2.id;
      appA3Id = appA3.id;
      appStartId = appStart.id;
      appEndId = appEnd.id;
      appB1Id = appB1.id;

      await Promise.all([
        addHistory(appA1Id, [
          "SUBMITTED",
          "UNDER_REVIEW",
          "INTERVIEW",
          "INTERVIEW",
          "OFFER",
          "HIRED",
        ]),
        addHistory(appA2Id, ["SUBMITTED", "UNDER_REVIEW", "REJECTED"]),
        addHistory(appA3Id, ["SUBMITTED", "UNDER_REVIEW", "WITHDRAWN"]),
        addHistory(appStartId, ["SUBMITTED"]),
        addHistory(appEndId, ["SUBMITTED"]),
        addHistory(appB1Id, [
          "SUBMITTED",
          "UNDER_REVIEW",
          "INTERVIEW",
          "OFFER",
        ]),
      ]);

      await Promise.all([
        prisma.interview.create({
          data: {
            applicationId: appA1Id,
            organizerUserId: ownerId,
            title: `${prefix} Completed meeting A1`,
            format: "VIDEO",
            status: "COMPLETED",
            startAt: daysAgo(7),
            endAt: new Date(daysAgo(7).getTime() + 60 * 60 * 1000),
            timeZone: "Asia/Baku",
            completedAt: daysAgo(7),
            createdAt: daysAgo(8),
          },
        }),
        prisma.interview.create({
          data: {
            applicationId: appA3Id,
            organizerUserId: ownerId,
            title: `${prefix} Historical hidden meeting`,
            format: "PHONE",
            status: "COMPLETED",
            startAt: daysAgo(94),
            endAt: new Date(daysAgo(94).getTime() + 30 * 60 * 1000),
            timeZone: "UTC",
            completedAt: daysAgo(94),
            createdAt: daysAgo(95),
          },
        }),
        prisma.interview.create({
          data: {
            applicationId: appB1Id,
            organizerUserId: rivalId,
            title: `${prefix} Upcoming rival meeting`,
            format: "VIDEO",
            status: "ACCEPTED",
            startAt: new Date(referenceNow.getTime() + 2 * 24 * 60 * 60 * 1000),
            endAt: new Date(
              referenceNow.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
            ),
            timeZone: "Asia/Baku",
            candidateRespondedAt: daysAgo(1),
            createdAt: daysAgo(2),
          },
        }),
      ]);

      await prisma.savedJob.createMany({
        data: [
          { candidateId: candidateAId, jobId: jobA1Id },
          { candidateId: candidateAId, jobId: jobB1Id },
        ],
      });

      await prisma.adminAuditEvent.create({
        data: {
          actorAdminUserId: adminId,
          targetJobId: jobA2Id,
          action: "JOB_HIDDEN",
          reasonCode: "POLICY_VIOLATION",
          reasonNote: `${prefix} private moderation reason`,
        },
      });
    }, 60_000);

    afterAll(async () => {
      if (!prisma) return;
      await prisma.company.deleteMany({
        where: { slug: { startsWith: prefix } },
      });
      await prisma.user.deleteMany({
        where: { email: { startsWith: prefix } },
      });
      await prisma.$disconnect();
    });

    it("allows only a current active Admin and returns accurate platform aggregates", async () => {
      const range = analyticsDomain.resolveAnalyticsDateRange(
        "90D",
        referenceNow,
      );
      const result = await adminAnalytics.getAdminAnalytics(
        prisma,
        actor(adminId, "ADMIN"),
        range,
      );
      expect(result.users.total).toBe(await prisma.user.count());
      expect(result.companies.total).toBe(await prisma.company.count());
      expect(result.jobs.total).toBe(await prisma.job.count());
      expect(result.applications.createdInRange).toBe(
        await prisma.jobApplication.count({
          where: { createdAt: { gte: range.startAt!, lt: range.endAt } },
        }),
      );
      expect(result.interviews.createdInRange).toBe(
        await prisma.interview.count({
          where: { createdAt: { gte: range.startAt!, lt: range.endAt } },
        }),
      );
      expect(result.companies.moderationHidden).toBeGreaterThanOrEqual(1);
      expect(result.jobs.moderationHidden).toBeGreaterThanOrEqual(1);
      expect(result.trends.applications.length).toBeLessThanOrEqual(120);
    });

    it("denies Candidate, Recruiter, suspended Admin, and unknown Admin actors", async () => {
      const range = analyticsDomain.resolveAnalyticsDateRange(
        "90D",
        referenceNow,
      );
      await expect(
        adminAnalytics.getAdminAnalytics(
          prisma,
          actor(candidateAId, "CANDIDATE"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        adminAnalytics.getAdminAnalytics(
          prisma,
          actor(ownerId, "RECRUITER"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        adminAnalytics.getAdminAnalytics(
          prisma,
          actor(suspendedAdminId, "ADMIN", "SUSPENDED"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        adminAnalytics.getAdminAnalytics(
          prisma,
          actor(`${prefix}-signed-out`, "ADMIN"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
    });

    it("returns no private content in Admin analytics", async () => {
      const result = await adminAnalytics.getAdminAnalytics(
        prisma,
        actor(adminId, "ADMIN"),
        analyticsDomain.resolveAnalyticsDateRange("90D", referenceNow),
      );
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(`${prefix}-candidate-a@example.test`);
      expect(serialized).not.toContain("private moderation reason");
      expect(serialized).not.toContain("meetingUrl");
      expect(serialized).not.toContain("coverLetter");
      expect(serialized).not.toContain("dedupeKey");
    });

    it("gives an OWNER accurate Company analytics with unique funnel reach", async () => {
      const range = analyticsDomain.resolveAnalyticsDateRange(
        "90D",
        referenceNow,
      );
      const result = await recruiterAnalytics.getRecruiterAnalytics(
        prisma,
        actor(ownerId, "RECRUITER"),
        analyticsSchemas.parseRecruiterAnalyticsSearch({
          range: "90D",
          companyId: companyAId,
        }),
        range,
      );
      expect(result.kind).toBe("READY");
      if (result.kind !== "READY") return;
      expect(result.summary.applicationsCreatedInRange).toBe(3);
      expect(result.summary.activeApplications).toBe(2);
      expect(result.summary.reachedInterview).toBe(1);
      expect(result.summary.reachedOffer).toBe(1);
      expect(result.summary.reachedHire).toBe(1);
      expect(result.summary.publishedJobs).toBe(2);
      expect(result.summary.interviewsCreatedInRange).toBe(1);
      expect(result.summary.completedInterviews).toBe(2);
      expect(result.funnel.stages.map((stage) => stage.reached)).toEqual([
        3, 2, 1, 1, 1,
      ]);
      expect(result.funnel.exits.REJECTED).toBe(1);
      expect(
        result.applicationTrend.reduce((sum, point) => sum + point.value, 0),
      ).toBe(3);
    });

    it("keeps hidden authorized Jobs private-visible without reason or Candidate identity", async () => {
      const result = await recruiterAnalytics.getRecruiterAnalytics(
        prisma,
        actor(ownerId, "RECRUITER"),
        analyticsSchemas.parseRecruiterAnalyticsSearch({
          range: "ALL",
          companyId: companyAId,
        }),
        analyticsDomain.resolveAnalyticsDateRange("ALL", referenceNow),
      );
      expect(result.kind).toBe("READY");
      if (result.kind !== "READY") return;
      expect(
        result.jobPerformance.find((job) => job.jobId === jobA2Id),
      ).toMatchObject({
        moderationStatus: "HIDDEN",
        title: `${prefix} Hidden Role A2`,
      });
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("private moderation reason");
      expect(serialized).not.toContain(`${prefix}-candidate-a@example.test`);
      expect(serialized).not.toContain("Synthetic User");
      expect(serialized).not.toContain("candidateId");
      expect(result.jobPerformance.length).toBeLessThanOrEqual(
        recruiterAnalytics.MAX_JOB_PERFORMANCE_RESULTS,
      );
    });

    it("supports multiple owned Companies without crossing the selected scope", async () => {
      const result = await recruiterAnalytics.getRecruiterAnalytics(
        prisma,
        actor(ownerId, "RECRUITER"),
        analyticsSchemas.parseRecruiterAnalyticsSearch({
          range: "ALL",
          companyId: companyCId,
        }),
        analyticsDomain.resolveAnalyticsDateRange("ALL", referenceNow),
      );
      expect(result.kind).toBe("READY");
      if (result.kind !== "READY") return;
      expect(result.companies).toHaveLength(2);
      expect(result.selectedCompany.id).toBe(companyCId);
      expect(result.summary.applicationsCreatedInRange).toBe(0);
      expect(result.jobPerformance).toEqual([]);
    });

    it("denies MEMBER, cross-Company, invalid Company, and Job filter escape", async () => {
      const range = analyticsDomain.resolveAnalyticsDateRange(
        "90D",
        referenceNow,
      );
      const member = await recruiterAnalytics.getRecruiterAnalytics(
        prisma,
        actor(memberId, "RECRUITER"),
        analyticsSchemas.parseRecruiterAnalyticsSearch({ range: "90D" }),
        range,
      );
      expect(member.kind).toBe("OWNER_REQUIRED");
      await expect(
        recruiterAnalytics.getRecruiterAnalytics(
          prisma,
          actor(memberId, "RECRUITER"),
          analyticsSchemas.parseRecruiterAnalyticsSearch({
            companyId: companyAId,
          }),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        recruiterAnalytics.getRecruiterAnalytics(
          prisma,
          actor(rivalId, "RECRUITER"),
          analyticsSchemas.parseRecruiterAnalyticsSearch({
            companyId: companyAId,
          }),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        recruiterAnalytics.getRecruiterAnalytics(
          prisma,
          actor(ownerId, "RECRUITER"),
          analyticsSchemas.parseRecruiterAnalyticsSearch({
            companyId: `${prefix}-unknown`,
          }),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        recruiterAnalytics.getRecruiterAnalytics(
          prisma,
          actor(ownerId, "RECRUITER"),
          analyticsSchemas.parseRecruiterAnalyticsSearch({
            companyId: companyAId,
            jobId: jobB1Id,
          }),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
    });

    it("returns only the Candidate's own current and cohort metrics", async () => {
      const result = await candidateAnalytics.getCandidateAnalytics(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        analyticsDomain.resolveAnalyticsDateRange("90D", referenceNow),
        referenceNow,
      );
      expect(result.summary.applicationsCreatedInRange).toBe(2);
      expect(result.summary.activeApplications).toBe(1);
      expect(result.summary.terminalApplications).toBe(2);
      expect(result.summary.reachedInterview).toBe(2);
      expect(result.summary.reachedOffer).toBe(2);
      expect(result.summary.hired).toBe(1);
      expect(result.summary.interviewsCreatedInRange).toBe(2);
      expect(result.summary.upcomingInterviews).toBe(1);
      expect(result.summary.completedInterviews).toBe(2);
      expect(result.summary.savedJobs).toBe(2);
      expect(result.currentApplicationDistribution).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: "HIRED", count: 1 }),
          expect.objectContaining({ status: "WITHDRAWN", count: 1 }),
          expect.objectContaining({ status: "OFFER", count: 1 }),
          expect.objectContaining({ status: "REJECTED", count: 0 }),
        ]),
      );
      expect(
        result.applicationTrend.reduce((sum, point) => sum + point.value, 0),
      ).toBe(2);
    });

    it("includes hidden historical outcomes without exposing moderation details", async () => {
      const result = await candidateAnalytics.getCandidateAnalytics(
        prisma,
        actor(candidateAId, "CANDIDATE"),
        analyticsDomain.resolveAnalyticsDateRange("ALL", referenceNow),
        referenceNow,
      );
      expect(result.summary.applicationsCreatedInRange).toBe(3);
      expect(result.summary.withdrawn).toBe(1);
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("moderation");
      expect(serialized).not.toContain("private moderation reason");
      expect(serialized).not.toContain("meetingUrl");
      expect(serialized).not.toContain("note");
    });

    it("denies Recruiter, Admin, another Candidate, and a missing Candidate actor", async () => {
      const range = analyticsDomain.resolveAnalyticsDateRange(
        "90D",
        referenceNow,
      );
      await expect(
        candidateAnalytics.getCandidateAnalytics(
          prisma,
          actor(ownerId, "RECRUITER"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      await expect(
        candidateAnalytics.getCandidateAnalytics(
          prisma,
          actor(adminId, "ADMIN"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
      const other = await candidateAnalytics.getCandidateAnalytics(
        prisma,
        actor(candidateBId, "CANDIDATE"),
        range,
      );
      expect(other.summary.hired).toBe(0);
      expect(JSON.stringify(other)).not.toContain(appA1Id);
      await expect(
        candidateAnalytics.getCandidateAnalytics(
          prisma,
          actor(`${prefix}-signed-out`, "CANDIDATE"),
          range,
        ),
      ).rejects.toThrow("Analytics are unavailable");
    });

    it("applies 30D, 90D, ALL, inclusive start, exclusive end, and lifetime progression", async () => {
      const expected = { "30D": 3, "90D": 4, ALL: 5 } as const;
      for (const preset of ["30D", "90D", "ALL"] as const) {
        const result = await adminAnalytics.getAdminAnalytics(
          prisma,
          actor(adminId, "ADMIN"),
          analyticsDomain.resolveAnalyticsDateRange(preset, referenceNow),
        );
        const fixtureApplications =
          result.applications.createdInRange -
          (await prisma.jobApplication.count({
            where: {
              id: {
                notIn: [
                  appA1Id,
                  appA2Id,
                  appA3Id,
                  appStartId,
                  appEndId,
                  appB1Id,
                ],
              },
              createdAt: {
                ...(result.range.startAt ? { gte: result.range.startAt } : {}),
                lt: result.range.endAt,
              },
            },
          }));
        expect(fixtureApplications).toBe(expected[preset]);
      }

      const range30 = analyticsDomain.resolveAnalyticsDateRange(
        "30D",
        referenceNow,
      );
      expect(range30.startAt).not.toBeNull();
      const owner = await recruiterAnalytics.getRecruiterAnalytics(
        prisma,
        actor(ownerId, "RECRUITER"),
        analyticsSchemas.parseRecruiterAnalyticsSearch({
          range: "30D",
          companyId: companyAId,
        }),
        range30,
      );
      expect(owner.kind).toBe("READY");
      if (owner.kind === "READY") {
        expect(owner.summary.applicationsCreatedInRange).toBe(2);
        expect(owner.funnel.stages[0].reached).toBe(2);
        expect(
          owner.funnel.stages.find((stage) => stage.stage === "HIRED")?.reached,
        ).toBe(1);
      }
    });

    it("removes analytics access immediately after OWNER membership removal", async () => {
      await prisma.companyMembership.delete({
        where: { userId_companyId: { userId: ownerId, companyId: companyAId } },
      });
      await expect(
        recruiterAnalytics.getRecruiterAnalytics(
          prisma,
          actor(ownerId, "RECRUITER"),
          analyticsSchemas.parseRecruiterAnalyticsSearch({
            range: "90D",
            companyId: companyAId,
          }),
          analyticsDomain.resolveAnalyticsDateRange("90D", referenceNow),
        ),
      ).rejects.toThrow("Analytics are unavailable");
    });
  },
);
