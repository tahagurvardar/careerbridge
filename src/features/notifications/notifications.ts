// Pure, database-free domain logic for in-app notifications: event copy,
// deterministic dedupe keys, recipient de-duplication, safe destinations, type
// labels/icons, unread-badge formatting, and the roles allowed a Notification
// Center. The server layer resolves trusted facts (recipients, actor, event
// ids) from the session and database, then delegates every user-visible string
// and idempotency token to these helpers so they can be unit tested directly.
//
// Nothing here reads the database, renders HTML/Markdown, or trusts client
// input. Notification copy is a bounded, escaped-text snapshot only — it never
// contains Candidate email, CV filenames, note bodies, or document metadata.

import { getSafeInternalPath, type PlatformRole } from "@/features/auth/roles";
import {
  applicationStatusLabels,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";
import type { NotificationType } from "@/generated/prisma/enums";

// Bounds mirror the `notification` table columns so composed copy can never
// overflow a database write.
export const NOTIFICATION_TITLE_MAX = 160;
export const NOTIFICATION_MESSAGE_MAX = 500;
export const NOTIFICATION_HREF_MAX = 512;
export const NOTIFICATION_DEDUPE_KEY_MAX = 200;

/** Fallback used when a Candidate has no usable display name. */
export const CANDIDATE_DISPLAY_FALLBACK = "A candidate";

/** Safe internal fallback if a generated destination is ever rejected. */
export const NOTIFICATION_HREF_FALLBACK = "/notifications";

export interface NotificationContent {
  title: string;
  message: string;
  href: string;
}

/**
 * Trims to a whole-codepoint slice within `max`, appending an ellipsis when
 * truncated. Slicing by codepoint (not UTF-16 unit) avoids splitting an
 * astral character in a Job title or name.
 */
export function boundedText(value: string, max: number): string {
  const codepoints = Array.from(value);
  if (codepoints.length <= max) return value;
  return `${codepoints
    .slice(0, Math.max(0, max - 1))
    .join("")
    .trimEnd()}…`;
}

/** Never trust a blank/whitespace-only display name in event copy. */
export function resolveCandidateDisplayName(
  name: string | null | undefined,
): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : CANDIDATE_DISPLAY_FALLBACK;
}

/**
 * Validates a server-generated destination through the repository's
 * safe-internal-path logic. Only same-origin absolute paths survive; external,
 * protocol-relative, or malformed values collapse to the Notification Center.
 */
export function safeNotificationHref(path: string): string {
  return boundedText(
    getSafeInternalPath(path, NOTIFICATION_HREF_FALLBACK),
    NOTIFICATION_HREF_MAX,
  );
}

// ---------------------------------------------------------------------------
// Event copy (title, message, safe href)
// ---------------------------------------------------------------------------

export function buildApplicationSubmittedContent(input: {
  applicationId: string;
  candidateName: string | null | undefined;
  jobTitle: string;
}): NotificationContent {
  const candidate = resolveCandidateDisplayName(input.candidateName);
  return {
    title: boundedText("New application received", NOTIFICATION_TITLE_MAX),
    message: boundedText(
      `${candidate} applied for ${input.jobTitle}.`,
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/recruiter/applications/${input.applicationId}`,
    ),
  };
}

export function buildApplicationStatusChangedContent(input: {
  applicationId: string;
  jobTitle: string;
  status: ApplicationStatusValue;
}): NotificationContent {
  const statusLabel = applicationStatusLabels[input.status];
  return {
    title: boundedText("Application status updated", NOTIFICATION_TITLE_MAX),
    message: boundedText(
      `Your application for ${input.jobTitle} is now ${statusLabel}.`,
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/candidate/applications/${input.applicationId}`,
    ),
  };
}

export function buildApplicationWithdrawnContent(input: {
  applicationId: string;
  candidateName: string | null | undefined;
  jobTitle: string;
}): NotificationContent {
  const candidate = resolveCandidateDisplayName(input.candidateName);
  return {
    title: boundedText("Application withdrawn", NOTIFICATION_TITLE_MAX),
    message: boundedText(
      `${candidate} withdrew their application for ${input.jobTitle}.`,
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/recruiter/applications/${input.applicationId}`,
    ),
  };
}

export function buildCompanyInvitationReceivedContent(input: {
  companyName: string;
}): NotificationContent {
  // Copy carries only the Company's own name — never the invitee email, the
  // invitation activeKey, or any private membership data. The destination is
  // the invitee's authenticated invitation list; membership itself is granted
  // only by explicit acceptance, never by this notification.
  return {
    title: boundedText("Company invitation", NOTIFICATION_TITLE_MAX),
    message: boundedText(
      `You were invited to join ${input.companyName}.`,
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref("/recruiter/invitations"),
  };
}

// ---------------------------------------------------------------------------
// Deterministic dedupe keys (server-only inputs; browser never supplies these)
// ---------------------------------------------------------------------------

export function applicationSubmittedDedupeKey(
  applicationId: string,
  recipientUserId: string,
): string {
  return `application-submitted:${applicationId}:${recipientUserId}`;
}

export function applicationStatusChangedDedupeKey(
  statusHistoryId: string,
  recipientUserId: string,
): string {
  return `application-status-changed:${statusHistoryId}:${recipientUserId}`;
}

export function applicationWithdrawnDedupeKey(
  statusHistoryId: string,
  recipientUserId: string,
): string {
  return `application-withdrawn:${statusHistoryId}:${recipientUserId}`;
}

export function companyInvitationReceivedDedupeKey(
  invitationId: string,
  recipientUserId: string,
): string {
  return `company-invitation-received:${invitationId}:${recipientUserId}`;
}

// ---------------------------------------------------------------------------
// Recipient resolution helpers
// ---------------------------------------------------------------------------

/**
 * Collapses a resolved recipient list to unique ids, preserving order and
 * dropping blank ids and the acting user (no self-notifications). The database
 * dedupe-key constraint is the authoritative guard; this keeps inserts minimal
 * and intent clear.
 */
export function dedupeRecipientIds(
  userIds: readonly string[],
  excludeUserId?: string | null,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of userIds) {
    if (!id || id === excludeUserId || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Type labels + icon keys
// ---------------------------------------------------------------------------

export const notificationTypeLabels: Record<NotificationType, string> = {
  APPLICATION_SUBMITTED: "New application",
  APPLICATION_STATUS_CHANGED: "Status update",
  APPLICATION_WITHDRAWN: "Application withdrawn",
  COMPANY_INVITATION_RECEIVED: "Company invitation",
};

/**
 * Semantic icon keys, decoupled from any icon library so the mapping is
 * unit-testable without importing React components. The presentational layer
 * translates a key into a concrete icon.
 */
export const NOTIFICATION_ICON_KEYS = [
  "inbound",
  "status",
  "withdrawn",
  "invitation",
] as const;
export type NotificationIconKey = (typeof NOTIFICATION_ICON_KEYS)[number];

export const notificationTypeIconKeys: Record<
  NotificationType,
  NotificationIconKey
> = {
  APPLICATION_SUBMITTED: "inbound",
  APPLICATION_STATUS_CHANGED: "status",
  APPLICATION_WITHDRAWN: "withdrawn",
  COMPANY_INVITATION_RECEIVED: "invitation",
};

// ---------------------------------------------------------------------------
// Unread badge formatting
// ---------------------------------------------------------------------------

/**
 * Renders an unread-count badge: nothing at zero/invalid, the exact integer for
 * 1–99, and `99+` at one hundred or more. Never claims real-time delivery.
 */
export function formatUnreadBadge(count: number): string | null {
  if (!Number.isFinite(count)) return null;
  const value = Math.floor(count);
  if (value <= 0) return null;
  if (value >= 100) return "99+";
  return String(value);
}

/** Accessible label for the header bell, reflecting the unread state. */
export function unreadBellLabel(count: number): string {
  const badge = formatUnreadBadge(count);
  return badge ? `Notifications, ${badge} unread` : "Notifications";
}

// ---------------------------------------------------------------------------
// Notification Center roles
// ---------------------------------------------------------------------------

/**
 * Only Candidates and Recruiters have a Notification Center in this phase.
 * Admins receive no implicit access.
 */
export const NOTIFICATION_CENTER_ROLES = ["CANDIDATE", "RECRUITER"] as const;
export type NotificationCenterRole = (typeof NOTIFICATION_CENTER_ROLES)[number];

export function isNotificationCenterRole(
  role: PlatformRole,
): role is NotificationCenterRole {
  return (NOTIFICATION_CENTER_ROLES as readonly PlatformRole[]).includes(role);
}
