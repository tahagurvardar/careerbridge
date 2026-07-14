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
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/analytics">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { analytics } = await getDictionary(locale);
  return {
    title: analytics.candidate.title,
    description: analytics.candidate.description,
  };
}

export default async function CandidateAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.analytics.candidate;
  const shared = dictionary.analytics.shared;
  const session = await requireRole("CANDIDATE", "/candidate/analytics");
  const filters = parseCandidateAnalyticsSearch(await searchParams);
  const now = new Date();
  const range = {
    ...resolveAnalyticsDateRange(filters.range, now),
    label: dictionary.analytics.range[filters.range],
  };
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
      locale,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">{t.badge}</Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight">
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-3xl leading-7">
          {t.description}
        </p>

        <div className="border-border/70 bg-card mt-8 rounded-2xl border p-5">
          <p className="mb-3 text-sm font-medium">
            {formatMessage(dictionary.analytics.range.label, {
              range: analytics.range.label,
            })}
          </p>
          <AnalyticsRangeFilter
            basePath="/candidate/analytics"
            currentRange={analytics.range.preset}
            locale={locale}
            labels={dictionary.analytics.range}
          />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label={t.applicationsCreated}
            value={analytics.summary.applicationsCreatedInRange}
            description={formatMessage(t.applicationsCreatedDescription, {
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
            label={t.terminalApplications}
            value={analytics.summary.terminalApplications}
            description={t.terminalApplicationsDescription}
            locale={locale}
            icon={<CircleCheck aria-hidden="true" className="size-4" />}
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
            label={t.hired}
            value={analytics.summary.hired}
            description={t.hiredDescription}
            locale={locale}
          />
          <MetricCard
            label={t.interviewsCreated}
            value={analytics.summary.interviewsCreatedInRange}
            description={formatMessage(t.interviewsCreatedDescription, {
              range: analytics.range.label,
            })}
            locale={locale}
            icon={<CalendarClock aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.upcomingInterviews}
            value={analytics.summary.upcomingInterviews}
            description={t.upcomingInterviewsDescription}
            locale={locale}
          />
          <MetricCard
            label={t.completedInterviews}
            value={analytics.summary.completedInterviews}
            description={t.completedInterviewsDescription}
            locale={locale}
          />
          <MetricCard
            label={t.savedJobs}
            value={analytics.summary.savedJobs}
            description={t.savedJobsDescription}
            locale={locale}
            icon={<Bookmark aria-hidden="true" className="size-4" />}
          />
          <MetricCard
            label={t.rejected}
            value={analytics.summary.rejected}
            description={t.rejectedDescription}
            locale={locale}
          />
          <MetricCard
            label={t.withdrawn}
            value={analytics.summary.withdrawn}
            description={t.withdrawnDescription}
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
      </div>
    </section>
  );
}
