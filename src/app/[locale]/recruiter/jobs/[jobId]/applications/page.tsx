import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  StickyNote,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { getJobApplicantPipeline } from "@/features/applications/server/data";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatJobDate } from "@/features/jobs/format";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatCount, formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/jobs/[jobId]/applications">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.jobs.meta.pipelineTitle,
    description: recruiter.jobs.meta.pipelineDescription,
  };
}

const pipelineStages = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export default async function JobApplicantPipelinePage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale: localeParam, jobId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.jobs.pipeline;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/jobs/${jobId}/applications`,
  );
  const pipeline = await getJobApplicantPipeline(
    getPrismaClient(),
    session.user.id,
    jobId,
  );

  if (!pipeline) notFound();

  const { job, applications, statusCounts, total } = pipeline;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localize(`/recruiter/jobs/${job.id}`)}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge
                status={job.status}
                label={dictionary.labels.jobStatus[job.status]}
              />
              <span className="text-muted-foreground text-sm">
                {job.company.name}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {job.title}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5">
              <UsersRound aria-hidden="true" className="size-4" />
              {formatCount(locale, total, t.applicantCount)}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={localize(`/recruiter/applications?jobId=${job.id}`)}>
              {t.openApplications}
            </Link>
          </Button>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {pipelineStages.map((status) => (
            <div key={status} className="bg-muted/60 rounded-xl p-4">
              <dt className="text-muted-foreground text-sm">
                {dictionary.labels.applicationStatus[status]}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">
                {formatInteger(locale, statusCounts[status])}
              </dd>
            </div>
          ))}
        </dl>

        <h2 className="mt-8 text-lg font-semibold">{t.applicants}</h2>

        {applications.length ? (
          <ul className="mt-4 grid gap-4">
            {applications.map((application) => (
              <li key={application.id}>
                <Link
                  href={localize(`/recruiter/applications/${application.id}`)}
                  className="group/app focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="group-hover/app:ring-primary/30 transition">
                    <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ApplicationStatusBadge
                            status={application.status}
                            label={
                              dictionary.labels.applicationStatus[
                                application.status
                              ]
                            }
                          />
                          <span className="text-muted-foreground text-xs">
                            {formatMessage(t.applied, {
                              date: formatJobDate(
                                locale,
                                application.submittedAt,
                              ),
                            })}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-lg font-semibold">
                          {application.candidate.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                          {application.candidate.candidateProfile?.headline ??
                            t.noHeadline}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <StickyNote
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {formatCount(
                              locale,
                              application._count.notes,
                              t.noteCount,
                            )}
                          </Badge>
                          {application.candidate.candidateProfile?.location ? (
                            <span className="text-muted-foreground flex items-center gap-1 text-xs">
                              <MapPin aria-hidden="true" className="size-3.5" />
                              {application.candidate.candidateProfile.location}
                            </span>
                          ) : null}
                          {application.candidate.candidateProfile?.skills.map(
                            ({ skill }) => (
                              <Badge key={skill.name} variant="secondary">
                                {skill.name}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                      <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
                        {t.review}
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <UsersRound aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{t.emptyTitle}</h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {job.status === "PUBLISHED" ? t.liveEmpty : t.privateEmpty}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
