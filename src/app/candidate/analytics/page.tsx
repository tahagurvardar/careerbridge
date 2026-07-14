import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BarChart3,
  Bookmark,
  CalendarClock,
  CircleCheck,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AnalyticsRangeFilter } from "@/features/analytics/components/analytics-range-filter";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { MetricCard } from "@/features/analytics/components/metric-card";
import { StatusDistributionChart } from "@/features/analytics/components/status-distribution-chart";
import { TrendChart } from "@/features/analytics/components/trend-chart";
import { resolveAnalyticsDateRange } from "@/features/analytics/analytics";
import { parseCandidateAnalyticsSearch } from "@/features/analytics/schemas";
import { getCandidateAnalytics } from "@/features/analytics/server/candidate";
import { AnalyticsAccessError } from "@/features/analytics/server/queries";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Application analytics",
  description: "Private Candidate Application and Interview statistics.",
};

export default async function CandidateAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("CANDIDATE", "/candidate/analytics");
  const filters = parseCandidateAnalyticsSearch(await searchParams);
  const now = new Date();
  const range = resolveAnalyticsDateRange(filters.range, now);
  let analytics;
  try {
    analytics = await getCandidateAnalytics(
      getPrismaClient(),
      {
        userId: session.user.id,
        role: session.user.role,
        accountStatus: session.user.accountStatus,
      },
      range,
      now,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">Candidate analytics</Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight">
          Your Application activity
        </h1>
        <p className="text-muted-foreground mt-4 max-w-3xl leading-7">
          Private aggregates from your Applications, Interviews, and Saved Jobs.
          Current state is kept separate from lifetime outcomes for Applications
          created in the selected UTC range.
        </p>

        <div className="border-border/70 bg-card mt-8 rounded-2xl border p-5">
          <p className="mb-3 text-sm font-medium">
            Range: {analytics.range.label}
          </p>
          <AnalyticsRangeFilter
            basePath="/candidate/analytics"
            currentRange={analytics.range.preset}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Applications created"
            value={analytics.summary.applicationsCreatedInRange}
            description={`Your Applications created in ${analytics.range.label.toLowerCase()}.`}
            icon={<BarChart3 aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Current active Applications"
            value={analytics.summary.activeApplications}
            description="Your current non-terminal Application states."
          />
          <MetricCard
            label="Current completed Applications"
            value={analytics.summary.terminalApplications}
            description="Your current Hired, Rejected, or Withdrawn states."
            icon={<CircleCheck aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Applications that reached Interview"
            value={analytics.summary.reachedInterview}
            description="Ever reached by your selected creation cohort."
            icon={<Target aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Applications that reached Offer"
            value={analytics.summary.reachedOffer}
            description="Ever reached by your selected creation cohort."
          />
          <MetricCard
            label="Hired outcomes"
            value={analytics.summary.hired}
            description="Applications in the cohort that ever reached Hired."
          />
          <MetricCard
            label="Interviews created"
            value={analytics.summary.interviewsCreatedInRange}
            description={`Your Interviews created in ${analytics.range.label.toLowerCase()}.`}
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Current upcoming Interviews"
            value={analytics.summary.upcomingInterviews}
            description="Awaiting response or accepted and not yet ended."
          />
          <MetricCard
            label="Current completed Interviews"
            value={analytics.summary.completedInterviews}
            description="Your Interviews currently marked Completed."
          />
          <MetricCard
            label="Saved Jobs"
            value={analytics.summary.savedJobs}
            description="Your current Saved Job count, including unavailable history."
            icon={<Bookmark aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Rejected outcomes"
            value={analytics.summary.rejected}
            description="Applications in the cohort that reached Rejected."
          />
          <MetricCard
            label="Withdrawn outcomes"
            value={analytics.summary.withdrawn}
            description="Applications in the cohort that reached Withdrawn."
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <StatusDistributionChart
            title="Your current Application statuses"
            description="Current state across all of your Applications; hidden historical Jobs remain included without moderation reasons."
            items={analytics.currentApplicationDistribution}
          />
          <TrendChart
            title="Your Application creation trend"
            description={`UTC creation buckets for ${analytics.range.label.toLowerCase()}.`}
            points={analytics.applicationTrend}
          />
        </div>

        <div className="mt-6">
          <FunnelChart
            title="Your Application progression"
            description={`Unique Applications you created in ${analytics.range.label.toLowerCase()}, measured by lifetime stage reach through now. This is historical description, not a prediction.`}
            funnel={analytics.funnel}
          />
        </div>
      </div>
    </section>
  );
}
