import { z } from "zod";

export const PLATFORM_ROLES = ["CANDIDATE", "RECRUITER", "ADMIN"] as const;
export const PUBLIC_ROLES = ["CANDIDATE", "RECRUITER"] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export type PublicRole = (typeof PUBLIC_ROLES)[number];

export const platformRoleSchema = z.enum(PLATFORM_ROLES);
export const publicRoleSchema = z.enum(PUBLIC_ROLES, {
  error: "Choose a Candidate or Recruiter account.",
});

export const roleLabels: Record<PlatformRole, string> = {
  CANDIDATE: "Candidate",
  RECRUITER: "Recruiter",
  ADMIN: "Admin",
};

export function isPublicRole(value: unknown): value is PublicRole {
  return publicRoleSchema.safeParse(value).success;
}

export function getDashboardPathForRole(role: PlatformRole) {
  switch (role) {
    case "CANDIDATE":
      return "/candidate/dashboard" as const;
    case "RECRUITER":
      return "/recruiter/dashboard" as const;
    case "ADMIN":
      return "/admin" as const;
  }
}

export function isDashboardPathAllowedForRole(
  role: PlatformRole,
  pathname: string,
) {
  return pathname === getDashboardPathForRole(role);
}

export function getSafeInternalPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const candidate = value.trim();

  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://careerbridge.invalid");
    const parsed = new URL(candidate, base);

    if (parsed.origin !== base.origin) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
