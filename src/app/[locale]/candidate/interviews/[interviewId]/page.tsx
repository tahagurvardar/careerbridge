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
import { requireRole } from "@/features/auth/server/session";
import { InterviewHistory } from "@/features/interviews/components/interview-history";
import { InterviewResponseActions } from "@/features/interviews/components/interview-response-actions";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import {
  canCandidateRespondToInterview,
  formatInterviewDuration,
  formatInterviewRange,
  getTimeZoneAbbreviation,
} from "@/features/interviews/interviews";
import { getCandidateInterview } from "@/features/interviews/server/data";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/interviews/[interviewId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { candidateDetail } = (await getDictionary(locale)).interviews;
  return {
    title: candidateDetail.metaTitle,
    description: candidateDetail.metaDescription,
  };
}

export default async function CandidateInterviewDetailPage({
  params,
}: PageProps<"/[locale]/candidate/interviews/[interviewId]">) {
  const resolvedParams = await params;
  const locale = resolvePageLocale(resolvedParams.locale);
  const interviewId = resolvedParams.interviewId;
  const dictionary = await getDictionary(locale);
  const t = dictionary.interviews.candidateDetail;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole(
    "CANDIDATE",
    `/candidate/interviews/${interviewId}`,
  );
  const interview = await getCandidateInterview(
    getPrismaClient(),
    session.user.id,
    interviewId,
  );
  if (!interview) notFound();

  const { job } = interview.application;
  const canRespond = canCandidateRespondToInterview(interview.status);
  // Defense-in-depth: stored links are validated HTTPS-only, and render is
  // additionally gated on the scheme before becoming an anchor.
  const meetingUrl = interview.meetingUrl?.startsWith("https://")
    ? interview.meetingUrl
    : null;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localize("/candidate/interviews")}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <InterviewStatusBadge
            status={interview.status}
            label={dictionary.labels.interviewStatus[interview.status]}
          />
          <span className="text-muted-foreground text-sm">
            {dictionary.labels.interviewFormat[interview.format]} ·{" "}
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
          {job.title} · {job.company.name}
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
                          {t.openMeetingLink}
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
                  {t.historyTitle}
                </CardTitle>
                <CardDescription>{t.historyDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewHistory
                  entries={interview.events}
                  locale={locale}
                  labels={dictionary.labels}
                  t={dictionary.interviews.history}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.responseTitle}</CardTitle>
                <CardDescription>
                  {canRespond ? t.responseNeeded : t.noResponseNeeded}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canRespond ? (
                  <InterviewResponseActions
                    interviewId={interview.id}
                    expectedVersion={interview.version}
                    t={dictionary.interviews.responseActions}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {interview.status === "ACCEPTED"
                      ? t.accepted
                      : interview.status === "DECLINED"
                        ? t.declined
                        : interview.status === "CANCELED"
                          ? t.canceled
                          : t.completed}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.applicationTitle}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="font-medium">{job.title}</p>
                <p className="text-muted-foreground">{job.company.name}</p>
                <Separator />
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={localize(
                      `/candidate/applications/${interview.application.id}`,
                    )}
                  >
                    {t.viewApplication}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
