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
import { getCandidateInterviews } from "@/features/interviews/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/interviews">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { candidateList } = (await getDictionary(locale)).interviews;
  return {
    title: candidateList.metaTitle,
    description: candidateList.metaDescription,
  };
}

function rangeHref(base: string, value: InterviewRangeFilter) {
  return value === "ALL" ? base : `${base}?range=${value}`;
}

type CandidateInterviewRow = {
  id: string;
  title: string;
  format: InterviewAgendaItem["format"];
  status: InterviewAgendaItem["status"];
  startAt: Date;
  endAt: Date;
  timeZone: string;
  application: {
    job: { title: string; company: { name: string } };
  };
};

function toAgendaItem(row: CandidateInterviewRow): InterviewAgendaItem {
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
  };
}

export default async function CandidateInterviewsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/interviews">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.interviews.candidateList;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("CANDIDATE", "/candidate/interviews");
  const range = parseInterviewRangeFilter((await searchParams).range);
  const { upcoming, past, pendingResponseCount } = await getCandidateInterviews(
    getPrismaClient(),
    session.user.id,
    new Date(),
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Badge variant="secondary">{t.badge}</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
          {t.title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
          {t.description}
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
                  {formatCount(
                    locale,
                    pendingResponseCount,
                    t.awaitingResponse,
                  )}
                </span>
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
              <Link href={localize(rangeHref("/candidate/interviews", value))}>
                {dictionary.labels.interviewRangeFilter[value]}
              </Link>
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
                  {t.upcomingTitle}
                </CardTitle>
                <CardDescription>{t.upcomingDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewAgendaList
                  items={upcoming.map(toAgendaItem)}
                  detailBasePath="/candidate/interviews"
                  emptyMessage={t.upcomingEmpty}
                  viewLabel={t.view}
                  locale={locale}
                  labels={dictionary.labels}
                />
              </CardContent>
            </Card>
          ) : null}

          {range !== "UPCOMING" ? (
            <Card>
              <CardHeader>
                <CardTitle>{t.pastTitle}</CardTitle>
                <CardDescription>{t.pastDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewAgendaList
                  items={past.map(toAgendaItem)}
                  detailBasePath="/candidate/interviews"
                  emptyMessage={t.pastEmpty}
                  viewLabel={t.view}
                  locale={locale}
                  labels={dictionary.labels}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
