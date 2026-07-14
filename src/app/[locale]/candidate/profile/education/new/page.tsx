import type { Metadata } from "next";

import { EducationForm } from "@/features/candidate-profile/components/education-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { createEducationAction } from "@/features/candidate-profile/server/actions";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile/education/new">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const t = (await getDictionary(locale)).candidate.profile.educationPage;
  return { title: t.newMetaTitle, description: t.newMetaDescription };
}

export default async function NewEducationPage({
  params,
}: PageProps<"/[locale]/candidate/profile/education/new">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const { profile } = dictionary.candidate;
  return (
    <ProfileFormShell
      eyebrow={profile.educationPage.eyebrow}
      title={profile.educationPage.newTitle}
      description={profile.educationPage.newDescription}
      locale={locale}
      t={profile.formShell}
    >
      <EducationForm
        action={createEducationAction}
        submitLabel={profile.educationPage.addSubmit}
        candidate={dictionary.candidate}
        validation={dictionary.validation}
        defaultValues={{
          school: "",
          degree: "",
          fieldOfStudy: "",
          startYear: new Date().getFullYear(),
          endYear: null,
          isCurrent: false,
          description: "",
        }}
      />
    </ProfileFormShell>
  );
}
