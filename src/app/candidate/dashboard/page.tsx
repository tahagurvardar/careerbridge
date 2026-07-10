import type { Metadata } from "next";
import { Bookmark, FileCheck2, UserRound } from "lucide-react";

import { DashboardPlaceholder } from "@/features/auth/components/dashboard-placeholder";
import { requireRole } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Candidate dashboard",
  description: "Your protected CareerBridge candidate workspace.",
};

export default async function CandidateDashboardPage() {
  const session = await requireRole("CANDIDATE", "/candidate/dashboard");

  return (
    <DashboardPlaceholder
      eyebrow="Candidate dashboard"
      roleLabel="Candidate"
      title={`Welcome, ${session.user.name}.`}
      description="Your secure candidate workspace is ready. Profile and application tools remain intentionally lightweight until the next product phases."
      items={[
        {
          icon: UserRound,
          title: "Profile setup",
          description:
            "Build your professional profile, education, experience, and skills next.",
        },
        {
          icon: FileCheck2,
          title: "Applications",
          description:
            "Application submission and status tracking will arrive with the applications phase.",
        },
        {
          icon: Bookmark,
          title: "Saved opportunities",
          description:
            "Save promising jobs after database-backed opportunity discovery is introduced.",
        },
      ]}
    />
  );
}
