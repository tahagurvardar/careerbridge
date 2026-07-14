import type { Metadata } from "next";

import { BasicProfileForm } from "@/features/candidate-profile/components/basic-profile-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { editPage } = (await getDictionary(locale)).candidate.profile;
  return { title: editPage.metaTitle, description: editPage.metaDescription };
}

export default async function EditCandidateProfilePage({
  params,
}: PageProps<"/[locale]/candidate/profile/edit">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.profile;
  const session = await requireRole("CANDIDATE", "/candidate/profile/edit");
  const profile = await getCandidateProfile(getPrismaClient(), session.user.id);

  return (
    <ProfileFormShell
      eyebrow={t.editPage.eyebrow}
      title={t.editPage.title}
      description={t.editPage.description}
      locale={locale}
      t={t.formShell}
    >
      <BasicProfileForm
        defaultValues={{
          headline: profile?.headline ?? "",
          location: profile?.location ?? "",
          bio: profile?.bio ?? "",
          websiteUrl: profile?.websiteUrl ?? "",
          linkedinUrl: profile?.linkedinUrl ?? "",
          githubUrl: profile?.githubUrl ?? "",
        }}
        candidate={dictionary.candidate}
        validation={dictionary.validation}
      />
    </ProfileFormShell>
  );
}
