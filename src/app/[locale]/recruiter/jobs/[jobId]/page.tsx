import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarClock,
  ExternalLink,
  Pencil,
  ShieldAlert,
  StickyNote,
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
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { getJobApplicationSummary } from "@/features/applications/server/data";
import { JobLifecycleControls } from "@/features/jobs/components/job-lifecycle-controls";
import { JobSkillManager } from "@/features/jobs/components/job-skill-manager";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatJobDate, formatSalaryRange } from "@/features/jobs/format";
import { canEditJob } from "@/features/jobs/lifecycle";
import { getJobPublicationReadiness } from "@/features/jobs/publication";
import { isPastCalendarDate } from "@/features/jobs/schemas";
import { getRecruiterJob } from "@/features/jobs/server/data";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatCount, formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/jobs/[jobId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.jobs.meta.workspaceTitle,
    description: recruiter.jobs.meta.workspaceDescription,
  };
}

const APPLICANT_STAGES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export default async function JobWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale: localeParam, jobId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.jobs.workspace;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("RECRUITER", `/recruiter/jobs/${jobId}`);
  const prisma = getPrismaClient();
  const job = await getRecruiterJob(prisma, session.user.id, jobId);

  if (!job) notFound();

  const applicants = await getJobApplicationSummary(
    prisma,
    session.user.id,
    job.id,
  );

  const editable = canEditJob(job.status);
  const readiness = getJobPublicationReadiness({
    companyIsPublished: job.company.isPublished,
    skillCount: job.skills.length,
    job: {
      title: job.title,
      summary: job.summary,
      description: job.description,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      location: job.location,
      employmentType: job.employmentType,
      workplaceType: job.workplaceType,
      experienceLevel: job.experienceLevel,
    },
  });
  const deadlineInPast = job.applicationDeadline
    ? isPastCalendarDate(job.applicationDeadline.toISOString().slice(0, 10))
    : false;
  const canPublish = readiness.isReady && !deadlineInPast;
  const salary = formatSalaryRange(
    locale,
    dictionary.public.jobCard,
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );
  const publicationFieldLabels: Record<string, string> = {
    company: t.publishCompanyFirst,
    title: dictionary.recruiter.jobs.form.title,
    summary: t.summary,
    description: t.description,
    responsibilities: t.responsibilities,
    requirements: t.requirements,
    location: t.location,
    employmentType: t.employmentType,
    workplaceType: t.workplaceType,
    experienceLevel: t.experienceLevel,
    skills: t.atLeastOneSkill,
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localize("/recruiter/jobs")}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge
                status={job.status}
                label={labels.jobStatus[job.status]}
              />
              <Link
                href={localize(`/recruiter/companies/${job.company.id}`)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
              >
                <Building2 aria-hidden="true" className="size-4" />
                {job.company.name}
              </Link>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {job.title}
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              {formatMessage(t.created, {
                date: formatJobDate(locale, job.createdAt),
              })}
              {job.publishedAt
                ? ` · ${formatMessage(t.published, { date: formatJobDate(locale, job.publishedAt) })}`
                : ""}
              {job.closedAt
                ? ` · ${formatMessage(t.closed, { date: formatJobDate(locale, job.closedAt) })}`
                : ""}
            </p>
          </div>
          {editable ? (
            <Button size="lg" variant="outline" asChild>
              <Link href={localize(`/recruiter/jobs/${job.id}/edit`)}>
                <Pencil aria-hidden="true" />
                {t.edit}
              </Link>
            </Button>
          ) : null}
        </div>

        {job.moderationStatus === "HIDDEN" ||
        job.company.moderationStatus === "HIDDEN" ? (
          <div
            role="status"
            className="border-destructive/40 bg-destructive/5 mt-7 flex gap-3 rounded-xl border p-4"
          >
            <ShieldAlert
              aria-hidden="true"
              className="text-destructive mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="font-medium">
                {dictionary.recruiter.shared.moderationNotice}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {job.moderationStatus === "HIDDEN"
                  ? t.jobHidden
                  : t.companyHidden}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.detailsTitle}</CardTitle>
                <CardDescription>{t.detailsDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <DetailBlock
                  label={t.summary}
                  value={job.summary}
                  fallback={t.notAdded}
                />
                <Separator />
                <DetailBlock
                  label={t.description}
                  value={job.description}
                  fallback={t.notAdded}
                />
                <Separator />
                <DetailBlock
                  label={t.responsibilities}
                  value={job.responsibilities}
                  fallback={t.notAdded}
                />
                <Separator />
                <DetailBlock
                  label={t.requirements}
                  value={job.requirements}
                  fallback={t.notAdded}
                />
                <Separator />
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <MetaItem
                    label={t.location}
                    value={job.location}
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    label={t.employmentType}
                    value={
                      job.employmentType
                        ? labels.employmentType[job.employmentType]
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    label={t.workplaceType}
                    value={
                      job.workplaceType
                        ? labels.workplaceType[job.workplaceType]
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    label={t.experienceLevel}
                    value={
                      job.experienceLevel
                        ? labels.experienceLevel[job.experienceLevel]
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    label={t.salary}
                    value={salary}
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    label={t.deadline}
                    value={
                      job.applicationDeadline
                        ? formatJobDate(locale, job.applicationDeadline)
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.requiredSkills}</CardTitle>
                <CardDescription>{t.requiredSkillsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <JobSkillManager
                  jobId={job.id}
                  editable={editable}
                  skills={job.skills.map(({ skill }) => ({
                    id: skill.id,
                    name: skill.name,
                  }))}
                  labels={dictionary.recruiter.jobs.skills}
                  candidate={dictionary.candidate}
                  validation={dictionary.validation}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UsersRound
                        aria-hidden="true"
                        className="text-primary size-5"
                      />
                      {t.applicants}
                    </CardTitle>
                    <CardDescription>
                      {applicants.total === 0
                        ? t.noApplicants
                        : formatMessage(t.applicantNotes, {
                            applicants: formatCount(
                              locale,
                              applicants.total,
                              dictionary.recruiter.jobs.pipeline.applicantCount,
                            ),
                            notes: formatCount(
                              locale,
                              applicants.activeNoteCount,
                              dictionary.recruiter.applications.noteCount,
                            ),
                          })}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={localize(`/recruiter/jobs/${job.id}/applications`)}
                    >
                      {t.viewPipeline}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {APPLICANT_STAGES.map((status) => (
                    <div key={status} className="bg-muted/60 rounded-xl p-3">
                      <dt className="text-muted-foreground text-xs">
                        {labels.applicationStatus[status]}
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {formatInteger(locale, applicants.statusCounts[status])}
                      </dd>
                    </div>
                  ))}
                </dl>
                {applicants.recent.length ? (
                  <ul className="divide-y">
                    {applicants.recent.map((application) => (
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
                              {application.candidate.candidateProfile
                                ?.headline ?? t.noHeadline}{" "}
                              ·{" "}
                              {formatMessage(t.applied, {
                                date: formatJobDate(
                                  locale,
                                  application.submittedAt,
                                ),
                              })}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            {application._count.notes ? (
                              <Badge variant="outline" className="gap-1">
                                <StickyNote
                                  aria-hidden="true"
                                  className="size-3.5"
                                />
                                {formatInteger(
                                  locale,
                                  application._count.notes,
                                )}
                              </Badge>
                            ) : null}
                            <ApplicationStatusBadge
                              status={application.status}
                              label={
                                labels.applicationStatus[application.status]
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
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                  <BarChart3 aria-hidden="true" className="size-5" />
                </span>
                <CardTitle className="mt-3 text-lg">
                  {t.analyticsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-6">
                  {t.analyticsDescription}
                </p>
                <Badge variant="outline" className="mt-4">
                  {t.comingLater}
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.lifecycleTitle}</CardTitle>
              <CardDescription>{t.lifecycleDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!readiness.isReady ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">
                    {t.completeBeforePublishing}
                  </p>
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                    {readiness.missingFields.map(({ field }) => (
                      <li key={field}>
                        {publicationFieldLabels[field] ??
                          dictionary.recruiter.jobs.actions.invalid}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : deadlineInPast ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">{t.updateDeadline}</p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    {t.deadlinePast}
                  </p>
                </div>
              ) : job.status === "DRAFT" ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm leading-6">
                  <CalendarClock aria-hidden="true" className="size-4" />
                  {t.ready}
                </p>
              ) : null}

              <JobLifecycleControls
                jobId={job.id}
                status={job.status}
                canPublish={canPublish}
                labels={dictionary.recruiter.jobs.lifecycle}
              />

              {job.status === "PUBLISHED" &&
              job.moderationStatus === "VISIBLE" &&
              job.company.moderationStatus === "VISIBLE" ? (
                <Button variant="ghost" asChild>
                  <Link href={localize(`/jobs/${job.slug}`)}>
                    {t.viewPublic}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function DetailBlock({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null;
  fallback: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p
        className={
          value
            ? "mt-1.5 leading-7 whitespace-pre-line"
            : "text-muted-foreground mt-1.5"
        }
      >
        {value || fallback}
      </p>
    </div>
  );
}

function MetaItem({
  label,
  value,
  fallback,
}: {
  label: string;
  value: string | null;
  fallback: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || fallback}</dd>
    </div>
  );
}
