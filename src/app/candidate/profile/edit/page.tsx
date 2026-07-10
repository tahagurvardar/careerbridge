import type { Metadata } from "next";

import { BasicProfileForm } from "@/features/candidate-profile/components/basic-profile-form";
import { ProfileFormShell } from "@/features/candidate-profile/components/profile-form-shell";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Edit candidate profile",
  description: "Edit your basic professional information and links.",
};

export default async function EditCandidateProfilePage() {
  const session = await requireRole("CANDIDATE", "/candidate/profile/edit");
  const profile = await getCandidateProfile(getPrismaClient(), session.user.id);

  return (
    <ProfileFormShell
      eyebrow="Candidate profile"
      title="Edit professional information"
      description="Keep the essentials focused and current. Your name and email remain managed by your account."
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
      />
    </ProfileFormShell>
  );
}
