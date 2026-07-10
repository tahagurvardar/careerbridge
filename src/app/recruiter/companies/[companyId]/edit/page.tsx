import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/features/auth/server/session";
import { CompanyForm } from "@/features/recruiter-company/components/company-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getOwnedCompany } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit company",
  description: "Edit an owner-managed CareerBridge company profile.",
};

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/companies/${companyId}/edit`,
  );
  const company = await getOwnedCompany(
    getPrismaClient(),
    session.user.id,
    companyId,
  );

  if (!company) notFound();

  return (
    <WorkspaceFormShell
      backHref={`/recruiter/companies/${company.id}`}
      backLabel="Back to workspace"
      eyebrow="Company workspace"
      title={`Edit ${company.name}`}
      description="Only owners can save these details. The public slug remains stable when the company name changes."
      cardTitle="Company details"
    >
      <CompanyForm
        companyId={company.id}
        defaultValues={{
          name: company.name,
          tagline: company.tagline ?? "",
          description: company.description ?? "",
          industry: company.industry ?? "",
          headquarters: company.headquarters ?? "",
          websiteUrl: company.websiteUrl ?? "",
          companySize: company.companySize ?? "",
          foundedYear: company.foundedYear?.toString() ?? "",
        }}
      />
    </WorkspaceFormShell>
  );
}
