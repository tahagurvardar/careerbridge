import type { Metadata } from "next";

import { requireRole } from "@/features/auth/server/session";
import { RecruiterProfileForm } from "@/features/recruiter-company/components/recruiter-profile-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getRecruiterProfile } from "@/features/recruiter-company/server/data";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/profile/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.profile.editTitle,
    description: recruiter.profile.editDescription,
  };
}

export default async function EditRecruiterProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.profile;
  const session = await requireRole("RECRUITER", "/recruiter/profile/edit");
  const profile = await getRecruiterProfile(getPrismaClient(), session.user.id);

  return (
    <WorkspaceFormShell
      backHref="/recruiter/profile"
      backLabel={t.back}
      eyebrow={t.editEyebrow}
      title={t.editTitle}
      description={t.editDescription}
      cardTitle={t.detailsTitle}
      locale={locale}
    >
      <RecruiterProfileForm
        defaultValues={{
          jobTitle: profile?.jobTitle ?? "",
          bio: profile?.bio ?? "",
          linkedinUrl: profile?.linkedinUrl ?? "",
        }}
        labels={{
          form: dictionary.recruiter.profileForm,
          common: dictionary.common.actions,
        }}
        recruiter={dictionary.recruiter}
        validation={dictionary.validation}
      />
    </WorkspaceFormShell>
  );
}
