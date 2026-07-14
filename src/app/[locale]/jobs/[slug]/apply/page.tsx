import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleAlert, Clock, FileText, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/features/auth/server/session";
import { ApplyForm } from "@/features/applications/components/apply-form";
import {
  getCandidateProfileReadiness,
  isApplicationDeadlinePassed,
} from "@/features/applications/eligibility";
import {
  getCandidateApplicationForJob,
  getCandidateApplyProfile,
  getJobForApplication,
} from "@/features/applications/server/data";
import { formatFileSize } from "@/features/candidate-documents/documents";
import { getCandidateCurrentResume } from "@/features/candidate-documents/server/data";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]/apply">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { public: publicDictionary } = await getDictionary(locale);
  return {
    title: publicDictionary.applyPage.metaTitle,
    description: publicDictionary.applyPage.metaDescription,
  };
}

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: localeParam, slug } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.applyPage;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("CANDIDATE", `/jobs/${slug}/apply`);
  const prisma = getPrismaClient();
  const job = await getJobForApplication(prisma, slug);

  if (!job) notFound();

  const existing = await getCandidateApplicationForJob(
    prisma,
    session.user.id,
    job.id,
  );
  if (existing) redirect(localize(`/candidate/applications/${existing.id}`));

  const [applyProfile, currentResume] = await Promise.all([
    getCandidateApplyProfile(prisma, session.user.id),
    getCandidateCurrentResume(prisma, session.user.id),
  ]);
  const deadlinePassed = isApplicationDeadlinePassed(job.applicationDeadline);
  const readiness = getCandidateProfileReadiness({
    headline: applyProfile.headline,
    location: applyProfile.location,
    skillCount: applyProfile.skillCount,
  });

  const contextParts = [
    job.company.name,
    job.location,
    job.workplaceType
      ? dictionary.labels.workplaceType[job.workplaceType]
      : null,
    job.employmentType
      ? dictionary.labels.employmentType[job.employmentType]
      : null,
  ].filter(Boolean);
  const readinessLabels: Record<string, string> = {
    headline: t.profileHeadline,
    location: t.profileLocation,
    skills: t.profileSkill,
  };

  return (
    <WorkspaceFormShell
      backHref={`/jobs/${slug}`}
      backLabel={t.back}
      eyebrow={t.eyebrow}
      title={formatMessage(t.title, { jobTitle: job.title })}
      description={contextParts.join(" · ")}
      cardTitle={t.cardTitle}
      locale={locale}
    >
      {deadlinePassed ? (
        <Notice
          icon={<Clock aria-hidden="true" className="size-5" />}
          title={t.closedTitle}
          body={t.closedDescription}
          action={
            <Button variant="outline" asChild>
              <Link href={localize("/jobs")}>{t.browseJobs}</Link>
            </Button>
          }
        />
      ) : !readiness.isReady ? (
        <Notice
          icon={<CircleAlert aria-hidden="true" className="size-5" />}
          title={t.profileTitle}
          body={t.profileDescription}
          action={
            <Button variant="outline" asChild>
              <Link href={localize("/candidate/profile/edit")}>
                {t.completeProfile}
              </Link>
            </Button>
          }
        >
          <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-sm">
            {readiness.missingFields.map(({ field }) => (
              <li key={field}>{readinessLabels[field] ?? t.profileTitle}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <div className="grid gap-6">
          <div className="bg-muted/50 grid gap-3 rounded-xl p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck aria-hidden="true" className="text-primary size-4" />
              {t.companySees}
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              {formatMessage(t.privacy, { companyName: job.company.name })}
            </p>
          </div>

          <div className="grid gap-2 rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileText aria-hidden="true" className="text-primary size-4" />
              {t.yourCv}
            </p>
            {currentResume.hasResume ? (
              <p className="text-muted-foreground text-sm leading-6">
                {formatMessage(t.cvAttached, {
                  filename: currentResume.filename,
                  size: formatFileSize(currentResume.sizeBytes),
                })}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                <InlineActionMessage
                  message={t.noCv}
                  action={
                    <Link
                      href={localize("/candidate/documents")}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {t.addCv}
                    </Link>
                  }
                />
              </p>
            )}
          </div>

          <ApplyForm
            slug={slug}
            labels={t}
            validation={dictionary.validation}
          />
        </div>
      )}
    </WorkspaceFormShell>
  );
}

function Notice({
  icon,
  title,
  body,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        {icon}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-md leading-7">{body}</p>
      {children}
      <div className="mt-2">{action}</div>
    </div>
  );
}

function InlineActionMessage({
  message,
  action,
}: {
  message: string;
  action: React.ReactNode;
}) {
  const [before, after = ""] = message.split("{action}");
  return (
    <>
      {before}
      {action}
      {after}
    </>
  );
}
