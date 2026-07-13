// Pure, database-free domain logic for Company team membership: invitation
// lifecycle transitions, expiration classification, active-key generation,
// last-owner decisions, role-change/transfer/leave eligibility, audit-event
// labels, and OWNER-only visibility rules. The server layer resolves trusted
// facts (session identity, membership roles, owner counts, invitation state)
// from the database inside transactions, then delegates every decision and
// user-visible string to these helpers so they can be unit tested directly.
//
// Nothing here reads the database or trusts client input. Membership roles,
// invitation statuses, actors, and subjects are always server-resolved.

import type { PlatformRole } from "@/features/auth/roles";
import type {
  CompanyInvitationStatus,
  CompanyMembershipEventType,
  CompanyMembershipRole,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Invitation expiry
// ---------------------------------------------------------------------------

/** Fixed, documented invitation lifetime. */
export const INVITATION_EXPIRY_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Server-computed expiry timestamp for a new invitation. */
export function computeInvitationExpiry(from: Date): Date {
  return new Date(from.getTime() + INVITATION_EXPIRY_DAYS * DAY_MS);
}

/**
 * A PENDING invitation past its expiry is expired even before the row is
 * finalized; terminal rows are never re-classified. Expiry is inclusive at the
 * boundary so an invitation is unusable the instant `expiresAt` is reached.
 */
export function isInvitationExpired(
  invitation: { status: CompanyInvitationStatus; expiresAt: Date },
  now: Date,
): boolean {
  return (
    invitation.status === "PENDING" &&
    invitation.expiresAt.getTime() <= now.getTime()
  );
}

/**
 * Collapses invitation state to what the reader should see: terminal statuses
 * as stored, and PENDING as either PENDING or EXPIRED depending on the clock.
 */
export function getInvitationDisplayStatus(
  invitation: { status: CompanyInvitationStatus; expiresAt: Date },
  now: Date,
): CompanyInvitationStatus {
  return isInvitationExpired(invitation, now) ? "EXPIRED" : invitation.status;
}

// ---------------------------------------------------------------------------
// Invitation active key
// ---------------------------------------------------------------------------

// Mirrors the `company_invitation.activeKey` column bound. Identifiers are
// bounded at 64 characters (`teamEntityIdSchema` and generated ids), so
// "companyId:inviteeUserId" always fits.
export const INVITATION_ACTIVE_KEY_MAX = 130;

/**
 * Deterministic, server-generated key held only while an invitation is
 * PENDING. Its unique constraint makes "at most one active invitation per
 * Company and invitee" database-backed; terminal transitions null it out.
 * This is not a secret and never appears in a URL or notification.
 */
export function buildInvitationActiveKey(
  companyId: string,
  inviteeUserId: string,
): string {
  return `${companyId}:${inviteeUserId}`;
}

// ---------------------------------------------------------------------------
// Invitation lifecycle
// ---------------------------------------------------------------------------

export const INVITATION_TERMINAL_STATUSES = [
  "ACCEPTED",
  "DECLINED",
  "REVOKED",
  "EXPIRED",
] as const satisfies readonly CompanyInvitationStatus[];

export function isTerminalInvitationStatus(
  status: CompanyInvitationStatus,
): boolean {
  return status !== "PENDING";
}

/**
 * The only legal transitions: PENDING → each terminal status. Terminal rows
 * never transition again, and nothing ever returns to PENDING.
 */
export function canTransitionInvitation(
  from: CompanyInvitationStatus,
  to: CompanyInvitationStatus,
): boolean {
  return from === "PENDING" && to !== "PENDING";
}

/**
 * Whether the invitee may still accept or decline (and an OWNER may still
 * revoke): the invitation must be PENDING and not past its expiry. Acceptance,
 * decline, and revocation after expiry are all rejected.
 */
export function canRespondToInvitation(
  invitation: { status: CompanyInvitationStatus; expiresAt: Date },
  now: Date,
): boolean {
  return (
    invitation.status === "PENDING" && !isInvitationExpired(invitation, now)
  );
}

export const invitationStatusLabels: Record<CompanyInvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
};

// ---------------------------------------------------------------------------
// Invitee eligibility
// ---------------------------------------------------------------------------

/** Only existing Recruiter accounts can be invited in this phase. */
export const INVITABLE_PLATFORM_ROLES = [
  "RECRUITER",
] as const satisfies readonly PlatformRole[];

export function isInvitablePlatformRole(role: PlatformRole): boolean {
  return (INVITABLE_PLATFORM_ROLES as readonly PlatformRole[]).includes(role);
}

/**
 * The membership role granted by accepting an invitation. Always MEMBER in
 * this phase and never supplied by the browser; ownership is granted only
 * through explicit promotion or transfer afterwards.
 */
export const INVITATION_ACCEPTANCE_ROLE =
  "MEMBER" satisfies CompanyMembershipRole;

// ---------------------------------------------------------------------------
// Last-owner invariant and membership action eligibility
// ---------------------------------------------------------------------------

export const LAST_OWNER_MESSAGE = "A company must keep at least one owner.";

/**
 * The invariant core: an operation that removes or demotes one OWNER is only
 * allowed while more than one OWNER exists. Counts are always read fresh
 * inside the acting transaction, never from UI state.
 */
export function canReduceOwnerCount(currentOwnerCount: number): boolean {
  return Number.isInteger(currentOwnerCount) && currentOwnerCount > 1;
}

/**
 * A blocked membership action, with a machine code for the server and a safe,
 * static message for the user. `null` means the action is allowed.
 */
export type MembershipActionBlock = {
  code: "TARGET_NOT_ELIGIBLE" | "SELF_TARGET" | "LAST_OWNER";
  message: string;
} | null;

export function getPromotionBlock(input: {
  targetMembershipRole: CompanyMembershipRole;
  targetPlatformRole: PlatformRole;
}): MembershipActionBlock {
  if (input.targetMembershipRole !== "MEMBER") {
    return {
      code: "TARGET_NOT_ELIGIBLE",
      message: "Only a current member can be promoted to owner.",
    };
  }
  if (!isInvitablePlatformRole(input.targetPlatformRole)) {
    return {
      code: "TARGET_NOT_ELIGIBLE",
      message: "Only a recruiter account can hold company ownership.",
    };
  }
  return null;
}

export function getDemotionBlock(input: {
  targetMembershipRole: CompanyMembershipRole;
  ownerCount: number;
}): MembershipActionBlock {
  if (input.targetMembershipRole !== "OWNER") {
    return {
      code: "TARGET_NOT_ELIGIBLE",
      message: "Only an owner can be demoted to member.",
    };
  }
  if (!canReduceOwnerCount(input.ownerCount)) {
    return { code: "LAST_OWNER", message: LAST_OWNER_MESSAGE };
  }
  return null;
}

export function getRemovalBlock(input: {
  isSelf: boolean;
  targetMembershipRole: CompanyMembershipRole;
  ownerCount: number;
}): MembershipActionBlock {
  if (input.isSelf) {
    return {
      code: "SELF_TARGET",
      message: "Use “Leave company” to end your own membership.",
    };
  }
  if (
    input.targetMembershipRole === "OWNER" &&
    !canReduceOwnerCount(input.ownerCount)
  ) {
    return { code: "LAST_OWNER", message: LAST_OWNER_MESSAGE };
  }
  return null;
}

export function getLeaveBlock(input: {
  membershipRole: CompanyMembershipRole;
  ownerCount: number;
}): MembershipActionBlock {
  if (
    input.membershipRole === "OWNER" &&
    !canReduceOwnerCount(input.ownerCount)
  ) {
    return { code: "LAST_OWNER", message: LAST_OWNER_MESSAGE };
  }
  return null;
}

export function getOwnershipTransferBlock(input: {
  isSelf: boolean;
  targetMembershipRole: CompanyMembershipRole;
  targetPlatformRole: PlatformRole;
}): MembershipActionBlock {
  if (input.isSelf) {
    return {
      code: "SELF_TARGET",
      message: "Ownership cannot be transferred to yourself.",
    };
  }
  if (input.targetMembershipRole !== "MEMBER") {
    return {
      code: "TARGET_NOT_ELIGIBLE",
      message: "Ownership can only be transferred to a current member.",
    };
  }
  if (!isInvitablePlatformRole(input.targetPlatformRole)) {
    return {
      code: "TARGET_NOT_ELIGIBLE",
      message: "Only a recruiter account can receive company ownership.",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Membership action labels
// ---------------------------------------------------------------------------

export const membershipActionLabels = {
  PROMOTE: "Promote to owner",
  DEMOTE: "Demote to member",
  REMOVE: "Remove from company",
  TRANSFER: "Transfer ownership",
  LEAVE: "Leave company",
} as const;

export type MembershipActionKey = keyof typeof membershipActionLabels;

// ---------------------------------------------------------------------------
// Audit-event labels
// ---------------------------------------------------------------------------

export const membershipEventTypeLabels: Record<
  CompanyMembershipEventType,
  string
> = {
  INVITATION_CREATED: "Invitation sent",
  INVITATION_ACCEPTED: "Invitation accepted",
  INVITATION_DECLINED: "Invitation declined",
  INVITATION_REVOKED: "Invitation revoked",
  INVITATION_EXPIRED: "Invitation expired",
  MEMBER_PROMOTED_TO_OWNER: "Promoted to owner",
  OWNER_DEMOTED_TO_MEMBER: "Demoted to member",
  MEMBER_REMOVED: "Member removed",
  OWNER_REMOVED: "Owner removed",
  MEMBER_LEFT: "Member left",
  OWNER_LEFT: "Owner left",
};

/** Fallback shown when an audit actor or subject account no longer exists. */
export const REMOVED_USER_FALLBACK = "Removed user";

/** Never render a blank display name for an audit actor or subject. */
export function resolveTeamUserDisplayName(
  name: string | null | undefined,
): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : REMOVED_USER_FALLBACK;
}

// ---------------------------------------------------------------------------
// OWNER-only visibility
// ---------------------------------------------------------------------------

/**
 * Team administration — the roster with emails, pending invitations, role
 * actions, and audit history — is visible to Company OWNERs only. MEMBER
 * users, Candidates, Admins, unrelated Recruiters, and the public are all
 * denied.
 */
export function canViewTeamAdministration(
  role: CompanyMembershipRole | null | undefined,
): boolean {
  return role === "OWNER";
}

/** Member email addresses share the same OWNER-only visibility rule. */
export function canViewMemberEmails(
  role: CompanyMembershipRole | null | undefined,
): boolean {
  return canViewTeamAdministration(role);
}

/** Audit history shares the same OWNER-only visibility rule. */
export function canViewMembershipAudit(
  role: CompanyMembershipRole | null | undefined,
): boolean {
  return canViewTeamAdministration(role);
}
