import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  PUBLIC_COMPANY_VISIBILITY_WHERE,
  PUBLIC_JOB_VISIBILITY_WHERE,
  USER_ACCOUNT_STATUSES,
} from "@/features/admin/moderation";
import {
  createTrendBuckets,
  zeroFillTrendBuckets,
  type AnalyticsDateRange,
  type FunnelResult,
  type StatusDistributionItem,
  type TrendPoint,
} from "@/features/analytics/analytics";
import {
  AnalyticsAccessError,
  PLATFORM_APPLICATION_SCOPE,
  countRecord,
  createdAtWhere,
  queryApplicationFunnel,
  queryPlatformTrend,
  queryPlatformTrendEarliest,
  type AnalyticsActor,
} from "@/features/analytics/server/queries";
import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";
import { PLATFORM_ROLES, roleLabels } from "@/features/auth/roles";
import {
  INTERVIEW_STATUSES,
  interviewStatusLabels,
  type InterviewStatusValue,
} from "@/features/interviews/interviews";
import {
  JOB_STATUSES,
  jobStatusLabels,
  type JobStatusValue,
} from "@/features/jobs/schemas";

export interface AdminAnalyticsResult {
  range: AnalyticsDateRange;
  users: {
    total: number;
    createdInRange: number;
    byRole: StatusDistributionItem<(typeof PLATFORM_ROLES)[number]>[];
    byAccountStatus: StatusDistributionItem<
      (typeof USER_ACCOUNT_STATUSES)[number]
    >[];
  };
  companies: {
    total: number;
    createdInRange: number;
    public: number;
    moderationHidden: number;
    publishedButHidden: number;
  };
  jobs: {
    total: number;
    createdInRange: number;
    published: number;
    public: number;
    moderationHidden: number;
    byLifecycle: StatusDistributionItem<JobStatusValue>[];
  };
  applications: {
    createdInRange: number;
    currentDistribution: StatusDistributionItem<ApplicationStatusValue>[];
    funnel: FunnelResult;
  };
  interviews: {
    createdInRange: number;
    currentDistribution: StatusDistributionItem<InterviewStatusValue>[];
  };
  trends: {
    users: TrendPoint[];
    companies: TrendPoint[];
    jobs: TrendPoint[];
    applications: TrendPoint[];
    interviews: TrendPoint[];
  };
}

async function assertActiveAdmin(
  prisma: PrismaClient,
  actor: AnalyticsActor,
): Promise<void> {
  if (actor.role !== "ADMIN" || actor.accountStatus !== "ACTIVE") {
    throw new AnalyticsAccessError();
  }
  const activeAdmin = await prisma.user.count({
    where: { id: actor.userId, role: "ADMIN", accountStatus: "ACTIVE" },
  });
  if (activeAdmin !== 1) throw new AnalyticsAccessError();
}

function applicationDistribution(
  counts: Record<ApplicationStatusValue, number>,
): StatusDistributionItem<ApplicationStatusValue>[] {
  return APPLICATION_STATUSES.map((status) => ({
    status,
    label: applicationStatusLabels[status],
    count: counts[status],
  }));
}

export async function getAdminAnalytics(
  prisma: PrismaClient,
  actor: AnalyticsActor,
  range: AnalyticsDateRange,
): Promise<AdminAnalyticsResult> {
  await assertActiveAdmin(prisma, actor);

  const earliestAt =
    range.preset === "ALL"
      ? await queryPlatformTrendEarliest(prisma)
      : range.startAt;
  const buckets = createTrendBuckets(range, earliestAt);
  const createdRange = createdAtWhere(range);

  const [
    totalUsers,
    usersCreatedInRange,
    usersByRoleRows,
    usersByStatusRows,
    totalCompanies,
    companiesCreatedInRange,
    publicCompanies,
    hiddenCompanies,
    publishedButHiddenCompanies,
    totalJobs,
    jobsCreatedInRange,
    publishedJobs,
    publicJobs,
    hiddenJobs,
    jobsByLifecycleRows,
    applicationsCreatedInRange,
    applicationStatusRows,
    funnel,
    interviewsCreatedInRange,
    interviewStatusRows,
    userTrendRows,
    companyTrendRows,
    jobTrendRows,
    applicationTrendRows,
    interviewTrendRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: createdRange } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["accountStatus"],
      _count: { _all: true },
    }),
    prisma.company.count(),
    prisma.company.count({ where: { createdAt: createdRange } }),
    prisma.company.count({ where: PUBLIC_COMPANY_VISIBILITY_WHERE }),
    prisma.company.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.company.count({
      where: { isPublished: true, moderationStatus: "HIDDEN" },
    }),
    prisma.job.count(),
    prisma.job.count({ where: { createdAt: createdRange } }),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.job.count({ where: PUBLIC_JOB_VISIBILITY_WHERE }),
    prisma.job.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.job.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.jobApplication.count({ where: { createdAt: createdRange } }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    queryApplicationFunnel(prisma, PLATFORM_APPLICATION_SCOPE, range),
    prisma.interview.count({ where: { createdAt: createdRange } }),
    prisma.interview.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    queryPlatformTrend(prisma, "USERS", buckets),
    queryPlatformTrend(prisma, "COMPANIES", buckets),
    queryPlatformTrend(prisma, "JOBS", buckets),
    queryPlatformTrend(prisma, "APPLICATIONS", buckets),
    queryPlatformTrend(prisma, "INTERVIEWS", buckets),
  ]);

  const usersByRole = countRecord(
    PLATFORM_ROLES,
    usersByRoleRows.map((row) => ({
      status: row.role,
      _count: row._count,
    })),
  );
  const usersByStatus = countRecord(
    USER_ACCOUNT_STATUSES,
    usersByStatusRows.map((row) => ({
      status: row.accountStatus,
      _count: row._count,
    })),
  );
  const jobsByLifecycle = countRecord(
    JOB_STATUSES,
    jobsByLifecycleRows.map((row) => ({
      status: row.status,
      _count: row._count,
    })),
  );
  const applicationCounts = countRecord(
    APPLICATION_STATUSES,
    applicationStatusRows.map((row) => ({
      status: row.status,
      _count: row._count,
    })),
  );
  const interviewCounts = countRecord(
    INTERVIEW_STATUSES,
    interviewStatusRows.map((row) => ({
      status: row.status,
      _count: row._count,
    })),
  );

  return {
    range,
    users: {
      total: totalUsers,
      createdInRange: usersCreatedInRange,
      byRole: PLATFORM_ROLES.map((status) => ({
        status,
        label: roleLabels[status],
        count: usersByRole[status],
      })),
      byAccountStatus: USER_ACCOUNT_STATUSES.map((status) => ({
        status,
        label: status === "ACTIVE" ? "Active" : "Suspended",
        count: usersByStatus[status],
      })),
    },
    companies: {
      total: totalCompanies,
      createdInRange: companiesCreatedInRange,
      public: publicCompanies,
      moderationHidden: hiddenCompanies,
      publishedButHidden: publishedButHiddenCompanies,
    },
    jobs: {
      total: totalJobs,
      createdInRange: jobsCreatedInRange,
      published: publishedJobs,
      public: publicJobs,
      moderationHidden: hiddenJobs,
      byLifecycle: JOB_STATUSES.map((status) => ({
        status,
        label: jobStatusLabels[status],
        count: jobsByLifecycle[status],
      })),
    },
    applications: {
      createdInRange: applicationsCreatedInRange,
      currentDistribution: applicationDistribution(applicationCounts),
      funnel,
    },
    interviews: {
      createdInRange: interviewsCreatedInRange,
      currentDistribution: INTERVIEW_STATUSES.map((status) => ({
        status,
        label: interviewStatusLabels[status],
        count: interviewCounts[status],
      })),
    },
    trends: {
      users: zeroFillTrendBuckets(buckets, userTrendRows),
      companies: zeroFillTrendBuckets(buckets, companyTrendRows),
      jobs: zeroFillTrendBuckets(buckets, jobTrendRows),
      applications: zeroFillTrendBuckets(buckets, applicationTrendRows),
      interviews: zeroFillTrendBuckets(buckets, interviewTrendRows),
    },
  };
}
