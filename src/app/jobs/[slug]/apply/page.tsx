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
import {
  employmentTypeLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Apply to a job",
  description: "Submit your application on CareerBridge.",
};

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireRole("CANDIDATE", `/jobs/${slug}/apply`);
  const prisma = getPrismaClient();
  const job = await getJobForApplication(prisma, slug);

  if (!job) notFound();

  const existing = await getCandidateApplicationForJob(
    prisma,
    session.user.id,
    job.id,
  );
  if (existing) redirect(`/candidate/applications/${existing.id}`);

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
    job.workplaceType ? workplaceTypeLabels[job.workplaceType] : null,
    job.employmentType ? employmentTypeLabels[job.employmentType] : null,
  ].filter(Boolean);

  return (
    <WorkspaceFormShell
      backHref={`/jobs/${slug}`}
      backLabel="Back to job"
      eyebrow="Apply"
      title={`Apply to ${job.title}`}
      description={contextParts.join(" · ")}
      cardTitle="Your application"
    >
      {deadlinePassed ? (
        <Notice
          icon={<Clock aria-hidden="true" className="size-5" />}
          title="Applications are closed"
          body="The application deadline for this job has passed, so new applications can no longer be submitted."
          action={
            <Button variant="outline" asChild>
              <Link href="/jobs">Browse other jobs</Link>
            </Button>
          }
        />
      ) : !readiness.isReady ? (
        <Notice
          icon={<CircleAlert aria-hidden="true" className="size-5" />}
          title="Complete your profile first"
          body="Applying requires a minimum profile so hiring teams can evaluate your fit."
          action={
            <Button variant="outline" asChild>
              <Link href="/candidate/profile/edit">Complete your profile</Link>
            </Button>
          }
        >
          <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-sm">
            {readiness.missingFields.map(({ field, label }) => (
              <li key={field}>{label}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <div className="grid gap-6">
          <div className="bg-muted/50 grid gap-3 rounded-xl p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheck aria-hidden="true" className="text-primary size-4" />
              What the company sees
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              Submitting shares your profile — name, email, headline, location,
              skills, education, and experience — plus this cover letter with{" "}
              {job.company.name}&apos;s hiring team. Your details stay private
              to that team and are shared only because you applied.
            </p>
          </div>

          <div className="grid gap-2 rounded-xl border p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileText aria-hidden="true" className="text-primary size-4" />
              Your CV
            </p>
            {currentResume.hasResume ? (
              <p className="text-muted-foreground text-sm leading-6">
                Your current CV{" "}
                <span className="text-foreground font-medium">
                  {currentResume.filename}
                </span>{" "}
                ({formatFileSize(currentResume.sizeBytes)}) will be attached to
                this application.
              </p>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                You have no current CV. You can still apply without a CV, or{" "}
                <Link
                  href="/candidate/documents"
                  className="text-primary font-medium underline-offset-4 hover:underline"
                >
                  add one first
                </Link>
                .
              </p>
            )}
          </div>

          <ApplyForm slug={slug} />
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
