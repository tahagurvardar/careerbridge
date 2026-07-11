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
import {
  employmentTypeLabels,
  experienceLevelLabels,
  isPastCalendarDate,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { getRecruiterJob } from "@/features/jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Job workspace",
  description: "Manage a private job in your recruiter workspace.",
};

const APPLICANT_STAGES = [
  ["SUBMITTED", "New"],
  ["UNDER_REVIEW", "Review"],
  ["INTERVIEW", "Interview"],
  ["OFFER", "Offer"],
  ["HIRED", "Hired"],
  ["REJECTED", "Rejected"],
  ["WITHDRAWN", "Withdrawn"],
] as const;

export default async function JobWorkspacePage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
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
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href="/recruiter/jobs">
            <ArrowLeft aria-hidden="true" />
            Back to jobs
          </Link>
        </Button>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <JobStatusBadge status={job.status} />
              <Link
                href={`/recruiter/companies/${job.company.id}`}
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
              Created {formatJobDate(job.createdAt)}
              {job.publishedAt
                ? ` · Published ${formatJobDate(job.publishedAt)}`
                : ""}
              {job.closedAt ? ` · Closed ${formatJobDate(job.closedAt)}` : ""}
            </p>
          </div>
          {editable ? (
            <Button size="lg" variant="outline" asChild>
              <Link href={`/recruiter/jobs/${job.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit job
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Job details</CardTitle>
                <CardDescription>
                  Private workspace view. Plain text is shown exactly as
                  entered.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <DetailBlock label="Summary" value={job.summary} />
                <Separator />
                <DetailBlock label="Description" value={job.description} />
                <Separator />
                <DetailBlock
                  label="Responsibilities"
                  value={job.responsibilities}
                />
                <Separator />
                <DetailBlock label="Requirements" value={job.requirements} />
                <Separator />
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <MetaItem label="Location" value={job.location} />
                  <MetaItem
                    label="Employment type"
                    value={
                      job.employmentType
                        ? employmentTypeLabels[job.employmentType]
                        : null
                    }
                  />
                  <MetaItem
                    label="Workplace type"
                    value={
                      job.workplaceType
                        ? workplaceTypeLabels[job.workplaceType]
                        : null
                    }
                  />
                  <MetaItem
                    label="Experience level"
                    value={
                      job.experienceLevel
                        ? experienceLevelLabels[job.experienceLevel]
                        : null
                    }
                  />
                  <MetaItem label="Salary" value={salary} />
                  <MetaItem
                    label="Application deadline"
                    value={
                      job.applicationDeadline
                        ? formatJobDate(job.applicationDeadline)
                        : null
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Required skills</CardTitle>
                <CardDescription>
                  At least one skill is required before a job can be published.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <JobSkillManager
                  jobId={job.id}
                  editable={editable}
                  skills={job.skills.map(({ skill }) => ({
                    id: skill.id,
                    name: skill.name,
                  }))}
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
                      Applicants
                    </CardTitle>
                    <CardDescription>
                      {applicants.total === 0
                        ? "No applicants yet."
                        : `${applicants.total} ${
                            applicants.total === 1 ? "applicant" : "applicants"
                          }`}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/recruiter/jobs/${job.id}/applications`}>
                      View pipeline
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {APPLICANT_STAGES.map(([status, label]) => (
                    <div key={status} className="bg-muted/60 rounded-xl p-3">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {applicants.statusCounts[status]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {applicants.recent.length ? (
                  <ul className="divide-y">
                    {applicants.recent.map((application) => (
                      <li key={application.id}>
                        <Link
                          href={`/recruiter/applications/${application.id}`}
                          className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {application.candidate.name}
                            </span>
                            <span className="text-muted-foreground block truncate text-xs">
                              {application.candidate.candidateProfile
                                ?.headline ?? "No headline"}{" "}
                              · Applied {formatJobDate(application.submittedAt)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <ApplicationStatusBadge
                              status={application.status}
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
                <CardTitle className="mt-3 text-lg">Job analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-6">
                  Views and conversion analytics will arrive in a later phase.
                </p>
                <Badge variant="outline" className="mt-4">
                  Coming later
                </Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lifecycle</CardTitle>
              <CardDescription>
                Publishing, closing, and archiving are controlled here.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!readiness.isReady ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">
                    Complete before publishing
                  </p>
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                    {readiness.missingFields.map(({ field, label }) => (
                      <li key={field}>{label}</li>
                    ))}
                  </ul>
                </div>
              ) : deadlineInPast ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">
                    Update the application deadline
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    The deadline is in the past. Edit the job or clear the
                    deadline before publishing.
                  </p>
                </div>
              ) : job.status === "DRAFT" ? (
                <p className="text-muted-foreground flex items-center gap-2 text-sm leading-6">
                  <CalendarClock aria-hidden="true" className="size-4" />
                  This draft meets every publication requirement.
                </p>
              ) : null}

              <JobLifecycleControls
                jobId={job.id}
                status={job.status}
                canPublish={canPublish}
              />

              {job.status === "PUBLISHED" ? (
                <Button variant="ghost" asChild>
                  <Link href={`/jobs/${job.slug}`}>
                    View public listing
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
}: {
  label: string;
  value: string | null;
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
        {value || "Not added yet."}
      </p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value || "Not specified"}</dd>
    </div>
  );
}
