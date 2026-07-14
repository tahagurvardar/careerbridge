import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Plus,
  Sparkles,
  UserRound,
  UsersRound,
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
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { getRecruiterApplicationDashboard } from "@/features/applications/server/data";
import { getPendingIncomingInvitationCount } from "@/features/company-team/server/data";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import { formatInterviewRange } from "@/features/interviews/interviews";
import { getRecruiterUpcomingInterviews } from "@/features/interviews/server/data";
import { NotificationSummaryList } from "@/features/notifications/components/notification-summary-list";
import { formatUnreadBadge } from "@/features/notifications/notifications";
import { getNotificationSummary } from "@/features/notifications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { getRecruiterJobStatusCounts } from "@/features/jobs/server/data";
import { getRecruiterProfileWorkspace } from "@/features/recruiter-company/server/data";
import { formatCount, formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/dashboard">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.dashboard.metaTitle,
    description: recruiter.dashboard.metaDescription,
  };
}

export default async function RecruiterDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.dashboard;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("RECRUITER", "/recruiter/dashboard");
  const prisma = getPrismaClient();
  const [
    [profile, memberships],
    jobCounts,
    applicationDashboard,
    notifications,
    incomingInvitationCount,
    interviewSummary,
  ] = await Promise.all([
    getRecruiterProfileWorkspace(prisma, session.user.id),
    getRecruiterJobStatusCounts(prisma, session.user.id),
    getRecruiterApplicationDashboard(prisma, session.user.id),
    getNotificationSummary(prisma, session.user.id),
    getPendingIncomingInvitationCount(prisma, session.user.id),
    getRecruiterUpcomingInterviews(prisma, session.user.id, new Date()),
  ]);
  const nextInterview = interviewSummary.next[0] ?? null;
  const appCounts = applicationDashboard.statusCounts;
  const activeApplications =
    appCounts.SUBMITTED +
    appCounts.UNDER_REVIEW +
    appCounts.INTERVIEW +
    appCounts.OFFER;
  const profileSignals = [
    profile?.jobTitle,
    profile?.bio,
    profile?.linkedinUrl,
  ];
  const completedProfileFields = profileSignals.filter(Boolean).length;
  const profilePercentage = Math.round(
    (completedProfileFields / profileSignals.length) * 100,
  );
  const ownedCount = memberships.filter(({ role }) => role === "OWNER").length;
  const publishedCount = memberships.filter(
    ({ company }) => company.isPublished,
  ).length;
  const totalJobs =
    jobCounts.DRAFT +
    jobCounts.PUBLISHED +
    jobCounts.CLOSED +
    jobCounts.ARCHIVED;
  const recommendation =
    incomingInvitationCount > 0
      ? {
          label: t.recommendations.invitations,
          href: "/recruiter/invitations",
        }
      : !profile || profilePercentage < 100
        ? {
            label: t.recommendations.profile,
            href: "/recruiter/profile/edit",
          }
        : memberships.length === 0
          ? {
              label: t.recommendations.company,
              href: "/recruiter/companies/new",
            }
          : publishedCount === 0
            ? {
                label: t.recommendations.publishCompany,
                href: `/recruiter/companies/${memberships[0].company.id}`,
              }
            : totalJobs === 0
              ? { label: t.recommendations.job, href: "/recruiter/jobs/new" }
              : jobCounts.PUBLISHED === 0
                ? {
                    label: t.recommendations.publishJob,
                    href: "/recruiter/jobs?status=DRAFT",
                  }
                : appCounts.SUBMITTED > 0
                  ? {
                      label: t.recommendations.applications,
                      href: "/recruiter/applications?status=SUBMITTED",
                    }
                  : { label: t.recommendations.jobs, href: "/recruiter/jobs" };

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{t.badge}</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              {dictionary.recruiter.shared.companyWorkspace}
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            {formatMessage(t.welcome, { name: session.user.name })}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            {t.description}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                {t.profile}
              </CardTitle>
              <CardDescription>
                {formatMessage(t.profileProgress, {
                  completed: formatInteger(locale, completedProfileFields),
                  total: formatInteger(locale, profileSignals.length),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Progress
                value={profilePercentage}
                aria-label={formatMessage(t.profileProgressAria, {
                  percent: formatInteger(locale, profilePercentage),
                })}
              />
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={localize("/recruiter/profile")}>
                    {t.viewProfile}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={localize("/recruiter/profile/edit")}>
                    {t.editProfile}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-primary size-5" />
                {t.companySetup}
              </CardTitle>
              <CardDescription>{t.companySetupDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid grid-cols-2 gap-4">
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">
                    {t.companiesOwned}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {formatInteger(locale, ownedCount)}
                  </dd>
                </div>
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">
                    {dictionary.recruiter.shared.published}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {formatInteger(locale, publishedCount)}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={localize("/recruiter/companies")}>
                    <Building2 aria-hidden="true" />
                    {t.manageCompanies}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={localize("/recruiter/companies/new")}>
                    <Plus aria-hidden="true" />
                    {t.createCompany}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.invitations}
                  {incomingInvitationCount > 0 ? (
                    <Badge>
                      {formatMessage(t.pending, {
                        count: formatInteger(locale, incomingInvitationCount),
                      })}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{t.invitationDescription}</CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={localize("/recruiter/invitations")}>
                  {t.reviewInvitations}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-6">
              {incomingInvitationCount > 0
                ? formatCount(
                    locale,
                    incomingInvitationCount,
                    t.activeInvitations,
                  )
                : t.noInvitations}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {dictionary.recruiter.companyWorkspace.jobs}
                </CardTitle>
                <CardDescription>{t.jobsDescription}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href={localize("/recruiter/jobs/new")}>
                    <Plus aria-hidden="true" />
                    {dictionary.recruiter.jobs.list.create}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={localize("/recruiter/jobs")}>
                    {dictionary.recruiter.companyWorkspace.manageJobs}
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">
                  {labels.jobStatus.DRAFT}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formatInteger(locale, jobCounts.DRAFT)}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">
                  {labels.jobStatus.PUBLISHED}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formatInteger(locale, jobCounts.PUBLISHED)}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">
                  {labels.jobStatus.CLOSED}
                </dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {formatInteger(locale, jobCounts.CLOSED)}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {dictionary.recruiter.companyWorkspace.applications}
                </CardTitle>
                <CardDescription>{t.applicationsDescription}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={localize("/recruiter/applications")}>
                    {t.viewApplications}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={localize("/recruiter/analytics")}>
                    {t.recruitingAnalytics}
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile
                label={t.total}
                value={applicationDashboard.total}
                locale={locale}
              />
              <StatTile
                label={t.active}
                value={activeApplications}
                locale={locale}
              />
              <StatTile
                label={labels.applicationStatus.SUBMITTED}
                value={appCounts.SUBMITTED}
                locale={locale}
              />
              <StatTile
                label={labels.applicationStatus.UNDER_REVIEW}
                value={appCounts.UNDER_REVIEW}
                locale={locale}
              />
              <StatTile
                label={labels.applicationStatus.INTERVIEW}
                value={appCounts.INTERVIEW}
                locale={locale}
              />
              <StatTile
                label={labels.applicationStatus.OFFER}
                value={appCounts.OFFER}
                locale={locale}
              />
            </dl>
            {applicationDashboard.recent.length ? (
              <ul className="divide-y">
                {applicationDashboard.recent.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={localize(
                        `/recruiter/applications/${application.id}`,
                      )}
                      className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {application.candidate.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {application.job.title} ·{" "}
                          {application.job.company.name} ·{" "}
                          {formatMessage(t.applied, {
                            date: formatJobDate(
                              locale,
                              application.submittedAt,
                            ),
                          })}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <ApplicationStatusBadge
                          status={application.status}
                          label={labels.applicationStatus[application.status]}
                        />
                        <ArrowUpRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noApplications}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.interviews}
                  {interviewSummary.pendingResponseCount > 0 ? (
                    <Badge>
                      {formatMessage(t.awaitingResponse, {
                        count: formatInteger(
                          locale,
                          interviewSummary.pendingResponseCount,
                        ),
                      })}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{t.interviewsDescription}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={localize("/recruiter/interviews")}>
                  {t.openInterviews}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {nextInterview ? (
              <Link
                href={localize(`/recruiter/interviews/${nextInterview.id}`)}
                className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nextInterview.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {nextInterview.application.candidate.name} ·{" "}
                    {nextInterview.application.job.title} ·{" "}
                    {nextInterview.application.job.company.name}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {formatInterviewRange(
                      locale,
                      nextInterview.startAt,
                      nextInterview.endAt,
                      nextInterview.timeZone,
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <InterviewStatusBadge
                    status={nextInterview.status}
                    label={labels.interviewStatus[nextInterview.status]}
                  />
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                  />
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noInterviews}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell aria-hidden="true" className="text-primary size-5" />
                  {t.notifications}
                  {notifications.unreadCount > 0 ? (
                    <Badge>
                      {formatMessage(t.unread, {
                        count:
                          formatUnreadBadge(
                            notifications.unreadCount,
                            locale,
                          ) ?? formatInteger(locale, 0),
                      })}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{t.notificationsDescription}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={localize("/notifications")}>
                  {t.openNotifications}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.recent.length ? (
              <NotificationSummaryList
                notifications={notifications.recent}
                locale={locale}
                unreadSrLabel={dictionary.notifications.center.unread}
              />
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noNotifications}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{t.recommendationTitle}</p>
              <p className="text-muted-foreground mt-1">
                {t.recommendationDescription}
              </p>
            </div>
            <Button asChild>
              <Link href={localize(recommendation.href)}>
                {recommendation.label}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
              <BarChart3 aria-hidden="true" className="size-5" />
            </span>
            <CardTitle className="mt-3 text-lg">{t.analyticsTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-6">
              {t.analyticsDescription}
            </p>
            <Button variant="outline" className="mt-5" asChild>
              <Link href={localize("/recruiter/analytics")}>
                {t.viewAnalytics}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  locale,
}: {
  label: string;
  value: number;
  locale: Parameters<typeof formatInteger>[0];
}) {
  return (
    <div className="bg-muted/60 rounded-xl p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">
        {formatInteger(locale, value)}
      </dd>
    </div>
  );
}
