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
import type { ApplicationStatusValue } from "@/features/applications/schemas";
import type { InterviewResponseValue } from "@/features/interviews/interviews";
import type { NotificationType } from "@/generated/prisma/enums";
import type { AppDictionary } from "@/i18n/dictionary";
import { dictionary as englishDictionary } from "@/i18n/dictionaries/en";
import type { RouteLocale } from "@/i18n/config";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

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
  fallback = CANDIDATE_DISPLAY_FALLBACK,
): string {
  const trimmed = (name ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
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

export function buildApplicationSubmittedContent(
  input: {
    applicationId: string;
    candidateName: string | null | undefined;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.applicationSubmitted;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { candidate, jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/recruiter/applications/${input.applicationId}`,
    ),
  };
}

export function buildApplicationStatusChangedContent(
  input: {
    applicationId: string;
    jobTitle: string;
    status: ApplicationStatusValue;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.applicationStatusChanged;
  const statusLabel = dictionary.labels.applicationStatus[input.status];
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, {
        jobTitle: input.jobTitle,
        status: statusLabel,
      }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/candidate/applications/${input.applicationId}`,
    ),
  };
}

export function buildApplicationWithdrawnContent(
  input: {
    applicationId: string;
    candidateName: string | null | undefined;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.applicationWithdrawn;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { candidate, jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(
      `/recruiter/applications/${input.applicationId}`,
    ),
  };
}

// Interview notification copy carries only the Job title, the interview id in
// a safe internal destination, and (for recruiter-facing responses) the
// Candidate display name. Never the meeting URL, location, instructions,
// schedule, Candidate email, or any CV/note data — those stay behind the
// authenticated destination route, which re-authorizes independently.

export function buildInterviewScheduledContent(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.interviewScheduled;
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(`/candidate/interviews/${input.interviewId}`),
  };
}

export function buildInterviewRescheduledContent(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.interviewRescheduled;
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(`/candidate/interviews/${input.interviewId}`),
  };
}

export function buildInterviewCanceledContent(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.interviewCanceled;
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(`/candidate/interviews/${input.interviewId}`),
  };
}

export function buildInterviewResponseReceivedContent(
  input: {
    interviewId: string;
    jobTitle: string;
    candidateName: string | null | undefined;
    response: InterviewResponseValue;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  const copy = dictionary.notifications.events.interviewResponseReceived;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  const message =
    input.response === "ACCEPTED" ? copy.messageAccepted : copy.messageDeclined;
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(message, { candidate, jobTitle: input.jobTitle }),
      NOTIFICATION_MESSAGE_MAX,
    ),
    href: safeNotificationHref(`/recruiter/interviews/${input.interviewId}`),
  };
}

export function buildCompanyInvitationReceivedContent(
  input: {
    companyName: string;
  },
  dictionary: AppDictionary = englishDictionary,
): NotificationContent {
  // Copy carries only the Company's own name — never the invitee email, the
  // invitation activeKey, or any private membership data. The destination is
  // the invitee's authenticated invitation list; membership itself is granted
  // only by explicit acceptance, never by this notification.
  const copy = dictionary.notifications.events.companyInvitationReceived;
  return {
    title: boundedText(copy.title, NOTIFICATION_TITLE_MAX),
    message: boundedText(
      formatMessage(copy.message, { companyName: input.companyName }),
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

/** Creation happens once per interview, so the interview id keys the event. */
export function interviewScheduledDedupeKey(
  interviewId: string,
  recipientUserId: string,
): string {
  return `interview-scheduled:${interviewId}:${recipientUserId}`;
}

/**
 * Each reschedule writes its own immutable RESCHEDULED event, so that event id
 * keys the notification — every distinct reschedule notifies exactly once.
 */
export function interviewRescheduledDedupeKey(
  rescheduleEventId: string,
  recipientUserId: string,
): string {
  return `interview-rescheduled:${rescheduleEventId}:${recipientUserId}`;
}

/** Cancellation is a terminal one-time transition; the interview id keys it. */
export function interviewCanceledDedupeKey(
  interviewId: string,
  recipientUserId: string,
): string {
  return `interview-canceled:${interviewId}:${recipientUserId}`;
}

/**
 * A Candidate may respond once per pending cycle (rescheduling opens a new
 * cycle), so the immutable response event id keys each response notification.
 */
export function interviewResponseReceivedDedupeKey(
  responseEventId: string,
  recipientUserId: string,
): string {
  return `interview-response-received:${responseEventId}:${recipientUserId}`;
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
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_RESCHEDULED: "Interview rescheduled",
  INTERVIEW_CANCELED: "Interview canceled",
  INTERVIEW_RESPONSE_RECEIVED: "Interview response",
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
  "interview",
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
  INTERVIEW_SCHEDULED: "interview",
  INTERVIEW_RESCHEDULED: "interview",
  INTERVIEW_CANCELED: "interview",
  INTERVIEW_RESPONSE_RECEIVED: "inbound",
};

// ---------------------------------------------------------------------------
// Unread badge formatting
// ---------------------------------------------------------------------------

/**
 * Renders an unread-count badge: nothing at zero/invalid, the exact integer for
 * 1–99, and `99+` at one hundred or more. Never claims real-time delivery.
 */
export function formatUnreadBadge(
  count: number,
  locale: RouteLocale = "en",
): string | null {
  if (!Number.isFinite(count)) return null;
  const value = Math.floor(count);
  if (value <= 0) return null;
  if (value >= 100) return `${formatInteger(locale, 99)}+`;
  return formatInteger(locale, value);
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
