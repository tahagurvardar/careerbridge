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
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/analytics">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { analytics } = await getDictionary(locale);
  return {
    title: analytics.recruiter.title,
    description: analytics.recruiter.description,
  };
}

export default async function RecruiterAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.analytics.recruiter;
  const shared = dictionary.analytics.shared;
  const session = await requireRole("RECRUITER", "/recruiter/analytics");
  const filters = parseRecruiterAnalyticsSearch(await searchParams);
  const range = {
    ...resolveAnalyticsDateRange(filters.range, new Date()),
    label: dictionary.analytics.range[filters.range],
  };
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
      locale,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  if (analytics.kind === "OWNER_REQUIRED") {
    return (
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Badge variant="secondary">{t.badge}</Badge>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {t.ownerRequiredTitle}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl leading-7">
            {t.ownerRequiredDescription}
          </p>
          <Card className="mt-8">
            <CardContent className="p-6">
              <AnalyticsEmptyState
                title={t.noOwnedScope}
                description={t.noOwnedScopeDescription}
              />
              <Button asChild className="mt-5">
                <Link
                  href={localizeInternalPath("/recruiter/companies", locale)}
                >
                  {t.manageCompanies}
                </Link>
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
        <Badge variant="secondary">{t.badge}</Badge>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight">{t.title}</h1>
            <p className="text-muted-foreground mt-4 leading-7">
              {formatMessage(t.description, {
                scope: analytics.selectedJob
                  ? `${analytics.selectedCompany.name} / ${analytics.selectedJob.title}`
                  : `${analytics.selectedCompany.name} ${t.scopeAllJobs}`,
              })}
            </p>
          </div>
          {analytics.selectedCompany.moderationStatus === "HIDDEN" ? (
            <Badge variant="outline">{t.companyHidden}</Badge>
          ) : null}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{t.scopeTitle}</CardTitle>
            <CardDescription>{t.scopeDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <RecruiterAnalyticsFilters
              range={analytics.range.preset}
              companies={analytics.companies}
              selectedCompanyId={analytics.selectedCompany.id}
              jobs={analytics.jobs}
              selectedJobId={analytics.selectedJob?.id ?? null}
              locale={locale}
              labels={dictionary.analytics}
            />
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t.applicationsCreated}
            value={analytics.summary.applicationsCreatedInRange}
            description={formatMessage(t.createdDescription, {
              range: analytics.range.label,
            })}
            locale={locale}
            icon={<BarChart3 aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.activeApplications}
            value={analytics.summary.activeApplications}
            description={t.activeApplicationsDescription}
            locale={locale}
          />
          <MetricCard
            label={t.reachedInterview}
            value={analytics.summary.reachedInterview}
            description={t.everReachedDescription}
            locale={locale}
            icon={<Target aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.reachedOffer}
            value={analytics.summary.reachedOffer}
            description={t.everReachedDescription}
            locale={locale}
          />
          <MetricCard
            label={t.reachedHired}
            value={analytics.summary.reachedHire}
            description={t.everReachedDescription}
            locale={locale}
          />
          <MetricCard
            label={t.publishedJobs}
            value={analytics.summary.publishedJobs}
            description={t.publishedJobsDescription}
            locale={locale}
            icon={<BriefcaseBusiness aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.interviewsCreated}
            value={analytics.summary.interviewsCreatedInRange}
            description={formatMessage(t.createdDescription, {
              range: analytics.range.label,
            })}
            locale={locale}
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.completedInterviews}
            value={analytics.summary.completedInterviews}
            description={t.completedInterviewsDescription}
            locale={locale}
          />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <StatusDistributionChart
            title={t.statusTitle}
            description={t.statusDescription}
            items={analytics.currentApplicationDistribution.map((item) => ({
              ...item,
              label: dictionary.labels.applicationStatus[item.status],
            }))}
            locale={locale}
            t={shared}
          />
          <TrendChart
            title={t.trendTitle}
            description={formatMessage(t.trendDescription, {
              range: analytics.range.label,
            })}
            points={analytics.applicationTrend}
            locale={locale}
            t={shared}
          />
        </div>

        <div className="mt-6">
          <FunnelChart
            title={t.funnelTitle}
            description={formatMessage(t.funnelDescription, {
              range: analytics.range.label,
            })}
            funnel={analytics.funnel}
            locale={locale}
            labels={dictionary.labels}
            t={shared}
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t.performanceTitle}</CardTitle>
            <CardDescription>
              {formatMessage(t.performanceDescription, {
                limit: formatInteger(locale, MAX_JOB_PERFORMANCE_RESULTS),
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.jobPerformance.length === 0 ? (
              <AnalyticsEmptyState title={t.noJobs} />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[58rem] text-sm">
                  <caption className="sr-only">{t.performanceCaption}</caption>
                  <thead className="bg-muted/70">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">
                        {t.job}
                      </th>
                      <th scope="col" className="px-4 py-3 text-left">
                        {t.state}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {t.created}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {t.interview}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {t.offer}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {t.hired}
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        {t.hireConversion}
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
                              {dictionary.labels.jobStatus[job.lifecycle]}
                            </Badge>
                            <Badge variant="outline">
                              {
                                dictionary.labels.contentModeration[
                                  job.moderationStatus
                                ]
                              }
                            </Badge>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatInteger(
                            locale,
                            job.applicationsCreatedInRange,
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatInteger(locale, job.reachedInterview)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatInteger(locale, job.reachedOffer)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatInteger(locale, job.reachedHire)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatAnalyticsPercentage(
                            job.overallHireConversion,
                            locale,
                          )}
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
