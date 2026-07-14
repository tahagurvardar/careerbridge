import type { Metadata } from "next";

import { requireRole } from "@/features/auth/server/session";
import { CompanyForm } from "@/features/recruiter-company/components/company-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/companies/new">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.companies.newTitle,
    description: recruiter.companies.newDescription,
  };
}

export default async function NewCompanyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.companies;
  await requireRole("RECRUITER", "/recruiter/companies/new");

  return (
    <WorkspaceFormShell
      backHref="/recruiter/companies"
      backLabel={t.backToCompanies}
      eyebrow={dictionary.recruiter.shared.companyWorkspace}
      title={t.newTitle}
      description={t.newDescription}
      cardTitle={t.detailsTitle}
      locale={locale}
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
