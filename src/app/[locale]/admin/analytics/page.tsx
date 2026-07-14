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
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/analytics">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { analytics } = await getDictionary(locale);
  return {
    title: analytics.admin.title,
    description: analytics.admin.description,
  };
}

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
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.analytics.admin;
  const shared = dictionary.analytics.shared;
  const session = await requireActiveAdmin("/admin/analytics");
  const filters = parseAdminAnalyticsSearch(await searchParams);
  const range = {
    ...resolveAnalyticsDateRange(filters.range, new Date()),
    label: dictionary.analytics.range[filters.range],
  };
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
      locale,
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError) notFound();
    throw error;
  }

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          badge={dictionary.admin.shared.badge}
          title={t.title}
          description={t.description}
        />

        <div className="border-border/70 bg-card mt-8 rounded-2xl border p-5">
          <p className="mb-3 text-sm font-medium">
            {formatMessage(dictionary.analytics.range.label, {
              range: analytics.range.label,
            })}
          </p>
          <AnalyticsRangeFilter
            basePath="/admin/analytics"
            currentRange={analytics.range.preset}
            locale={locale}
            labels={dictionary.analytics.range}
          />
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t.usersTitle}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.usersDescription}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t.totalUsers}
              value={analytics.users.total}
              description={t.currentPlatformTotal}
              locale={locale}
              icon={<UsersRound aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.usersCreated}
              value={analytics.users.createdInRange}
              description={formatMessage(t.createdDescription, {
                range: analytics.range.label,
              })}
              locale={locale}
              icon={<UserRoundCheck aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.activeUsers}
              value={itemCount(analytics.users.byAccountStatus, "ACTIVE")}
              description={t.currentAccountState}
              locale={locale}
            />
            <MetricCard
              label={t.suspendedUsers}
              value={itemCount(analytics.users.byAccountStatus, "SUSPENDED")}
              description={t.currentAccountState}
              locale={locale}
            />
            <MetricCard
              label={t.candidates}
              value={itemCount(analytics.users.byRole, "CANDIDATE")}
              description={t.currentRole}
              locale={locale}
            />
            <MetricCard
              label={t.recruiters}
              value={itemCount(analytics.users.byRole, "RECRUITER")}
              description={t.currentRole}
              locale={locale}
            />
            <MetricCard
              label={t.admins}
              value={itemCount(analytics.users.byRole, "ADMIN")}
              description={t.adminsDescription}
              locale={locale}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t.companiesJobsTitle}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.companiesJobsDescription}
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t.totalCompanies}
              value={analytics.companies.total}
              description={t.currentPlatformTotal}
              locale={locale}
              icon={<Building2 aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.companiesCreated}
              value={analytics.companies.createdInRange}
              description={formatMessage(t.createdDescription, {
                range: analytics.range.label,
              })}
              locale={locale}
            />
            <MetricCard
              label={t.publicCompanies}
              value={analytics.companies.public}
              description={t.publicCompaniesDescription}
              locale={locale}
            />
            <MetricCard
              label={t.hiddenCompanies}
              value={analytics.companies.moderationHidden}
              description={formatMessage(t.hiddenCompaniesDescription, {
                count: analytics.companies.publishedButHidden,
              })}
              locale={locale}
            />
            <MetricCard
              label={t.totalJobs}
              value={analytics.jobs.total}
              description={t.currentPlatformTotal}
              locale={locale}
              icon={<BriefcaseBusiness aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.jobsCreated}
              value={analytics.jobs.createdInRange}
              description={formatMessage(t.createdDescription, {
                range: analytics.range.label,
              })}
              locale={locale}
            />
            <MetricCard
              label={t.publishedJobs}
              value={analytics.jobs.published}
              description={t.publishedJobsDescription}
              locale={locale}
            />
            <MetricCard
              label={t.publicJobs}
              value={analytics.jobs.public}
              description={t.publicJobsDescription}
              locale={locale}
            />
            <MetricCard
              label={t.hiddenJobs}
              value={analytics.jobs.moderationHidden}
              description={t.hiddenJobsDescription}
              locale={locale}
            />
          </div>
          <div className="mt-5">
            <StatusDistributionChart
              title={t.jobsLifecycleTitle}
              description={t.jobsLifecycleDescription}
              items={analytics.jobs.byLifecycle.map((item) => ({
                ...item,
                label: dictionary.labels.jobStatus[item.status],
              }))}
              locale={locale}
              t={shared}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t.applicationsInterviewsTitle}
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label={t.applicationsCreated}
              value={analytics.applications.createdInRange}
              description={formatMessage(t.createdDescription, {
                range: analytics.range.label,
              })}
              locale={locale}
              icon={<BarChart3 aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.reachingOffer}
              value={reachedStage(
                analytics.applications.funnel.stages,
                "OFFER",
              )}
              description={t.everReachedDescription}
              locale={locale}
            />
            <MetricCard
              label={t.reachingHired}
              value={reachedStage(
                analytics.applications.funnel.stages,
                "HIRED",
              )}
              description={t.everReachedDescription}
              locale={locale}
            />
            <MetricCard
              label={t.interviewsCreated}
              value={analytics.interviews.createdInRange}
              description={formatMessage(t.createdDescription, {
                range: analytics.range.label,
              })}
              locale={locale}
              icon={<CalendarClock aria-hidden="true" className="size-4" />}
            />
            <MetricCard
              label={t.acceptedInterviews}
              value={itemCount(
                analytics.interviews.currentDistribution,
                "ACCEPTED",
              )}
              description={t.currentInterviewState}
              locale={locale}
            />
            <MetricCard
              label={t.completedInterviews}
              value={itemCount(
                analytics.interviews.currentDistribution,
                "COMPLETED",
              )}
              description={t.currentInterviewState}
              locale={locale}
            />
            <MetricCard
              label={t.canceledInterviews}
              value={itemCount(
                analytics.interviews.currentDistribution,
                "CANCELED",
              )}
              description={t.currentInterviewState}
              locale={locale}
            />
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <StatusDistributionChart
              title={t.applicationStatusesTitle}
              description={t.applicationStatusesDescription}
              items={analytics.applications.currentDistribution.map((item) => ({
                ...item,
                label: dictionary.labels.applicationStatus[item.status],
              }))}
              locale={locale}
              t={shared}
            />
            <StatusDistributionChart
              title={t.interviewStatusesTitle}
              description={t.interviewStatusesDescription}
              items={analytics.interviews.currentDistribution.map((item) => ({
                ...item,
                label: dictionary.labels.interviewStatus[item.status],
              }))}
              locale={locale}
              t={shared}
            />
          </div>
          <div className="mt-5">
            <FunnelChart
              title={shared.applicationFunnel}
              description={formatMessage(t.funnelDescription, {
                range: analytics.range.label,
              })}
              funnel={analytics.applications.funnel}
              locale={locale}
              labels={dictionary.labels}
              t={shared}
            />
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t.trendsTitle}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            {t.trendsDescription}
          </p>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <TrendChart
              title={t.newUsers}
              description={formatMessage(t.trendDescription, {
                entity: t.users,
                range: analytics.range.label,
              })}
              points={analytics.trends.users}
              locale={locale}
              t={shared}
            />
            <TrendChart
              title={t.newCompanies}
              description={formatMessage(t.trendDescription, {
                entity: t.companies,
                range: analytics.range.label,
              })}
              points={analytics.trends.companies}
              locale={locale}
              t={shared}
            />
            <TrendChart
              title={t.newJobs}
              description={formatMessage(t.trendDescription, {
                entity: t.jobs,
                range: analytics.range.label,
              })}
              points={analytics.trends.jobs}
              locale={locale}
              t={shared}
            />
            <TrendChart
              title={t.newApplications}
              description={formatMessage(t.trendDescription, {
                entity: t.applications,
                range: analytics.range.label,
              })}
              points={analytics.trends.applications}
              locale={locale}
              t={shared}
            />
            <TrendChart
              title={t.newInterviews}
              description={formatMessage(t.trendDescription, {
                entity: t.interviews,
                range: analytics.range.label,
              })}
              points={analytics.trends.interviews}
              locale={locale}
              t={shared}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
