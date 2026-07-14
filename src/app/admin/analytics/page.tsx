import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BarChart3,
  Building2,
  BriefcaseBusiness,
  CalendarClock,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AnalyticsRangeFilter } from "@/features/analytics/components/analytics-range-filter";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { MetricCard } from "@/features/analytics/components/metric-card";
import { StatusDistributionChart } from "@/features/analytics/components/status-distribution-chart";
import { TrendChart } from "@/features/analytics/components/trend-chart";
import { resolveAnalyticsDateRange } from "@/features/analytics/analytics";
import { parseAdminAnalyticsSearch } from "@/features/analytics/schemas";
import { getAdminAnalytics } from "@/features/analytics/server/admin";
import { AnalyticsAccessError } from "@/features/analytics/server/queries";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Platform analytics",
  description: "Truthful, aggregate CareerBridge platform metrics.",
};

function itemCount(items: { status: string; count: number }[], status: string) {
  return items.find((item) => item.status === status)?.count ?? 0;
}

function reachedStage(
  stages: { stage: string; reached: number }[],
  stage: string,
) {
  return stages.find((item) => item.stage === stage)?.reached ?? 0;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireActiveAdmin("/admin/analytics");
  const filters = parseAdminAnalyticsSearch(await searchParams);
  const range = resolveAnalyticsDateRange(filters.range, new Date());
  let analytics;
  try {
    analytics = await getAdminAnalytics(
      getPrismaClient(),
      {
        userId: session.user.id,
        role: session.user.role,
        accountStatus: session.user.accountStatus,
      },
      range,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Platform analytics"
          description="Aggregate platform health from real CareerBridge records. Cards identify whether they represent current state, creation within the selected UTC range, or lifetime progression of an in-range Application cohort."
        />

        <div className="border-border/70 bg-card mt-8 rounded-2xl border p-5">
          <p className="mb-3 text-sm font-medium">
            Range: {analytics.range.label}
          </p>
          <AnalyticsRangeFilter
            basePath="/admin/analytics"
            currentRange={analytics.range.preset}
          />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Current account state and Users created in the selected range.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Users"
              value={analytics.users.total}
              description="Current platform total."
              icon={<UsersRound aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Users created"
              value={analytics.users.createdInRange}
              description={`Created in ${analytics.range.label.toLowerCase()}.`}
              icon={<UserRoundCheck aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Current active Users"
              value={itemCount(analytics.users.byAccountStatus, "ACTIVE")}
              description="Current account state."
            />
            <MetricCard
              label="Current suspended Users"
              value={itemCount(analytics.users.byAccountStatus, "SUSPENDED")}
              description="Current account state."
            />
            <MetricCard
              label="Current Candidates"
              value={itemCount(analytics.users.byRole, "CANDIDATE")}
              description="Current role assignment."
            />
            <MetricCard
              label="Current Recruiters"
              value={itemCount(analytics.users.byRole, "RECRUITER")}
              description="Current role assignment."
            />
            <MetricCard
              label="Current Admins"
              value={itemCount(analytics.users.byRole, "ADMIN")}
              description="Count only; no Admin identities are shown."
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Companies and Jobs
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Publication, lifecycle, and moderation remain separate states.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Companies"
              value={analytics.companies.total}
              description="Current platform total."
              icon={<Building2 aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Companies created"
              value={analytics.companies.createdInRange}
              description={`Created in ${analytics.range.label.toLowerCase()}.`}
            />
            <MetricCard
              label="Current public Companies"
              value={analytics.companies.public}
              description="Published and moderation-visible now."
            />
            <MetricCard
              label="Moderation-hidden Companies"
              value={analytics.companies.moderationHidden}
              description={`${analytics.companies.publishedButHidden} remain published but are hidden from public discovery.`}
            />
            <MetricCard
              label="Total Jobs"
              value={analytics.jobs.total}
              description="Current platform total."
              icon={<BriefcaseBusiness aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Jobs created"
              value={analytics.jobs.createdInRange}
              description={`Created in ${analytics.range.label.toLowerCase()}.`}
            />
            <MetricCard
              label="Current published Jobs"
              value={analytics.jobs.published}
              description="Lifecycle is Published, independent of moderation."
            />
            <MetricCard
              label="Current public Jobs"
              value={analytics.jobs.public}
              description="Published with visible Job and Company moderation."
            />
            <MetricCard
              label="Moderation-hidden Jobs"
              value={analytics.jobs.moderationHidden}
              description="Job-level moderation state is Hidden now."
            />
          </div>
          <div className="mt-5">
            <StatusDistributionChart
              title="Jobs by lifecycle"
              description="Current Job lifecycle distribution across the platform."
              items={analytics.jobs.byLifecycle}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Applications and Interviews
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Applications created"
              value={analytics.applications.createdInRange}
              description={`Created in ${analytics.range.label.toLowerCase()}.`}
              icon={<BarChart3 aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Applications reaching Offer"
              value={reachedStage(
                analytics.applications.funnel.stages,
                "OFFER",
              )}
              description="Ever reached by the selected creation cohort."
            />
            <MetricCard
              label="Applications reaching Hired"
              value={reachedStage(
                analytics.applications.funnel.stages,
                "HIRED",
              )}
              description="Ever reached by the selected creation cohort."
            />
            <MetricCard
              label="Interviews created"
              value={analytics.interviews.createdInRange}
              description={`Created in ${analytics.range.label.toLowerCase()}.`}
              icon={<CalendarClock aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label="Current accepted Interviews"
              value={itemCount(
                analytics.interviews.currentDistribution,
                "ACCEPTED",
              )}
              description="Current Interview state."
            />
            <MetricCard
              label="Current completed Interviews"
              value={itemCount(
                analytics.interviews.currentDistribution,
                "COMPLETED",
              )}
              description="Current Interview state."
            />
            <MetricCard
              label="Current canceled Interviews"
              value={itemCount(
                analytics.interviews.currentDistribution,
                "CANCELED",
              )}
              description="Current Interview state."
            />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <StatusDistributionChart
              title="Current Application statuses"
              description="Current state across all platform Applications; this chart is not limited to the creation cohort."
              items={analytics.applications.currentDistribution}
            />
            <StatusDistributionChart
              title="Current Interview statuses"
              description="Current state across all platform Interviews."
              items={analytics.interviews.currentDistribution}
            />
          </div>
          <div className="mt-5">
            <FunnelChart
              description={`Unique Applications created in ${analytics.range.label.toLowerCase()}, measured by lifetime stage reach through the current server instant.`}
              funnel={analytics.applications.funnel}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            Creation trends
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            UTC buckets are zero-filled and bounded to 120 chart points.
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TrendChart
              title="New Users"
              description={`Users created in ${analytics.range.label.toLowerCase()}.`}
              points={analytics.trends.users}
            />
            <TrendChart
              title="New Companies"
              description={`Companies created in ${analytics.range.label.toLowerCase()}.`}
              points={analytics.trends.companies}
            />
            <TrendChart
              title="New Jobs"
              description={`Jobs created in ${analytics.range.label.toLowerCase()}.`}
              points={analytics.trends.jobs}
            />
            <TrendChart
              title="New Applications"
              description={`Applications created in ${analytics.range.label.toLowerCase()}.`}
              points={analytics.trends.applications}
            />
            <TrendChart
              title="New Interviews"
              description={`Interviews created in ${analytics.range.label.toLowerCase()}.`}
              points={analytics.trends.interviews}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
