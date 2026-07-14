import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import { RecruiterAnalyticsFilters } from "@/features/analytics/components/analytics-range-filter";
import { FunnelChart } from "@/features/analytics/components/funnel-chart";
import { MetricCard } from "@/features/analytics/components/metric-card";
import { StatusDistributionChart } from "@/features/analytics/components/status-distribution-chart";
import { TrendChart } from "@/features/analytics/components/trend-chart";
import {
  formatAnalyticsPercentage,
  resolveAnalyticsDateRange,
} from "@/features/analytics/analytics";
import { parseRecruiterAnalyticsSearch } from "@/features/analytics/schemas";
import { AnalyticsAccessError } from "@/features/analytics/server/queries";
import {
  getRecruiterAnalytics,
  MAX_JOB_PERFORMANCE_RESULTS,
} from "@/features/analytics/server/recruiter";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiting analytics",
  description: "OWNER-only Company recruiting metrics and funnel insights.",
};

export default async function RecruiterAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("RECRUITER", "/recruiter/analytics");
  const filters = parseRecruiterAnalyticsSearch(await searchParams);
  const range = resolveAnalyticsDateRange(filters.range, new Date());
  let analytics;
  try {
    analytics = await getRecruiterAnalytics(
      getPrismaClient(),
      {
        userId: session.user.id,
        role: session.user.role,
        accountStatus: session.user.accountStatus,
      },
      filters,
      range,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  if (analytics.kind === "OWNER_REQUIRED") {
    return (
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Badge variant="secondary">Recruiter analytics</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Company OWNER access required
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
            Recruiting analytics are available only for Companies you currently
            own. MEMBER access does not include Company metrics.
          </p>
          <Card className="mt-8">
            <CardContent className="p-6">
              <AnalyticsEmptyState
                title="No owned Company scope"
                description="Create a Company or ask a current owner to promote your membership before viewing recruiting analytics."
              />
              <Button asChild className="mt-5">
                <Link href="/recruiter/companies">Manage Companies</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">Recruiter analytics</Badge>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight">
              Recruiting performance
            </h1>
            <p className="text-muted-foreground mt-4 leading-7">
              OWNER-only aggregate metrics for {analytics.selectedCompany.name}
              {analytics.selectedJob
                ? ` and ${analytics.selectedJob.title}`
                : " across all of its Jobs"}
              . Current state and selected-cohort outcomes are labeled
              separately.
            </p>
          </div>
          {analytics.selectedCompany.moderationStatus === "HIDDEN" ? (
            <Badge variant="outline">
              Company hidden from public discovery
            </Badge>
          ) : null}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Analytics scope</CardTitle>
            <CardDescription>
              Company changes reset the Job filter; date and Job navigation
              preserve every other valid filter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecruiterAnalyticsFilters
              range={analytics.range.preset}
              companies={analytics.companies}
              selectedCompanyId={analytics.selectedCompany.id}
              jobs={analytics.jobs}
              selectedJobId={analytics.selectedJob?.id ?? null}
            />
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Applications created"
            value={analytics.summary.applicationsCreatedInRange}
            description={`Created in ${analytics.range.label.toLowerCase()}.`}
            icon={<BarChart3 aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Current active Applications"
            value={analytics.summary.activeApplications}
            description="Current non-terminal state in the selected Company/Job scope."
          />
          <MetricCard
            label="Applications that reached Interview"
            value={analytics.summary.reachedInterview}
            description="Ever reached by the selected creation cohort."
            icon={<Target aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Applications that reached Offer"
            value={analytics.summary.reachedOffer}
            description="Ever reached by the selected creation cohort."
          />
          <MetricCard
            label="Applications that reached Hired"
            value={analytics.summary.reachedHire}
            description="Ever reached by the selected creation cohort."
          />
          <MetricCard
            label="Current published Jobs"
            value={analytics.summary.publishedJobs}
            description="Current lifecycle state, including authorized hidden Jobs."
            icon={<BriefcaseBusiness aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Interviews created"
            value={analytics.summary.interviewsCreatedInRange}
            description={`Created in ${analytics.range.label.toLowerCase()}.`}
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label="Current completed Interviews"
            value={analytics.summary.completedInterviews}
            description="Current Interview state in the selected scope."
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <StatusDistributionChart
            title="Current Application statuses"
            description="Current state across the complete selected Company/Job scope, not only the creation cohort."
            items={analytics.currentApplicationDistribution}
          />
          <TrendChart
            title="Applications created over time"
            description={`UTC creation buckets for ${analytics.range.label.toLowerCase()}.`}
            points={analytics.applicationTrend}
          />
        </div>

        <div className="mt-6">
          <FunnelChart
            title="Historical recruiting funnel"
            description={`Unique Applications created in ${analytics.range.label.toLowerCase()}, measured by lifetime stage reach through now.`}
            funnel={analytics.funnel}
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Job performance</CardTitle>
            <CardDescription>
              A deterministic top {MAX_JOB_PERFORMANCE_RESULTS} list by
              Applications created in range. Hidden Jobs remain visible here to
              authorized owners; moderation reasons are never included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.jobPerformance.length === 0 ? (
              <AnalyticsEmptyState title="No Jobs in this scope" />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[58rem] text-sm">
                  <caption className="sr-only">
                    Job performance comparison for the selected Company and date
                    range
                  </caption>
                  <thead className="bg-muted/70">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">
                        Job
                      </th>
                      <th scope="col" className="px-4 py-3 text-left">
                        State
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Created
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Interview
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Offer
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Hired
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Hire conversion
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {analytics.jobPerformance.map((job) => (
                      <tr key={job.jobId}>
                        <th
                          scope="row"
                          className="px-4 py-3 text-left font-medium"
                        >
                          {job.title}
                        </th>
                        <td className="px-4 py-3">
                          <span className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {job.lifecycleLabel}
                            </Badge>
                            <Badge variant="outline">
                              {job.moderationLabel}
                            </Badge>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {job.applicationsCreatedInRange}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {job.reachedInterview}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {job.reachedOffer}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {job.reachedHire}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatAnalyticsPercentage(job.overallHireConversion)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
