import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/features/auth/server/session";
import { JobForm } from "@/features/jobs/components/job-form";
import type { JobCreateInput } from "@/features/jobs/schemas";
import { getOwnedCompaniesForRecruiter } from "@/features/jobs/server/data";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Create a job",
  description: "Create a new draft job for a company you own.",
};

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("RECRUITER", "/recruiter/jobs/new");
  const companies = await getOwnedCompaniesForRecruiter(
    getPrismaClient(),
    session.user.id,
  );

  if (companies.length === 0) {
    return (
      <WorkspaceFormShell
        backHref="/recruiter/jobs"
        backLabel="Back to jobs"
        eyebrow="New job"
        title="Create a job"
        description="Jobs belong to a company you own."
        cardTitle="A company is required first"
      >
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
            <Building2 aria-hidden="true" />
          </span>
          <p className="text-muted-foreground max-w-md leading-7">
            You need to own a company before you can create a job. Create a
            company workspace, then return here.
          </p>
          <Button asChild>
            <Link href="/recruiter/companies/new">Create a company</Link>
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
      backLabel="Back to jobs"
      eyebrow="New job"
      title="Create a job"
      description="New jobs start as a private draft. Add details and required skills, then publish when it is complete."
      cardTitle="Job details"
    >
      <JobForm companies={companies} defaultValues={defaultValues} />
    </WorkspaceFormShell>
  );
}
