import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EducationForm } from "@/features/candidate-profile/components/education-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { updateEducationAction } from "@/features/candidate-profile/server/actions";
import { getOwnedEducation } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit education",
  description: "Edit an education record on your CareerBridge profile.",
};

export default async function EditEducationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([
    params,
    requireRole("CANDIDATE", "/candidate/profile"),
  ]);
  const education = await getOwnedEducation(
    getPrismaClient(),
    session.user.id,
    id,
  );

  if (!education) notFound();

  return (
    <ProfileFormShell
      eyebrow="Education"
      title="Edit education"
      description="Update this record while keeping dates and current-study status consistent."
    >
      <EducationForm
        action={updateEducationAction.bind(null, id)}
        submitLabel="Save education"
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
