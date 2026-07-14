import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { RouteLocale } from "@/i18n/config";
import {
  calculateConversion,
  countActiveApplications,
  createTrendBuckets,
  zeroFillTrendBuckets,
  type AnalyticsDateRange,
  type FunnelResult,
  type StatusDistributionItem,
  type TrendPoint,
} from "@/features/analytics/analytics";
import type { RecruiterAnalyticsSearch } from "@/features/analytics/schemas";
import {
  AnalyticsAccessError,
  countRecord,
  createdAtWhere,
  queryApplicationFunnel,
  queryScopedApplicationTrend,
  queryScopedApplicationTrendEarliest,
  recruiterApplicationScope,
  type AnalyticsActor,
} from "@/features/analytics/server/queries";
import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";
import { contentModerationStatusLabels } from "@/features/admin/moderation";
import { jobStatusLabels, type JobStatusValue } from "@/features/jobs/schemas";

const MAX_SELECTOR_RESULTS = 100;
export const MAX_JOB_PERFORMANCE_RESULTS = 25;

export interface RecruiterAnalyticsCompanyOption {
  id: string;
  name: string;
  isPublished: boolean;
  moderationStatus: "VISIBLE" | "HIDDEN";
}

export interface RecruiterAnalyticsJobOption {
  id: string;
  title: string;
  status: JobStatusValue;
  moderationStatus: "VISIBLE" | "HIDDEN";
}

export interface RecruiterJobPerformanceRow {
  jobId: string;
  title: string;
  lifecycle: JobStatusValue;
  lifecycleLabel: string;
  moderationStatus: "VISIBLE" | "HIDDEN";
  moderationLabel: string;
  applicationsCreatedInRange: number;
  reachedInterview: number;
  reachedOffer: number;
  reachedHire: number;
  overallHireConversion: number | null;
}

export interface RecruiterAnalyticsReadyResult {
  kind: "READY";
  range: AnalyticsDateRange;
  companies: RecruiterAnalyticsCompanyOption[];
  selectedCompany: RecruiterAnalyticsCompanyOption;
  jobs: RecruiterAnalyticsJobOption[];
  selectedJob: RecruiterAnalyticsJobOption | null;
  summary: {
    applicationsCreatedInRange: number;
    activeApplications: number;
    reachedInterview: number;
    reachedOffer: number;
    reachedHire: number;
    publishedJobs: number;
    interviewsCreatedInRange: number;
    completedInterviews: number;
  };
  currentApplicationDistribution: StatusDistributionItem<ApplicationStatusValue>[];
  funnel: FunnelResult;
  applicationTrend: TrendPoint[];
  jobPerformance: RecruiterJobPerformanceRow[];
}

export type RecruiterAnalyticsResult =
  | RecruiterAnalyticsReadyResult
  | {
      kind: "OWNER_REQUIRED";
      range: AnalyticsDateRange;
      companies: [];
    };

async function assertActiveRecruiter(
  prisma: PrismaClient,
  actor: AnalyticsActor,
): Promise<void> {
  if (actor.role !== "RECRUITER" || actor.accountStatus !== "ACTIVE") {
    throw new AnalyticsAccessError();
  }
  const activeRecruiter = await prisma.user.count({
    where: { id: actor.userId, role: "RECRUITER", accountStatus: "ACTIVE" },
  });
  if (activeRecruiter !== 1) throw new AnalyticsAccessError();
}

type JobPerformanceDatabaseRow = {
  jobId: string;
  title: string;
  lifecycle: string;
  moderationStatus: string;
  applicationsCreatedInRange: bigint | number;
  reachedInterview: bigint | number;
  reachedOffer: bigint | number;
  reachedHire: bigint | number;
};

async function queryJobPerformance(
  prisma: PrismaClient,
  companyId: string,
  jobId: string | null,
  range: AnalyticsDateRange,
): Promise<RecruiterJobPerformanceRow[]> {
  const rangePredicate = range.startAt
    ? Prisma.sql`AND ja."createdAt" >= ${range.startAt} AND ja."createdAt" < ${range.endAt}`
    : Prisma.sql`AND ja."createdAt" < ${range.endAt}`;
  const jobPredicate = jobId ? Prisma.sql`AND j."id" = ${jobId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<JobPerformanceDatabaseRow[]>(Prisma.sql`
    WITH cohort AS (
      SELECT ja."id", ja."jobId"
      FROM "job_application" ja
      INNER JOIN "job" cohort_job ON cohort_job."id" = ja."jobId"
      WHERE cohort_job."companyId" = ${companyId}
        ${jobId ? Prisma.sql`AND ja."jobId" = ${jobId}` : Prisma.empty}
        ${rangePredicate}
    ), reached AS (
      SELECT cohort."id" AS "applicationId", cohort."jobId", 'SUBMITTED'::text AS "status"
      FROM cohort
      UNION
      SELECT ash."applicationId", cohort."jobId", ash."toStatus"::text AS "status"
      FROM "application_status_history" ash
      INNER JOIN cohort ON cohort."id" = ash."applicationId"
    )
    SELECT
      j."id" AS "jobId",
      j."title",
      j."status"::text AS "lifecycle",
      j."moderationStatus"::text AS "moderationStatus",
      COUNT(DISTINCT cohort."id")::bigint AS "applicationsCreatedInRange",
      COUNT(DISTINCT reached."applicationId") FILTER (WHERE reached."status" = 'INTERVIEW')::bigint AS "reachedInterview",
      COUNT(DISTINCT reached."applicationId") FILTER (WHERE reached."status" = 'OFFER')::bigint AS "reachedOffer",
      COUNT(DISTINCT reached."applicationId") FILTER (WHERE reached."status" = 'HIRED')::bigint AS "reachedHire"
    FROM "job" j
    LEFT JOIN cohort ON cohort."jobId" = j."id"
    LEFT JOIN reached ON reached."jobId" = j."id"
    WHERE j."companyId" = ${companyId} ${jobPredicate}
    GROUP BY j."id", j."title", j."status", j."moderationStatus"
    ORDER BY "applicationsCreatedInRange" DESC, j."title" ASC, j."id" ASC
    LIMIT ${MAX_JOB_PERFORMANCE_RESULTS}
  `);

  return rows.map((row) => {
    const lifecycle = row.lifecycle as JobStatusValue;
    const moderationStatus = row.moderationStatus as "VISIBLE" | "HIDDEN";
    const applicationsCreatedInRange = Number(row.applicationsCreatedInRange);
    const reachedHire = Number(row.reachedHire);
    return {
      jobId: row.jobId,
      title: row.title,
      lifecycle,
      lifecycleLabel: jobStatusLabels[lifecycle],
      moderationStatus,
      moderationLabel: contentModerationStatusLabels[moderationStatus],
      applicationsCreatedInRange,
      reachedInterview: Number(row.reachedInterview),
      reachedOffer: Number(row.reachedOffer),
      reachedHire,
      overallHireConversion: calculateConversion(
        reachedHire,
        applicationsCreatedInRange,
      ),
    };
  });
}

export async function getRecruiterAnalytics(
  prisma: PrismaClient,
  actor: AnalyticsActor,
  filters: RecruiterAnalyticsSearch,
  range: AnalyticsDateRange,
  locale: RouteLocale = "en",
): Promise<RecruiterAnalyticsResult> {
  await assertActiveRecruiter(prisma, actor);

  const companies = await prisma.company.findMany({
    where: { memberships: { some: { userId: actor.userId, role: "OWNER" } } },
    select: {
      id: true,
      name: true,
      isPublished: true,
      moderationStatus: true,
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: MAX_SELECTOR_RESULTS,
  });

  if (companies.length === 0) {
    if (filters.companyId || filters.jobId) throw new AnalyticsAccessError();
    return { kind: "OWNER_REQUIRED", range, companies: [] };
  }

  const selectedCompany = filters.companyId
    ? companies.find((company) => company.id === filters.companyId)
    : companies[0];
  if (!selectedCompany) throw new AnalyticsAccessError();

  const jobs = await prisma.job.findMany({
    where: { companyId: selectedCompany.id },
    select: {
      id: true,
      title: true,
      status: true,
      moderationStatus: true,
    },
    orderBy: [{ title: "asc" }, { id: "asc" }],
    take: MAX_SELECTOR_RESULTS,
  });
  const selectedJob = filters.jobId
    ? (jobs.find((job) => job.id === filters.jobId) ?? null)
    : null;
  if (filters.jobId && !selectedJob) throw new AnalyticsAccessError();

  const scope = recruiterApplicationScope(selectedCompany.id, selectedJob?.id);
  const earliestAt =
    range.preset === "ALL"
      ? await queryScopedApplicationTrendEarliest(prisma, scope)
      : range.startAt;
  const buckets = createTrendBuckets(range, earliestAt, locale);
  const createdRange = createdAtWhere(range);
  const applicationWhere = {
    job: {
      companyId: selectedCompany.id,
      ...(selectedJob ? { id: selectedJob.id } : {}),
    },
  } as const;
  const interviewWhere = { application: applicationWhere } as const;

  const [
    applicationsCreatedInRange,
    applicationStatusRows,
    funnel,
    publishedJobs,
    interviewsCreatedInRange,
    completedInterviews,
    trendRows,
    jobPerformance,
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
    prisma.job.count({
      where: {
        companyId: selectedCompany.id,
        status: "PUBLISHED",
        ...(selectedJob ? { id: selectedJob.id } : {}),
      },
    }),
    prisma.interview.count({
      where: { ...interviewWhere, createdAt: createdRange },
    }),
    prisma.interview.count({
      where: { ...interviewWhere, status: "COMPLETED" },
    }),
    queryScopedApplicationTrend(prisma, scope, buckets),
    queryJobPerformance(
      prisma,
      selectedCompany.id,
      selectedJob?.id ?? null,
      range,
    ),
  ]);

  const statusCounts = countRecord(
    APPLICATION_STATUSES,
    applicationStatusRows.map((row) => ({
      status: row.status,
      _count: row._count,
    })),
  );
  const stage = Object.fromEntries(
    funnel.stages.map((item) => [item.stage, item.reached]),
  ) as Record<
    "SUBMITTED" | "UNDER_REVIEW" | "INTERVIEW" | "OFFER" | "HIRED",
    number
  >;

  return {
    kind: "READY",
    range,
    companies,
    selectedCompany,
    jobs,
    selectedJob,
    summary: {
      applicationsCreatedInRange,
      activeApplications: countActiveApplications(statusCounts),
      reachedInterview: stage.INTERVIEW,
      reachedOffer: stage.OFFER,
      reachedHire: stage.HIRED,
      publishedJobs,
      interviewsCreatedInRange,
      completedInterviews,
    },
    currentApplicationDistribution: APPLICATION_STATUSES.map((status) => ({
      status,
      label: applicationStatusLabels[status],
      count: statusCounts[status],
    })),
    funnel,
    applicationTrend: zeroFillTrendBuckets(buckets, trendRows),
    jobPerformance,
  };
}
