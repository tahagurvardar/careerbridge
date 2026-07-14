import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Laptop2,
  MapPin,
} from "lucide-react";

import { Download, FileText } from "lucide-react";

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
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { WithdrawApplicationButton } from "@/features/applications/components/withdraw-application-button";
import {
  canCandidateWithdrawApplication,
  isActiveApplicationStatus,
} from "@/features/applications/lifecycle";
import { getCandidateApplication } from "@/features/applications/server/data";
import { AttachResumeButton } from "@/features/candidate-documents/components/attach-resume-button";
import { formatFileSize } from "@/features/candidate-documents/documents";
import { getCandidateCurrentResume } from "@/features/candidate-documents/server/data";
import { InterviewAgendaList } from "@/features/interviews/components/interview-agenda-list";
import { getCandidateApplicationInterviews } from "@/features/interviews/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/applications/[applicationId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { candidate } = await getDictionary(locale);
  return {
    title: candidate.applicationDetail.metaTitle,
    description: candidate.applicationDetail.metaDescription,
  };
}

export default async function CandidateApplicationDetailPage({
  params,
}: PageProps<"/[locale]/candidate/applications/[applicationId]">) {
  const { applicationId } = await params;
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.applicationDetail;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);

  const session = await requireRole(
    "CANDIDATE",
    `/candidate/applications/${applicationId}`,
  );
  const prisma = getPrismaClient();
  const [application, currentResume, interviews] = await Promise.all([
    getCandidateApplication(prisma, session.user.id, applicationId),
    getCandidateCurrentResume(prisma, session.user.id),
    getCandidateApplicationInterviews(prisma, session.user.id, applicationId),
  ]);

  if (!application) notFound();

  const pendingInterviewCount = interviews.filter(
    (interview) => interview.status === "PENDING_RESPONSE",
  ).length;

  const { job } = application;
  const jobIsPublic = job.status === "PUBLISHED" && job.company.isPublished;
  const canWithdraw = canCandidateWithdrawApplication(application.status);
  const attachedResume = application.resumeDocument;
  // A one-time attach is offered only when this application has no CV, is still
  // active, and the Candidate currently has a CV to attach.
  const canAttachResume =
    !attachedResume &&
    isActiveApplicationStatus(application.status) &&
    currentResume.hasResume;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localize("/candidate/applications")}>
            <ArrowLeft aria-hidden="true" />
            {t.backToApplications}
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
                {formatMessage(t.appliedOn, {
                  date: formatJobDate(locale, application.submittedAt),
                })}
                {application.withdrawnAt
                  ? ` · ${formatMessage(t.withdrawnOn, {
                      date: formatJobDate(locale, application.withdrawnAt),
                    })}`
                  : ""}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {job.title}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-4" />
              {job.company.name}
            </p>
          </div>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.roleTitle}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                {job.summary ? (
                  <p className="leading-7">{job.summary}</p>
                ) : (
                  <p className="text-muted-foreground">{t.noSummary}</p>
                )}
                <Separator />
                <dl className="text-muted-foreground grid gap-4 text-sm sm:grid-cols-3">
                  <MetaItem
                    icon={<MapPin aria-hidden="true" className="size-4" />}
                    label={t.location}
                    value={job.location}
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    icon={
                      <BriefcaseBusiness
                        aria-hidden="true"
                        className="size-4"
                      />
                    }
                    label={t.employment}
                    value={
                      job.employmentType
                        ? labels.employmentType[job.employmentType]
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                  <MetaItem
                    icon={<Laptop2 aria-hidden="true" className="size-4" />}
                    label={t.workplace}
                    value={
                      job.workplaceType
                        ? labels.workplaceType[job.workplaceType]
                        : null
                    }
                    fallback={t.notSpecified}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{t.interviewsTitle}</CardTitle>
                    <CardDescription className="mt-1.5">
                      {pendingInterviewCount > 0
                        ? formatCount(
                            locale,
                            pendingInterviewCount,
                            t.interviewsNeedResponse,
                          )
                        : t.interviewsScheduled}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={localize("/candidate/interviews")}>
                      {t.allInterviews}
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
                  }))}
                  detailBasePath="/candidate/interviews"
                  emptyMessage={t.noInterviews}
                  viewLabel={dictionary.common.actions.view}
                  locale={locale}
                  labels={labels}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.coverLetterTitle}</CardTitle>
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
                  {t.attachedCvTitle}
                </CardTitle>
                <CardDescription>{t.attachedCvDescription}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
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
                        {formatMessage(t.attachedOn, {
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
                        {t.download}
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {t.noCvAttached}
                  </p>
                )}

                {canAttachResume ? (
                  <div className="grid gap-2">
                    <AttachResumeButton
                      applicationId={application.id}
                      currentResumeFilename={currentResume.filename}
                      t={dictionary.candidate.attachResume}
                    />
                    <p className="text-muted-foreground text-xs leading-5">
                      {t.attachNote}
                    </p>
                  </div>
                ) : !attachedResume && currentResume.hasResume ? (
                  <p className="text-muted-foreground text-xs leading-5">
                    {t.attachNoLonger}
                  </p>
                ) : !attachedResume ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={localize("/candidate/documents")}>
                      {t.addCv}
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.statusHistoryTitle}</CardTitle>
                <CardDescription>{t.statusHistoryDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusTimeline
                  entries={application.history}
                  locale={locale}
                  labels={labels}
                  t={dictionary.applications.timeline}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.statusCardTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm">
                  {t.current}
                </span>
                <ApplicationStatusBadge
                  status={application.status}
                  label={labels.applicationStatus[application.status]}
                />
              </div>
              <Separator />
              {canWithdraw ? (
                <WithdrawApplicationButton
                  applicationId={application.id}
                  t={dictionary.applications.withdraw}
                />
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  {t.finalState}
                </p>
              )}
              {jobIsPublic ? (
                <Button variant="ghost" asChild>
                  <Link href={localize(`/jobs/${job.slug}`)}>
                    {t.viewPublicListing}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </Link>
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs leading-5">
                  {t.listingNotPublic}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function MetaItem({
  icon,
  label,
  value,
  fallback,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  fallback: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground mt-1 font-medium">{value || fallback}</dd>
    </div>
  );
}
