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
  interviewFormatLabels,
} from "@/features/interviews/interviews";
import { getCandidateInterview } from "@/features/interviews/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Interview detail",
  description: "Review and respond to one of your interviews.",
};

export default async function CandidateInterviewDetailPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
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
          <Link href="/candidate/interviews">
            <ArrowLeft aria-hidden="true" />
            Back to interviews
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <InterviewStatusBadge status={interview.status} />
          <span className="text-muted-foreground text-sm">
            {interviewFormatLabels[interview.format]} ·{" "}
            {formatInterviewDuration(interview.startAt, interview.endAt)}
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
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm">
                <p className="font-medium">
                  {formatInterviewRange(
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
                        Meeting link
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open meeting link
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
                        Instructions
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
                  History
                </CardTitle>
                <CardDescription>
                  Every scheduling change for this interview.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewHistory entries={interview.events} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Your response</CardTitle>
                <CardDescription>
                  {canRespond
                    ? "Let the company know whether this time works."
                    : "No response is needed right now."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {canRespond ? (
                  <InterviewResponseActions
                    interviewId={interview.id}
                    expectedVersion={interview.version}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {interview.status === "ACCEPTED"
                      ? "You accepted this interview."
                      : interview.status === "DECLINED"
                        ? "You declined this interview. The company can propose a new time."
                        : interview.status === "CANCELED"
                          ? "This interview was canceled."
                          : "This interview is completed."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="font-medium">{job.title}</p>
                <p className="text-muted-foreground">{job.company.name}</p>
                <Separator />
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/candidate/applications/${interview.application.id}`}
                  >
                    View application
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
