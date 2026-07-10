import type { Metadata } from "next";

import { ExperienceForm } from "@/features/candidate-profile/components/experience-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { createExperienceAction } from "@/features/candidate-profile/server/actions";

export const metadata: Metadata = {
  title: "Add experience",
  description: "Add work experience to your CareerBridge profile.",
};

export default function NewExperiencePage() {
  return (
    <ProfileFormShell
      eyebrow="Experience"
      title="Add work experience"
      description="Describe a role accurately, including its employment type, dates, and the work you owned."
    >
      <ExperienceForm
        action={createExperienceAction}
        submitLabel="Add experience"
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
