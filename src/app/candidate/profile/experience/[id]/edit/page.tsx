import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceForm } from "@/features/candidate-profile/components/experience-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { updateExperienceAction } from "@/features/candidate-profile/server/actions";
import { getOwnedExperience } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit experience",
  description: "Edit work experience on your CareerBridge profile.",
};

function toDateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([
    params,
    requireRole("CANDIDATE", "/candidate/profile"),
  ]);
  const experience = await getOwnedExperience(
    getPrismaClient(),
    session.user.id,
    id,
  );

  if (!experience) notFound();

  return (
    <ProfileFormShell
      eyebrow="Experience"
      title="Edit work experience"
      description="Update this role while keeping dates and current-work status consistent."
    >
      <ExperienceForm
        action={updateExperienceAction.bind(null, id)}
        submitLabel="Save experience"
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
