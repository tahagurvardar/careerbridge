import type { Metadata } from "next";

import { EducationForm } from "@/features/candidate-profile/components/education-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { createEducationAction } from "@/features/candidate-profile/server/actions";

export const metadata: Metadata = {
  title: "Add education",
  description: "Add an education record to your CareerBridge profile.",
};

export default function NewEducationPage() {
  return (
    <ProfileFormShell
      eyebrow="Education"
      title="Add education"
      description="Add one clear record for a school, university, certification program, or other structured study."
    >
      <EducationForm
        action={createEducationAction}
        submitLabel="Add education"
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
