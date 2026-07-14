import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/features/auth/server/session";
import { CompanyForm } from "@/features/recruiter-company/components/company-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getOwnedCompany } from "@/features/recruiter-company/server/data";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/companies/[companyId]/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.companies.detailsTitle,
    description: recruiter.companies.editDescription,
  };
}

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale: localeParam, companyId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.companies;
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
      backLabel={t.backToWorkspace}
      eyebrow={dictionary.recruiter.shared.companyWorkspace}
      title={formatMessage(t.editTitle, { companyName: company.name })}
      description={t.editDescription}
      cardTitle={t.detailsTitle}
      locale={locale}
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
        labels={{
          form: dictionary.recruiter.companyForm,
          common: dictionary.common.actions,
          companySize: dictionary.labels.companySize,
        }}
        recruiter={dictionary.recruiter}
        validation={dictionary.validation}
      />
    </WorkspaceFormShell>
  );
}
