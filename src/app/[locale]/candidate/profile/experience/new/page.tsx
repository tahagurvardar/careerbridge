import type { Metadata } from "next";

import { ExperienceForm } from "@/features/candidate-profile/components/experience-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { createExperienceAction } from "@/features/candidate-profile/server/actions";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile/experience/new">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const t = (await getDictionary(locale)).candidate.profile.experiencePage;
  return { title: t.newMetaTitle, description: t.newMetaDescription };
}

export default async function NewExperiencePage({
  params,
}: PageProps<"/[locale]/candidate/profile/experience/new">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const { profile } = dictionary.candidate;
  return (
    <ProfileFormShell
      eyebrow={profile.experiencePage.eyebrow}
      title={profile.experiencePage.newTitle}
      description={profile.experiencePage.newDescription}
      locale={locale}
      t={profile.formShell}
    >
      <ExperienceForm
        action={createExperienceAction}
        submitLabel={profile.experiencePage.addSubmit}
        candidate={dictionary.candidate}
        validation={dictionary.validation}
        labels={dictionary.labels}
        defaultValues={{
          companyName: "",
          jobTitle: "",
          employmentType: "FULL_TIME",
          location: "",
          startDate: "",
          endDate: "",
          isCurrent: false,
          description: "",
        }}
      />
    </ProfileFormShell>
  );
}
