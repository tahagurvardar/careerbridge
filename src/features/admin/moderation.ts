import type { Prisma } from "@/generated/prisma/client";

export const USER_ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED"] as const;
export const CONTENT_MODERATION_STATUSES = ["VISIBLE", "HIDDEN"] as const;
export const MODERATION_REASON_CODES = [
  "SPAM",
  "FRAUD",
  "ABUSE",
  "IMPERSONATION",
  "POLICY_VIOLATION",
  "SECURITY_RISK",
  "OTHER",
] as const;
export const ADMIN_AUDIT_ACTIONS = [
  "USER_SUSPENDED",
  "USER_RESTORED",
  "COMPANY_HIDDEN",
  "COMPANY_RESTORED",
  "JOB_HIDDEN",
  "JOB_RESTORED",
] as const;

export type UserAccountStatusValue = (typeof USER_ACCOUNT_STATUSES)[number];
export type ContentModerationStatusValue =
  (typeof CONTENT_MODERATION_STATUSES)[number];
export type ModerationReasonCodeValue =
  (typeof MODERATION_REASON_CODES)[number];
export type AdminAuditActionValue = (typeof ADMIN_AUDIT_ACTIONS)[number];
export type ModerationTargetType = "USER" | "COMPANY" | "JOB";
export type UserModerationAction = "SUSPEND" | "RESTORE";
export type ContentModerationAction = "HIDE" | "RESTORE";

/**
 * Canonical database predicates for anything presented as public discovery.
 * Callers may add identifiers and search filters, but must not recreate the
 * publication/moderation portion independently.
 */
export const PUBLIC_COMPANY_VISIBILITY_WHERE = {
  isPublished: true,
  moderationStatus: "VISIBLE",
} satisfies Prisma.CompanyWhereInput;

export const PUBLIC_JOB_VISIBILITY_WHERE = {
  status: "PUBLISHED",
  moderationStatus: "VISIBLE",
  company: PUBLIC_COMPANY_VISIBILITY_WHERE,
} satisfies Prisma.JobWhereInput;

export const userAccountStatusLabels: Record<UserAccountStatusValue, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

export const contentModerationStatusLabels: Record<
  ContentModerationStatusValue,
  string
> = {
  VISIBLE: "Visible",
  HIDDEN: "Hidden",
};

export const moderationReasonLabels: Record<ModerationReasonCodeValue, string> =
  {
    SPAM: "Spam",
    FRAUD: "Fraud",
    ABUSE: "Abuse",
    IMPERSONATION: "Impersonation",
    POLICY_VIOLATION: "Policy violation",
    SECURITY_RISK: "Security risk",
    OTHER: "Other",
  };

export const adminAuditActionLabels: Record<AdminAuditActionValue, string> = {
  USER_SUSPENDED: "User suspended",
  USER_RESTORED: "User restored",
  COMPANY_HIDDEN: "Company hidden",
  COMPANY_RESTORED: "Company restored",
  JOB_HIDDEN: "Job hidden",
  JOB_RESTORED: "Job restored",
};

export function getAuditTargetType(
  action: AdminAuditActionValue,
): ModerationTargetType {
  if (action.startsWith("USER_")) return "USER";
  if (action.startsWith("COMPANY_")) return "COMPANY";
  return "JOB";
}

export function isModerationTargetActionCompatible(
  action: AdminAuditActionValue,
  targetType: ModerationTargetType,
) {
  return getAuditTargetType(action) === targetType;
}

export function canModerateUser({
  actorAdminUserId,
  targetUserId,
  targetRole,
  currentStatus,
  action,
}: {
  actorAdminUserId: string;
  targetUserId: string;
  targetRole: "CANDIDATE" | "RECRUITER" | "ADMIN";
  currentStatus: UserAccountStatusValue;
  action: UserModerationAction;
}) {
  if (actorAdminUserId === targetUserId || targetRole === "ADMIN") return false;
  return action === "SUSPEND"
    ? currentStatus === "ACTIVE"
    : currentStatus === "SUSPENDED";
}

export function canModerateContent(
  currentStatus: ContentModerationStatusValue,
  action: ContentModerationAction,
) {
  return action === "HIDE"
    ? currentStatus === "VISIBLE"
    : currentStatus === "HIDDEN";
}

export function isStaleModerationVersion(
  expectedVersion: number,
  currentVersion: number,
) {
  return expectedVersion !== currentVersion;
}

export function isCompanyPubliclyVisible(input: {
  isPublished: boolean;
  moderationStatus: ContentModerationStatusValue;
}) {
  return input.isPublished && input.moderationStatus === "VISIBLE";
}

export function isJobPubliclyVisible(input: {
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  moderationStatus: ContentModerationStatusValue;
  companyIsPublished: boolean;
  companyModerationStatus: ContentModerationStatusValue;
}) {
  return (
    input.status === "PUBLISHED" &&
    input.moderationStatus === "VISIBLE" &&
    isCompanyPubliclyVisible({
      isPublished: input.companyIsPublished,
      moderationStatus: input.companyModerationStatus,
    })
  );
}
