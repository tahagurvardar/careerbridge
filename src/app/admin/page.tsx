import type { Metadata } from "next";
import { BarChart3, ShieldCheck, UsersRound } from "lucide-react";

import { DashboardPlaceholder } from "@/features/auth/components/dashboard-placeholder";
import { requireRole } from "@/features/auth/server/session";

export const metadata: Metadata = {
  title: "Admin",
  description: "Protected CareerBridge platform administration access.",
};

export default async function AdminPage() {
  const session = await requireRole("ADMIN", "/admin");

  return (
    <DashboardPlaceholder
      eyebrow="Administration"
      roleLabel="Admin"
      title={`Admin access confirmed for ${session.user.name}.`}
      description="This page confirms the protected administrative boundary. Operational tools are intentionally deferred until the platform administration phase."
      items={[
        {
          icon: ShieldCheck,
          title: "Access confirmed",
          description:
            "Your current database-backed session carries the Admin platform role.",
        },
        {
          icon: UsersRound,
          title: "User moderation",
          description:
            "User and content moderation workflows will be implemented in Phase 5.",
        },
        {
          icon: BarChart3,
          title: "Platform analytics",
          description:
            "Operational analytics will follow real product workflows and audit events.",
        },
      ]}
    />
  );
}
