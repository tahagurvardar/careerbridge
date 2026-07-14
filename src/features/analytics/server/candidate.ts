import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { RouteLocale } from "@/i18n/config";
import {
  countActiveApplications,
  countTerminalApplications,
  createTrendBuckets,
  zeroFillTrendBuckets,
  type AnalyticsDateRange,
  type FunnelResult,
  type StatusDistributionItem,
  type TrendPoint,
} from "@/features/analytics/analytics";
import {
  AnalyticsAccessError,
  candidateApplicationScope,
  countRecord,
  createdAtWhere,
  queryApplicationFunnel,
  queryScopedApplicationTrend,
  queryScopedApplicationTrendEarliest,
  type AnalyticsActor,
} from "@/features/analytics/server/queries";
import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";

export interface CandidateAnalyticsResult {
  range: AnalyticsDateRange;
  summary: {
    applicationsCreatedInRange: number;
    activeApplications: number;
    terminalApplications: number;
    reachedInterview: number;
    reachedOffer: number;
    hired: number;
    rejected: number;
    withdrawn: number;
    interviewsCreatedInRange: number;
    upcomingInterviews: number;
    completedInterviews: number;
    savedJobs: number;
  };
  currentApplicationDistribution: StatusDistributionItem<ApplicationStatusValue>[];
  funnel: FunnelResult;
  applicationTrend: TrendPoint[];
}

async function assertActiveCandidate(
  prisma: PrismaClient,
  actor: AnalyticsActor,
): Promise<void> {
  if (actor.role !== "CANDIDATE" || actor.accountStatus !== "ACTIVE") {
    throw new AnalyticsAccessError();
  }
  const activeCandidate = await prisma.user.count({
    where: { id: actor.userId, role: "CANDIDATE", accountStatus: "ACTIVE" },
  });
  if (activeCandidate !== 1) throw new AnalyticsAccessError();
}

export async function getCandidateAnalytics(
  prisma: PrismaClient,
  actor: AnalyticsActor,
  range: AnalyticsDateRange,
  now = range.endAt,
  locale: RouteLocale = "en",
): Promise<CandidateAnalyticsResult> {
  await assertActiveCandidate(prisma, actor);

  const scope = candidateApplicationScope(actor.userId);
  const earliestAt =
    range.preset === "ALL"
      ? await queryScopedApplicationTrendEarliest(prisma, scope)
      : range.startAt;
  const buckets = createTrendBuckets(range, earliestAt, locale);
  const createdRange = createdAtWhere(range);
  const applicationWhere = { candidateId: actor.userId } as const;
  const interviewScope = { application: applicationWhere } as const;

  const [
    applicationsCreatedInRange,
    applicationStatusRows,
    funnel,
    trendRows,
    interviewsCreatedInRange,
    upcomingInterviews,
    completedInterviews,
    savedJobs,
  ] = await Promise.all([
    prisma.jobApplication.count({
      where: { ...applicationWhere, createdAt: createdRange },
    }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      where: applicationWhere,
      _count: { _all: true },
    }),
    queryApplicationFunnel(prisma, scope, range),
    queryScopedApplicationTrend(prisma, scope, buckets),
    prisma.interview.count({
      where: { ...interviewScope, createdAt: createdRange },
    }),
    prisma.interview.count({
      where: {
        ...interviewScope,
        status: { in: ["PENDING_RESPONSE", "ACCEPTED"] },
        endAt: { gte: now },
      },
    }),
    prisma.interview.count({
      where: { ...interviewScope, status: "COMPLETED" },
    }),
    prisma.savedJob.count({ where: { candidateId: actor.userId } }),
  ]);

  const statusCounts = countRecord(
    APPLICATION_STATUSES,
    applicationStatusRows.map((row) => ({
      status: row.status,
      _count: row._count,
    })),
  );
  const reached = Object.fromEntries(
    funnel.stages.map((item) => [item.stage, item.reached]),
  ) as Record<
    "SUBMITTED" | "UNDER_REVIEW" | "INTERVIEW" | "OFFER" | "HIRED",
    number
  >;

  return {
    range,
    summary: {
      applicationsCreatedInRange,
      activeApplications: countActiveApplications(statusCounts),
      terminalApplications: countTerminalApplications(statusCounts),
      reachedInterview: reached.INTERVIEW,
      reachedOffer: reached.OFFER,
      hired: reached.HIRED,
      rejected: funnel.exits.REJECTED,
      withdrawn: funnel.exits.WITHDRAWN,
      interviewsCreatedInRange,
      upcomingInterviews,
      completedInterviews,
      savedJobs,
    },
    currentApplicationDistribution: APPLICATION_STATUSES.map((status) => ({
      status,
      label: applicationStatusLabels[status],
      count: statusCounts[status],
    })),
    funnel,
    applicationTrend: zeroFillTrendBuckets(buckets, trendRows),
  };
}
