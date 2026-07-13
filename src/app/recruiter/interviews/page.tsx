import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, MailQuestion } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/features/auth/server/session";
import {
  InterviewAgendaList,
  type InterviewAgendaItem,
} from "@/features/interviews/components/interview-agenda-list";
import {
  INTERVIEW_RANGE_FILTERS,
  parseInterviewRangeFilter,
  type InterviewRangeFilter,
} from "@/features/interviews/interviews";
import { getRecruiterInterviews } from "@/features/interviews/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Interview agenda",
  description: "Upcoming and past interviews across companies you own.",
};

const rangeLabels: Record<InterviewRangeFilter, string> = {
  UPCOMING: "Upcoming",
  PAST: "Past",
  ALL: "All",
};

function rangeHref(value: InterviewRangeFilter) {
  return value === "ALL"
    ? "/recruiter/interviews"
    : `/recruiter/interviews?range=${value}`;
}

type RecruiterInterviewRow = {
  id: string;
  title: string;
  format: InterviewAgendaItem["format"];
  status: InterviewAgendaItem["status"];
  startAt: Date;
  endAt: Date;
  timeZone: string;
  application: {
    candidate: { name: string };
    job: { title: string; company: { name: string } };
  };
};

function toAgendaItem(row: RecruiterInterviewRow): InterviewAgendaItem {
  return {
    id: row.id,
    title: row.title,
    format: row.format,
    status: row.status,
    startAt: row.startAt,
    endAt: row.endAt,
    timeZone: row.timeZone,
    jobTitle: row.application.job.title,
    companyName: row.application.job.company.name,
    candidateName: row.application.candidate.name,
  };
}

export default async function RecruiterInterviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("RECRUITER", "/recruiter/interviews");
  const range = parseInterviewRangeFilter((await searchParams).range);
  const { upcoming, past, pendingResponseCount } = await getRecruiterInterviews(
    getPrismaClient(),
    session.user.id,
    new Date(),
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">Recruiter</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          Interview agenda
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          Interviews for applications to companies you own. All times are shown
          in the timezone each interview was scheduled in.
        </p>

        {pendingResponseCount > 0 ? (
          <Card className="mt-6" size="sm">
            <CardContent className="flex items-center gap-3">
              <MailQuestion
                aria-hidden="true"
                className="text-primary size-5 shrink-0"
              />
              <p className="text-sm leading-6">
                <span className="font-medium">
                  {pendingResponseCount}{" "}
                  {pendingResponseCount === 1 ? "interview" : "interviews"}
                </span>{" "}
                awaiting a candidate response.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          {INTERVIEW_RANGE_FILTERS.map((value) => (
            <Button
              key={value}
              variant={range === value ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={rangeHref(value)}>{rangeLabels[value]}</Link>
            </Button>
          ))}
        </div>

        <div className="mt-6 grid gap-6">
          {range !== "PAST" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Upcoming
                </CardTitle>
                <CardDescription>
                  Interviews that have not ended yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewAgendaList
                  items={upcoming.map(toAgendaItem)}
                  detailBasePath="/recruiter/interviews"
                  emptyMessage="No upcoming interviews. Schedule one from an application."
                />
              </CardContent>
            </Card>
          ) : null}

          {range !== "UPCOMING" ? (
            <Card>
              <CardHeader>
                <CardTitle>Past</CardTitle>
                <CardDescription>
                  Interviews whose scheduled time has passed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewAgendaList
                  items={past.map(toAgendaItem)}
                  detailBasePath="/recruiter/interviews"
                  emptyMessage="No past interviews."
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
