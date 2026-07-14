import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EducationForm } from "@/features/candidate-profile/components/education-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { updateEducationAction } from "@/features/candidate-profile/server/actions";
import { getOwnedEducation } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile/education/[id]/edit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const t = (await getDictionary(locale)).candidate.profile.educationPage;
  return { title: t.editMetaTitle, description: t.editMetaDescription };
}

export default async function EditEducationPage({
  params,
}: PageProps<"/[locale]/candidate/profile/education/[id]/edit">) {
  const [resolvedParams, session] = await Promise.all([
    params,
    requireRole("CANDIDATE", "/candidate/profile"),
  ]);
  const locale = resolvePageLocale(resolvedParams.locale);
  const id = resolvedParams.id;
  const dictionary = await getDictionary(locale);
  const { profile } = dictionary.candidate;
  const education = await getOwnedEducation(
    getPrismaClient(),
    session.user.id,
    id,
  );

  if (!education) notFound();

  return (
    <ProfileFormShell
      eyebrow={profile.educationPage.eyebrow}
      title={profile.educationPage.editTitle}
      description={profile.educationPage.editDescription}
      locale={locale}
      t={profile.formShell}
    >
      <EducationForm
        action={updateEducationAction.bind(null, id)}
        submitLabel={profile.educationPage.updateSubmit}
        candidate={dictionary.candidate}
        validation={dictionary.validation}
        defaultValues={{
          school: education.school,
          degree: education.degree ?? "",
          fieldOfStudy: education.fieldOfStudy ?? "",
          startYear: education.startYear,
          endYear: education.endYear,
          isCurrent: education.isCurrent,
          description: education.description ?? "",
        }}
      />
    </ProfileFormShell>
  );
}
