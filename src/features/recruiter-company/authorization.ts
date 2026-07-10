import type { PlatformRole } from "@/features/auth/roles";

export type RecruiterActor = {
  userId: string;
  role: PlatformRole;
};

export function isRecruiterActor(actor: RecruiterActor) {
  return actor.role === "RECRUITER";
}

export function canManageCompany(role: "OWNER" | "MEMBER" | null | undefined) {
  return role === "OWNER";
}
