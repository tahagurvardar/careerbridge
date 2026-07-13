import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Download,
  FileText,
  GraduationCap,
  ExternalLink,
  Mail,
  MapPin,
  ShieldCheck,
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
import { ApplicationNotesPanel } from "@/features/application-notes/components/application-notes-panel";
import { getApplicationNotes } from "@/features/application-notes/server/data";
import { ApplicationStatusActions } from "@/features/applications/components/application-status-actions";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { getRecruiterApplication } from "@/features/applications/server/data";
import { formatFileSize } from "@/features/candidate-documents/documents";
import { InterviewAgendaList } from "@/features/interviews/components/interview-agenda-list";
import { InterviewScheduleSheet } from "@/features/interviews/components/interview-schedule-sheet";
import { isApplicationEligibleForInterview } from "@/features/interviews/interviews";
import { getRecruiterApplicationInterviews } from "@/features/interviews/server/data";
import { formatJobDate } from "@/features/jobs/format";
import {
  employmentTypeLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Application review",
  description: "Review a candidate application for one of your jobs.",
};

function yearRange(start: number, end: number | null, isCurrent: boolean) {
  return `${start} – ${isCurrent ? "Present" : (end ?? "—")}`;
}

function dateRange(start: Date, end: Date | null, isCurrent: boolean) {
  const to = isCurrent ? "Present" : end ? formatJobDate(end) : "—";
  return `${formatJobDate(start)} – ${to}`;
}

export default async function RecruiterApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/applications/${applicationId}`,
  );
  const prisma = getPrismaClient();
  const [application, noteData, interviews] = await Promise.all([
    getRecruiterApplication(prisma, session.user.id, applicationId),
    getApplicationNotes(prisma, session.user.id, applicationId),
    getRecruiterApplicationInterviews(prisma, session.user.id, applicationId),
  ]);

  if (!application || !noteData) notFound();

  const canScheduleInterview = isApplicationEligibleForInterview(
    application.status,
  );

  const { job, candidate } = application;
  const profile = candidate.candidateProfile;
  const attachedResume = application.resumeDocument;
  const jobIsPublic = job.status === "PUBLISHED" && job.company.isPublished;
  const timeline = application.history.map((entry) => ({
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    createdAt: entry.createdAt,
    by: entry.changedBy?.name ?? null,
  }));

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href="/recruiter/applications">
            <ArrowLeft aria-hidden="true" />
            Back to applications
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={application.status} />
              <span className="text-muted-foreground text-sm">
                Applied {formatJobDate(application.submittedAt)}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {candidate.name}
            </h1>
            <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <Mail aria-hidden="true" className="size-4" />
                {candidate.email}
              </span>
              {profile?.location ? (
                <span className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="size-4" />
                  {profile.location}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Candidate profile</CardTitle>
                <CardDescription>
                  {profile?.headline ?? "No headline provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                <p
                  className={
                    profile?.bio
                      ? "leading-7 whitespace-pre-line"
                      : "text-muted-foreground"
                  }
                >
                  {profile?.bio ?? "This candidate has not added a bio."}
                </p>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    Skills
                  </p>
                  {profile?.skills.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {profile.skills.map(({ skill }) => (
                        <Badge key={skill.name} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-2 text-sm">
                      No skills listed.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.experience.length ? (
                  <ul className="grid gap-5">
                    {profile.experience.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium">
                          {item.jobTitle} · {item.companyName}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {employmentTypeLabels[item.employmentType]}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {dateRange(
                            item.startDate,
                            item.endDate,
                            item.isCurrent,
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No experience listed.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profile?.education.length ? (
                  <ul className="grid gap-5">
                    {profile.education.map((item) => (
                      <li key={item.id}>
                        <p className="font-medium">{item.school}</p>
                        <p className="text-muted-foreground text-sm">
                          {[item.degree, item.fieldOfStudy]
                            .filter(Boolean)
                            .join(" · ") || "Program"}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {yearRange(
                            item.startYear,
                            item.endYear,
                            item.isCurrent,
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No education listed.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cover letter</CardTitle>
              </CardHeader>
              <CardContent>
                {application.coverLetter ? (
                  <p className="leading-7 whitespace-pre-line">
                    {application.coverLetter}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    This candidate applied without a cover letter.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  CV
                </CardTitle>
                <CardDescription>
                  The exact CV attached to this application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {attachedResume ? (
                  <div className="bg-muted/50 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-medium">
                        <FileText
                          aria-hidden="true"
                          className="text-muted-foreground size-4 shrink-0"
                        />
                        <span className="truncate">
                          {attachedResume.originalFilename}
                        </span>
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        {formatFileSize(attachedResume.sizeBytes)} · Attached{" "}
                        {formatJobDate(attachedResume.uploadedAt)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      asChild
                      className="shrink-0 self-start sm:self-center"
                    >
                      <a href={`/api/documents/${attachedResume.id}/download`}>
                        <Download aria-hidden="true" />
                        Download CV
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    No CV was attached to this application.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>Interviews</CardTitle>
                    <CardDescription className="mt-1.5">
                      Scheduling stays separate from the application status
                      controls.
                    </CardDescription>
                  </div>
                  {canScheduleInterview ? (
                    <InterviewScheduleSheet
                      triggerLabel="Schedule interview"
                      target={{
                        mode: "schedule",
                        applicationId: application.id,
                      }}
                    />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                {canScheduleInterview ? null : (
                  <p className="text-muted-foreground mb-4 text-sm leading-6">
                    New interviews are unavailable because this application is
                    in a final state. Existing interview history remains below.
                  </p>
                )}
                <InterviewAgendaList
                  items={interviews.map((interview) => ({
                    id: interview.id,
                    title: interview.title,
                    format: interview.format,
                    status: interview.status,
                    startAt: interview.startAt,
                    endAt: interview.endAt,
                    timeZone: interview.timeZone,
                    jobTitle: interview.application.job.title,
                    companyName: interview.application.job.company.name,
                    candidateName: interview.application.candidate.name,
                  }))}
                  detailBasePath="/recruiter/interviews"
                  emptyMessage="No interviews scheduled for this application yet."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application notes</CardTitle>
                <CardDescription>
                  Private context for Company owners reviewing this candidate.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationNotesPanel
                  applicationId={application.id}
                  currentUserId={session.user.id}
                  notes={noteData.active}
                  deletedNotes={noteData.deleted}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status history</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline entries={timeline} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline actions</CardTitle>
                <CardDescription>
                  Move this application forward.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm">
                    Current status
                  </span>
                  <ApplicationStatusBadge status={application.status} />
                </div>
                <Separator />
                <ApplicationStatusActions
                  applicationId={application.id}
                  status={application.status}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applied for</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="font-medium">{job.title}</p>
                <p className="text-muted-foreground">{job.company.name}</p>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {job.location ? <span>{job.location}</span> : null}
                  {job.employmentType ? (
                    <span>{employmentTypeLabels[job.employmentType]}</span>
                  ) : null}
                  {job.workplaceType ? (
                    <span>{workplaceTypeLabels[job.workplaceType]}</span>
                  ) : null}
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/recruiter/jobs/${job.id}/applications`}>
                      View job pipeline
                    </Link>
                  </Button>
                  {jobIsPublic ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/jobs/${job.slug}`}>
                        View public listing
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <p>
                This candidate&apos;s private profile is visible to you only
                because they applied to your job. Do not share it outside your
                hiring process.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
