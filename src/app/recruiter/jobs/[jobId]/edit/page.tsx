import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireRole } from "@/features/auth/server/session";
import { JobForm } from "@/features/jobs/components/job-form";
import { canEditJob } from "@/features/jobs/lifecycle";
import type { JobCreateInput } from "@/features/jobs/schemas";
import { getRecruiterJob } from "@/features/jobs/server/data";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit job",
  description: "Edit a job in your recruiter workspace.",
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/jobs/${jobId}/edit`,
  );
  const job = await getRecruiterJob(getPrismaClient(), session.user.id, jobId);

  if (!job) notFound();
  if (!canEditJob(job.status)) redirect(`/recruiter/jobs/${job.id}`);

  const defaultValues: JobCreateInput = {
    companyId: job.company.id,
    title: job.title,
    summary: job.summary ?? "",
    description: job.description ?? "",
    responsibilities: job.responsibilities ?? "",
    requirements: job.requirements ?? "",
    location: job.location ?? "",
    employmentType: job.employmentType ?? "",
    workplaceType: job.workplaceType ?? "",
    experienceLevel: job.experienceLevel ?? "",
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    salaryCurrency: job.salaryCurrency?.trim() ?? "",
    applicationDeadline: job.applicationDeadline
      ? job.applicationDeadline.toISOString().slice(0, 10)
      : "",
  };

  return (
    <WorkspaceFormShell
      backHref={`/recruiter/jobs/${job.id}`}
      backLabel="Back to job"
      eyebrow="Edit job"
      title={job.title}
      description="Update the job details. A published job must stay complete, so required fields cannot be cleared while it is live."
      cardTitle="Job details"
    >
      <JobForm jobId={job.id} defaultValues={defaultValues} />
    </WorkspaceFormShell>
  );
}
