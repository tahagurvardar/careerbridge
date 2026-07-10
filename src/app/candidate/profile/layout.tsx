import type { ReactNode } from "react";

import { requireRole } from "@/features/auth/server/session";

export default async function CandidateProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole("CANDIDATE", "/candidate/profile");
  return children;
}
