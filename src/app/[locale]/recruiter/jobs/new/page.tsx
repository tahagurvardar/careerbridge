import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/features/auth/server/session";
import { JobForm } from "@/features/jobs/components/job-form";
import type { JobCreateInput } from "@/features/jobs/schemas";
import { getOwnedCompaniesForRecruiter } from "@/features/jobs/server/data";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/jobs/new">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.jobs.meta.newTitle,
    description: recruiter.jobs.meta.newDescription,
  };
}

export default async function NewJobPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.jobs.form;
  const session = await requireRole("RECRUITER", "/recruiter/jobs/new");
  const companies = await getOwnedCompaniesForRecruiter(
    getPrismaClient(),
    session.user.id,
  );

  if (companies.length === 0) {
    return (
      <WorkspaceFormShell
        backHref="/recruiter/jobs"
        backLabel={t.backToJobs}
        eyebrow={t.newEyebrow}
        title={t.newTitle}
        description={t.companyHint}
        cardTitle={t.companyRequiredTitle}
        locale={locale}
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
            <Building2 aria-hidden="true" />
          </span>
          <p className="text-muted-foreground max-w-md leading-7">
            {t.companyRequiredDescription}
          </p>
          <Button asChild>
            <Link
              href={localizeInternalPath("/recruiter/companies/new", locale)}
            >
              {t.createCompany}
            </Link>
          </Button>
        </div>
      </WorkspaceFormShell>
    );
  }

  const rawParams = await searchParams;
  const requestedCompanyId = Array.isArray(rawParams.companyId)
    ? rawParams.companyId[0]
    : rawParams.companyId;
  const preselectedCompanyId = companies.some(
    (company) => company.id === requestedCompanyId,
  )
    ? (requestedCompanyId as string)
    : "";

  const defaultValues: JobCreateInput = {
    companyId: preselectedCompanyId,
    title: "",
    summary: "",
    description: "",
    responsibilities: "",
    requirements: "",
    location: "",
    employmentType: "",
    workplaceType: "",
    experienceLevel: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "",
    applicationDeadline: "",
  };

  return (
    <WorkspaceFormShell
      backHref="/recruiter/jobs"
      backLabel={t.backToJobs}
      eyebrow={t.newEyebrow}
      title={t.newTitle}
      description={t.newDescription}
      cardTitle={t.detailsTitle}
      locale={locale}
    >
      <JobForm
        companies={companies}
        defaultValues={defaultValues}
        recruiter={dictionary.recruiter}
        validation={dictionary.validation}
        enumLabels={dictionary.labels}
        cancelLabel={dictionary.common.actions.cancel}
      />
    </WorkspaceFormShell>
  );
}
