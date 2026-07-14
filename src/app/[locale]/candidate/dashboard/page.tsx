import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  Bookmark,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  Pencil,
  Sparkles,
  UserRound,
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
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import {
  getCandidateApplicationStatusCounts,
  getCandidateRecentApplications,
} from "@/features/applications/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getCandidateCurrentResume } from "@/features/candidate-documents/server/data";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import { formatInterviewRange } from "@/features/interviews/interviews";
import { getCandidateUpcomingInterviews } from "@/features/interviews/server/data";
import { CompletionCard } from "@/features/candidate-profile/components/completion-card";
import { getCompletionFromProfile } from "@/features/candidate-profile/completion";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { NotificationSummaryList } from "@/features/notifications/components/notification-summary-list";
import { formatUnreadBadge } from "@/features/notifications/notifications";
import { getNotificationSummary } from "@/features/notifications/server/data";
import { classifySavedJobAvailability } from "@/features/saved-jobs/availability";
import { getCandidateDashboardRecommendation } from "@/features/saved-jobs/recommendation";
import { getCandidateSavedJobDashboard } from "@/features/saved-jobs/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/dashboard">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { candidate } = await getDictionary(locale);
  return {
    title: candidate.dashboard.metaTitle,
    description: candidate.dashboard.metaDescription,
  };
}

export default async function CandidateDashboardPage({
  params,
}: PageProps<"/[locale]/candidate/dashboard">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.dashboard;
  const localize = (path: string) => localizeInternalPath(path, locale);

  const session = await requireRole("CANDIDATE", "/candidate/dashboard");
  const prisma = getPrismaClient();
  const [
    profile,
    { counts, total },
    recent,
    savedJobDashboard,
    currentResume,
    notifications,
    interviewSummary,
  ] = await Promise.all([
    getCandidateProfile(prisma, session.user.id),
    getCandidateApplicationStatusCounts(prisma, session.user.id),
    getCandidateRecentApplications(prisma, session.user.id),
    getCandidateSavedJobDashboard(prisma, session.user.id),
    getCandidateCurrentResume(prisma, session.user.id),
    getNotificationSummary(prisma, session.user.id),
    getCandidateUpcomingInterviews(prisma, session.user.id, new Date()),
  ]);
  const nextInterview = interviewSummary.next[0] ?? null;
  const completion = getCompletionFromProfile(profile);
  const active =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.INTERVIEW + counts.OFFER;

  const recommendation = getCandidateDashboardRecommendation({
    profileComplete: completion.percentage === 100,
    savedJobCount: savedJobDashboard.total,
    savedOpenUnappliedCount: savedJobDashboard.openUnapplied,
    activeApplicationCount: active,
  });
  const recommendationCopy = t.recommendations[recommendation.key];

  const stats = [
    { label: t.stats.total, value: total },
    { label: t.stats.active, value: active },
    { label: t.stats.interviews, value: counts.INTERVIEW },
    { label: t.stats.offers, value: counts.OFFER },
    { label: t.stats.hired, value: counts.HIRED },
  ];

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">
              {dictionary.labels.role.CANDIDATE}
            </Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              {t.eyebrow}
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            {formatMessage(t.welcome, { name: session.user.name })}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            {t.intro}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                {t.profileTitle}
              </CardTitle>
              <CardDescription>{t.profileDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="bg-muted/50 flex items-center justify-between gap-3 rounded-xl p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <span className="min-w-0 text-sm">
                    {currentResume.hasResume ? (
                      <span className="truncate font-medium">
                        {currentResume.filename}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{t.noCv}</span>
                    )}
                  </span>
                </div>
                <Button variant="ghost" size="sm" asChild className="shrink-0">
                  <Link href={localize("/candidate/documents")}>
                    {currentResume.hasResume ? t.manageCv : t.addCv}
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={localize("/candidate/profile")}>
                    <UserRound aria-hidden="true" />
                    {t.viewProfile}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={localize("/candidate/profile/edit")}>
                    <Pencil aria-hidden="true" />
                    {t.editProfile}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <CompletionCard
            {...completion}
            locale={locale}
            t={dictionary.candidate.completion}
            compact
          />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.applicationsTitle}
                </CardTitle>
                <CardDescription>{t.applicationsDescription}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={localize("/candidate/applications")}>
                    {t.viewAllApplications}
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={localize("/candidate/analytics")}>
                    {t.personalAnalytics}
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {stats.map((item) => (
                <div key={item.label} className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>

            {recent.length ? (
              <ul className="divide-y">
                {recent.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={localize(
                        `/candidate/applications/${application.id}`,
                      )}
                      className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {application.job.title}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building2 aria-hidden="true" className="size-3.5" />
                          {application.job.company.name} ·{" "}
                          {formatMessage(t.appliedOn, {
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
                          label={
                            dictionary.labels.applicationStatus[
                              application.status
                            ]
                          }
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
              <div className="bg-muted/40 rounded-xl px-4 py-8 text-center">
                <p className="text-muted-foreground leading-6">
                  {t.noApplications}
                </p>
                <Button className="mt-4" asChild>
                  <Link href={localize("/jobs")}>{t.browseJobs}</Link>
                </Button>
              </div>
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
                  {t.interviewsTitle}
                  {interviewSummary.pendingResponseCount > 0 ? (
                    <Badge>
                      {formatCount(
                        locale,
                        interviewSummary.pendingResponseCount,
                        t.toAnswer,
                      )}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{t.nextInterviewDescription}</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={localize("/candidate/interviews")}>
                  {t.viewAllInterviews}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {nextInterview ? (
              <Link
                href={localize(`/candidate/interviews/${nextInterview.id}`)}
                className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nextInterview.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
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
                    label={
                      dictionary.labels.interviewStatus[nextInterview.status]
                    }
                  />
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                  />
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noUpcomingInterviews}
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
                  {t.notificationsTitle}
                  {notifications.unreadCount > 0 ? (
                    <Badge>
                      {formatMessage(t.unreadBadge, {
                        count:
                          formatUnreadBadge(notifications.unreadCount) ?? "0",
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

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.savedJobsTitle}
                </CardTitle>
                <CardDescription>
                  {formatCount(locale, savedJobDashboard.total, t.savedCount)}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={localize("/candidate/saved-jobs")}>
                  {t.viewAllSavedJobs}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {savedJobDashboard.recent.length ? (
              <ul className="divide-y">
                {savedJobDashboard.recent.map(({ job, createdAt }) => {
                  const isOpen =
                    classifySavedJobAvailability({
                      status: job.status,
                      companyIsPublished: job.company.isPublished,
                      moderationStatus: job.moderationStatus,
                      companyModerationStatus: job.company.moderationStatus,
                    }) === "OPEN";
                  const content = (
                    <>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {job.title}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building2 aria-hidden="true" className="size-3.5" />
                          {job.company.name} ·{" "}
                          {formatMessage(t.savedOn, {
                            date: formatJobDate(locale, createdAt),
                          })}
                        </span>
                      </span>
                      <Badge variant={isOpen ? "default" : "secondary"}>
                        {isOpen
                          ? dictionary.labels.savedJobAvailability.OPEN
                          : dictionary.labels.savedJobAvailability.UNAVAILABLE}
                      </Badge>
                    </>
                  );

                  return (
                    <li key={job.slug}>
                      {isOpen ? (
                        <Link
                          href={localize(`/jobs/${job.slug}`)}
                          className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="-mx-2 flex items-center justify-between gap-3 px-2 py-3">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="bg-muted/40 rounded-xl px-4 py-8 text-center">
                <p className="text-muted-foreground leading-6">
                  {t.noSavedJobs}
                </p>
                <Button className="mt-4" asChild>
                  <Link href={localize("/jobs")}>{t.browseJobs}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">{t.recommendedNextAction}</p>
              <p className="text-muted-foreground mt-1">
                {formatCount(
                  locale,
                  recommendation.count ?? 0,
                  recommendationCopy.description,
                )}
              </p>
            </div>
            <Button asChild>
              <Link href={localize(recommendation.href)}>
                {recommendationCopy.label}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                <Sparkles aria-hidden="true" className="size-5" />
              </span>
              <CardTitle className="mt-3 text-lg">{t.deferredTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-6">
                {t.deferredDescription}
              </p>
              <Badge variant="outline" className="mt-5">
                {t.plannedLater}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
