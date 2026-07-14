import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Globe2,
  ListChecks,
  MapPin,
  UserRound,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { requireRole } from "@/features/auth/server/session";
import { InterviewHistory } from "@/features/interviews/components/interview-history";
import { InterviewManageActions } from "@/features/interviews/components/interview-manage-actions";
import { InterviewScheduleSheet } from "@/features/interviews/components/interview-schedule-sheet";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import {
  canRecruiterCancelInterview,
  canRecruiterCompleteInterview,
  canRecruiterRescheduleInterview,
  formatInterviewDuration,
  formatInterviewRange,
  getTimeZoneAbbreviation,
  isApplicationEligibleForInterview,
  utcInstantToZonedWall,
} from "@/features/interviews/interviews";
import { getRecruiterInterview } from "@/features/interviews/server/data";
import { formatDateTimeUtc } from "@/i18n/formatter";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/interviews/[interviewId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.interviews.manage,
    description: recruiter.interviews.historyDescription,
  };
}

export default async function RecruiterInterviewDetailPage({
  params,
}: {
  params: Promise<{ locale: string; interviewId: string }>;
}) {
  const { locale: localeParam, interviewId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.interviews;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/interviews/${interviewId}`,
  );
  const interview = await getRecruiterInterview(
    getPrismaClient(),
    session.user.id,
    interviewId,
  );
  if (!interview) notFound();

  const { application } = interview;
  const { job, candidate } = application;
  const now = new Date();
  const canReschedule =
    canRecruiterRescheduleInterview(interview.status) &&
    isApplicationEligibleForInterview(application.status);
  const canCancel = canRecruiterCancelInterview(interview.status);
  const canComplete = canRecruiterCompleteInterview(
    interview.status,
    interview.startAt,
    now,
  );
  const meetingUrl = interview.meetingUrl?.startsWith("https://")
    ? interview.meetingUrl
    : null;
  const wall = utcInstantToZonedWall(interview.startAt, interview.timeZone);
  const durationMinutes = Math.round(
    (interview.endAt.getTime() - interview.startAt.getTime()) / 60_000,
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localizeInternalPath("/recruiter/interviews", locale)}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <InterviewStatusBadge
            status={interview.status}
            label={labels.interviewStatus[interview.status]}
          />
          <span className="text-muted-foreground text-sm">
            {labels.interviewFormat[interview.format]} ·{" "}
            {formatInterviewDuration(
              locale,
              interview.startAt,
              interview.endAt,
            )}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
          {interview.title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {candidate.name} · {job.title} · {job.company.name}
        </p>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.schedule}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <p className="font-medium">
                  {formatInterviewRange(
                    locale,
                    interview.startAt,
                    interview.endAt,
                    interview.timeZone,
                  )}
                </p>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <Globe2 aria-hidden="true" className="size-4" />
                  {interview.timeZone.replaceAll("_", " ")} (
                  {getTimeZoneAbbreviation(
                    interview.startAt,
                    interview.timeZone,
                  )}
                  )
                </p>
                {interview.location ? (
                  <>
                    <Separator />
                    <p className="flex items-start gap-1.5">
                      <MapPin
                        aria-hidden="true"
                        className="text-muted-foreground mt-0.5 size-4 shrink-0"
                      />
                      <span>{interview.location}</span>
                    </p>
                  </>
                ) : null}
                {meetingUrl ? (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Video aria-hidden="true" className="size-4" />
                        {t.meetingLink}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t.openMeeting}
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      </Button>
                    </div>
                  </>
                ) : null}
                {interview.instructions ? (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {t.instructions}
                      </p>
                      <p className="mt-2 leading-7 whitespace-pre-line">
                        {interview.instructions}
                      </p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.history}
                </CardTitle>
                <CardDescription>{t.historyDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewHistory
                  entries={interview.events}
                  locale={locale}
                  labels={labels}
                  t={dictionary.interviews.history}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.manage}</CardTitle>
                <CardDescription>
                  {interview.status === "PENDING_RESPONSE"
                    ? t.waitingResponse
                    : interview.status === "ACCEPTED"
                      ? t.acceptedDescription
                      : interview.status === "DECLINED"
                        ? t.declinedDescription
                        : t.finalDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {interview.candidateRespondedAt ? (
                  <p className="text-muted-foreground text-xs">
                    {formatMessage(t.responded, {
                      date: formatDateTimeUtc(
                        locale,
                        interview.candidateRespondedAt,
                      ),
                    })}
                  </p>
                ) : null}
                {canReschedule ? (
                  <InterviewScheduleSheet
                    triggerLabel={t.reschedule}
                    triggerVariant="outline"
                    labels={dictionary.interviews.scheduleForm}
                    formatLabels={dictionary.labels.interviewFormat}
                    target={{
                      mode: "reschedule",
                      interviewId: interview.id,
                      expectedVersion: interview.version,
                      defaults: {
                        title: interview.title,
                        format: interview.format,
                        date: wall.date,
                        time: wall.time,
                        durationMinutes: String(durationMinutes),
                        timeZone: interview.timeZone,
                        location: interview.location ?? "",
                        meetingUrl: interview.meetingUrl ?? "",
                        instructions: interview.instructions ?? "",
                      },
                    }}
                  />
                ) : null}
                <InterviewManageActions
                  interviewId={interview.id}
                  expectedVersion={interview.version}
                  canCancel={canCancel}
                  canComplete={canComplete}
                  labels={dictionary.interviews.manageActions}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.candidate}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="font-medium">{candidate.name}</p>
                {candidate.candidateProfile?.headline ? (
                  <p className="text-muted-foreground">
                    {candidate.candidateProfile.headline}
                  </p>
                ) : null}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">
                    {t.applicationStatus}
                  </span>
                  <ApplicationStatusBadge
                    status={application.status}
                    label={labels.applicationStatus[application.status]}
                  />
                </div>
                <Separator />
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={localizeInternalPath(
                      `/recruiter/applications/${application.id}`,
                      locale,
                    )}
                  >
                    {t.viewApplication}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="grid gap-2 text-sm">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {t.organizer}
                </p>
                <p>
                  {interview.organizer?.name ?? labels.fallbacks.accountRemoved}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
