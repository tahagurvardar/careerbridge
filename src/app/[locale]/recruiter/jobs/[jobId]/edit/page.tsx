import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireRole } from "@/features/auth/server/session";
import { JobForm } from "@/features/jobs/components/job-form";
import { canEditJob } from "@/features/jobs/lifecycle";
import type { JobCreateInput } from "@/features/jobs/schemas";
import { getRecruiterJob } from "@/features/jobs/server/data";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/jobs/[jobId]/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.jobs.meta.editTitle,
    description: recruiter.jobs.meta.editDescription,
  };
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale: localeParam, jobId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.jobs.form;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/jobs/${jobId}/edit`,
  );
  const job = await getRecruiterJob(getPrismaClient(), session.user.id, jobId);

  if (!job) notFound();
  if (!canEditJob(job.status)) {
    redirect(localizeInternalPath(`/recruiter/jobs/${job.id}`, locale));
  }

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
      backLabel={t.backToJob}
      eyebrow={t.editEyebrow}
      title={job.title}
      description={t.editDescription}
      cardTitle={t.detailsTitle}
      locale={locale}
    >
      <JobForm
        jobId={job.id}
        defaultValues={defaultValues}
        recruiter={dictionary.recruiter}
        validation={dictionary.validation}
        enumLabels={dictionary.labels}
        cancelLabel={dictionary.common.actions.cancel}
      />
    </WorkspaceFormShell>
  );
}
