import type { Metadata } from "next";

import { requireRole } from "@/features/auth/server/session";
import { CompanyForm } from "@/features/recruiter-company/components/company-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";

export const metadata: Metadata = {
  title: "Create company",
  description: "Create a private company profile and owner membership.",
};

export default async function NewCompanyPage() {
  await requireRole("RECRUITER", "/recruiter/companies/new");

  return (
    <WorkspaceFormShell
      backHref="/recruiter/companies"
      backLabel="Back to companies"
      eyebrow="Company workspace"
      title="Create a company"
      description="The profile starts private. CareerBridge generates its public slug and records you as owner in one transaction."
      cardTitle="Company details"
    >
      <CompanyForm
        defaultValues={{
          name: "",
          tagline: "",
          description: "",
          industry: "",
          headquarters: "",
          websiteUrl: "",
          companySize: "",
          foundedYear: "",
        }}
      />
    </WorkspaceFormShell>
  );
}
