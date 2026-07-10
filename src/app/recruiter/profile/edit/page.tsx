import type { Metadata } from "next";

import { requireRole } from "@/features/auth/server/session";
import { RecruiterProfileForm } from "@/features/recruiter-company/components/recruiter-profile-form";
import { WorkspaceFormShell } from "@/features/recruiter-company/components/workspace-form-shell";
import { getRecruiterProfile } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit recruiter profile",
  description: "Edit your professional recruiter information.",
};

export default async function EditRecruiterProfilePage() {
  const session = await requireRole("RECRUITER", "/recruiter/profile/edit");
  const profile = await getRecruiterProfile(getPrismaClient(), session.user.id);

  return (
    <WorkspaceFormShell
      backHref="/recruiter/profile"
      backLabel="Back to profile"
      eyebrow="Recruiter profile"
      title="Edit professional information"
      description="Your account name and email stay managed by Better Auth. These fields describe your professional recruiting work."
      cardTitle="Recruiter details"
    >
      <RecruiterProfileForm
        defaultValues={{
          jobTitle: profile?.jobTitle ?? "",
          bio: profile?.bio ?? "",
          linkedinUrl: profile?.linkedinUrl ?? "",
        }}
      />
    </WorkspaceFormShell>
  );
}
