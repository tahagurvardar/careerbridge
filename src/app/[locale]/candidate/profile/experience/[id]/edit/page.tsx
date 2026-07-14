import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceForm } from "@/features/candidate-profile/components/experience-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { updateExperienceAction } from "@/features/candidate-profile/server/actions";
import { getOwnedExperience } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile/experience/[id]/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const t = (await getDictionary(locale)).candidate.profile.experiencePage;
  return { title: t.editMetaTitle, description: t.editMetaDescription };
}

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditExperiencePage({
  params,
}: PageProps<"/[locale]/candidate/profile/experience/[id]/edit">) {
  const [resolvedParams, session] = await Promise.all([
    params,
    requireRole("CANDIDATE", "/candidate/profile"),
  ]);
  const locale = resolvePageLocale(resolvedParams.locale);
  const id = resolvedParams.id;
  const dictionary = await getDictionary(locale);
  const { profile } = dictionary.candidate;
  const experience = await getOwnedExperience(
    getPrismaClient(),
    session.user.id,
    id,
  );

  if (!experience) notFound();

  return (
    <ProfileFormShell
      eyebrow={profile.experiencePage.eyebrow}
      title={profile.experiencePage.editTitle}
      description={profile.experiencePage.editDescription}
      locale={locale}
      t={profile.formShell}
    >
      <ExperienceForm
        action={updateExperienceAction.bind(null, id)}
        submitLabel={profile.experiencePage.updateSubmit}
        candidate={dictionary.candidate}
        validation={dictionary.validation}
        labels={dictionary.labels}
        defaultValues={{
          companyName: experience.companyName,
          jobTitle: experience.jobTitle,
          employmentType: experience.employmentType,
          location: experience.location ?? "",
          startDate: toDateInputValue(experience.startDate),
          endDate: toDateInputValue(experience.endDate),
          isCurrent: experience.isCurrent,
          description: experience.description ?? "",
        }}
      />
    </ProfileFormShell>
  );
}
