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
import type { RouteLocale } from "@/i18n/config";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/applications/[applicationId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.applicationDetail.metaTitle,
    description: recruiter.applicationDetail.metaDescription,
  };
}

function yearRange(
  locale: RouteLocale,
  start: number,
  end: number | null,
  isCurrent: boolean,
  present: string,
) {
  return `${formatInteger(locale, start)} – ${isCurrent ? present : end ? formatInteger(locale, end) : "—"}`;
}

function dateRange(
  locale: RouteLocale,
  start: Date,
  end: Date | null,
  isCurrent: boolean,
  present: string,
) {
  const to = isCurrent ? present : end ? formatJobDate(locale, end) : "—";
  return `${formatJobDate(locale, start)} – ${to}`;
}

export default async function RecruiterApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; applicationId: string }>;
}) {
  const { locale: localeParam, applicationId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.applicationDetail;
  const localize = (path: string) => localizeInternalPath(path, locale);
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
          <Link href={localize("/recruiter/applications")}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge
                status={application.status}
                label={labels.applicationStatus[application.status]}
              />
              <span className="text-muted-foreground text-sm">
                {formatMessage(t.applied, {
                  date: formatJobDate(locale, application.submittedAt),
                })}
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
                <CardTitle>{t.candidateProfile}</CardTitle>
                <CardDescription>
                  {profile?.headline ?? t.noHeadline}
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
                  {profile?.bio ?? t.noBio}
                </p>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {t.skills}
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
                      {t.noSkills}
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
                  {t.experience}
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
                          {labels.employmentType[item.employmentType]}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {dateRange(
                            locale,
                            item.startDate,
                            item.endDate,
                            item.isCurrent,
                            dictionary.candidate.profile.present,
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t.noExperience}
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
                  {t.education}
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
                            .join(" · ") || t.program}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {yearRange(
                            locale,
                            item.startYear,
                            item.endYear,
                            item.isCurrent,
                            dictionary.candidate.profile.present,
                          )}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t.noEducation}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.coverLetter}</CardTitle>
              </CardHeader>
              <CardContent>
                {application.coverLetter ? (
                  <p className="leading-7 whitespace-pre-line">
                    {application.coverLetter}
                  </p>
                ) : (
                  <p className="text-muted-foreground">{t.noCoverLetter}</p>
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
                  {t.cv}
                </CardTitle>
                <CardDescription>{t.cvDescription}</CardDescription>
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
                        {formatFileSize(attachedResume.sizeBytes)} ·{" "}
                        {formatMessage(t.attached, {
                          date: formatJobDate(
                            locale,
                            attachedResume.uploadedAt,
                          ),
                        })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      asChild
                      className="shrink-0 self-start sm:self-center"
                    >
                      <a href={`/api/documents/${attachedResume.id}/download`}>
                        <Download aria-hidden="true" />
                        {t.downloadCv}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {t.noCv}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.interviews}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {t.interviewsDescription}
                    </CardDescription>
                  </div>
                  {canScheduleInterview ? (
                    <InterviewScheduleSheet
                      triggerLabel={t.scheduleInterview}
                      labels={dictionary.interviews.scheduleForm}
                      formatLabels={labels.interviewFormat}
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
                    {t.finalInterviewState}
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
                  emptyMessage={t.noInterviews}
                  viewLabel={dictionary.common.actions.view}
                  locale={locale}
                  labels={labels}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.notes}</CardTitle>
                <CardDescription>{t.notesDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationNotesPanel
                  applicationId={application.id}
                  currentUserId={session.user.id}
                  notes={noteData.active}
                  deletedNotes={noteData.deleted}
                  labels={dictionary.recruiter.notes}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.statusHistory}</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusTimeline
                  entries={timeline}
                  locale={locale}
                  labels={labels}
                  t={dictionary.applications.timeline}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.pipelineActions}</CardTitle>
                <CardDescription>{t.pipelineDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm">
                    {t.currentStatus}
                  </span>
                  <ApplicationStatusBadge
                    status={application.status}
                    label={labels.applicationStatus[application.status]}
                  />
                </div>
                <Separator />
                <ApplicationStatusActions
                  applicationId={application.id}
                  status={application.status}
                  labels={dictionary.recruiter.applicationActions}
                  statusLabels={labels.applicationStatus}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.appliedFor}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <p className="font-medium">{job.title}</p>
                <p className="text-muted-foreground">{job.company.name}</p>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {job.location ? <span>{job.location}</span> : null}
                  {job.employmentType ? (
                    <span>{labels.employmentType[job.employmentType]}</span>
                  ) : null}
                  {job.workplaceType ? (
                    <span>{labels.workplaceType[job.workplaceType]}</span>
                  ) : null}
                </div>
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={localize(`/recruiter/jobs/${job.id}/applications`)}
                    >
                      {t.viewPipeline}
                    </Link>
                  </Button>
                  {jobIsPublic ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={localize(`/jobs/${job.slug}`)}>
                        {t.viewPublic}
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
              <p>{t.privacy}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
