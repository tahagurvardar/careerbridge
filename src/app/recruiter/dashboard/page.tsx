import type { Metadata } from "next";
import { Building2, ClipboardList, FilePlus2 } from "lucide-react";

import { DashboardPlaceholder } from "@/features/auth/components/dashboard-placeholder";
import { requireRole } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Recruiter dashboard",
  description: "Your protected CareerBridge recruiter workspace.",
};

export default async function RecruiterDashboardPage() {
  const session = await requireRole("RECRUITER", "/recruiter/dashboard");

  return (
    <DashboardPlaceholder
      eyebrow="Recruiter dashboard"
      roleLabel="Recruiter"
      title={`Welcome, ${session.user.name}.`}
      description="Your secure recruiter workspace is ready. Company and hiring workflows remain intentionally deferred to their dedicated product phases."
      items={[
        {
          icon: Building2,
          title: "Company workspace",
          description:
            "Company creation and recruiter membership will be designed in Phase 3.",
        },
        {
          icon: FilePlus2,
          title: "Job publishing",
          description:
            "Create, review, and publish job listings after company ownership is established.",
        },
        {
          icon: ClipboardList,
          title: "Applicant management",
          description:
            "Review candidates and manage application stages in the applications phase.",
        },
      ]}
    />
  );
}
