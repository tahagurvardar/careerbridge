import { getSafeInternalPath, type PlatformRole } from "@/features/auth/roles";
import type { ApplicationStatusValue } from "@/features/applications/schemas";
import type { InterviewResponseValue } from "@/features/interviews/interviews";
import type { EmailEventType } from "@/generated/prisma/enums";
import type { AppDictionary } from "@/i18n/dictionary";
import { dictionary as englishDictionary } from "@/i18n/dictionaries/en";
import { formatMessage } from "@/i18n/translate";

export const EMAIL_EVENT_TYPES = [
  "COMPANY_INVITATION_RECEIVED",
  "APPLICATION_SUBMITTED",
  "APPLICATION_STATUS_CHANGED",
  "APPLICATION_WITHDRAWN",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_RESCHEDULED",
  "INTERVIEW_CANCELED",
  "INTERVIEW_RESPONSE_RECEIVED",
] as const satisfies readonly EmailEventType[];

export const emailEventLabels: Record<EmailEventType, string> = {
  COMPANY_INVITATION_RECEIVED: "Company invitations",
  APPLICATION_SUBMITTED: "New applications",
  APPLICATION_STATUS_CHANGED: "Application status updates",
  APPLICATION_WITHDRAWN: "Application withdrawals",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_RESCHEDULED: "Interview rescheduled",
  INTERVIEW_CANCELED: "Interview canceled",
  INTERVIEW_RESPONSE_RECEIVED: "Interview responses",
};

export const emailEventDescriptions: Record<EmailEventType, string> = {
  COMPANY_INVITATION_RECEIVED: "Email me when I am invited to join a company.",
  APPLICATION_SUBMITTED:
    "Email me when a candidate applies to a company I own.",
  APPLICATION_STATUS_CHANGED:
    "Email me when a recruiter updates one of my applications.",
  APPLICATION_WITHDRAWN:
    "Email me when a candidate withdraws from a company I own.",
  INTERVIEW_SCHEDULED:
    "Email me when an interview is scheduled for one of my applications.",
  INTERVIEW_RESCHEDULED: "Email me when one of my interviews is rescheduled.",
  INTERVIEW_CANCELED: "Email me when one of my interviews is canceled.",
  INTERVIEW_RESPONSE_RECEIVED:
    "Email me when a candidate accepts or declines an interview.",
};

const roleEvents: Record<"CANDIDATE" | "RECRUITER", readonly EmailEventType[]> =
  {
    CANDIDATE: [
      "APPLICATION_STATUS_CHANGED",
      "INTERVIEW_SCHEDULED",
      "INTERVIEW_RESCHEDULED",
      "INTERVIEW_CANCELED",
    ],
    RECRUITER: [
      "COMPANY_INVITATION_RECEIVED",
      "APPLICATION_SUBMITTED",
      "APPLICATION_WITHDRAWN",
      "INTERVIEW_RESPONSE_RECEIVED",
    ],
  };

export function getEmailEventsForRole(
  role: PlatformRole,
): readonly EmailEventType[] {
  return role === "ADMIN" ? [] : roleEvents[role];
}

export function isEmailEventAllowedForRole(
  role: PlatformRole,
  eventType: EmailEventType,
): boolean {
  return getEmailEventsForRole(role).includes(eventType);
}

export function resolveEmailPreference(
  preferences: readonly { eventType: EmailEventType; enabled: boolean }[],
  eventType: EmailEventType,
): boolean {
  return (
    preferences.find((preference) => preference.eventType === eventType)
      ?.enabled ?? true
  );
}

export const EMAIL_SUBJECT_MAX = 200;
export const EMAIL_DESTINATION_MAX = 512;
export const EMAIL_DEDUPE_KEY_MAX = 200;
export const EMAIL_DESTINATION_TOKEN = "{{CAREERBRIDGE_DESTINATION_URL}}";
export const CANDIDATE_DISPLAY_FALLBACK = "A candidate";

export type EmailTemplate = {
  subject: string;
  textBody: string;
  htmlBody: string;
  destinationPath: string;
};

export function boundedText(value: string, max: number): string {
  const codepoints = Array.from(value);
  if (codepoints.length <= max) return value;
  return `${codepoints
    .slice(0, Math.max(0, max - 1))
    .join("")
    .trimEnd()}…`;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function resolveCandidateDisplayName(
  name: string | null | undefined,
  fallback = CANDIDATE_DISPLAY_FALLBACK,
): string {
  return name?.trim() || fallback;
}

export function safeEmailDestination(path: string): string {
  const safePath = getSafeInternalPath(path, "");
  if (!safePath || safePath.length > EMAIL_DESTINATION_MAX) {
    throw new Error("Unsafe email destination.");
  }
  return safePath;
}

function template(input: {
  subject: string;
  message: string;
  cta: string;
  destinationPath: string;
}): EmailTemplate {
  const destinationPath = safeEmailDestination(input.destinationPath);
  const message = input.message.trim();
  return {
    subject: boundedText(input.subject.trim(), EMAIL_SUBJECT_MAX),
    textBody: `${message}\n\n${input.cta}: ${EMAIL_DESTINATION_TOKEN}`,
    htmlBody:
      '<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033">' +
      `<p>${escapeEmailHtml(message)}</p>` +
      `<p><a href="${EMAIL_DESTINATION_TOKEN}">${escapeEmailHtml(input.cta)}</a></p>` +
      "</body></html>",
    destinationPath,
  };
}

export function buildCompanyInvitationEmail(
  input: {
    companyName: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.companyInvitation;
  return template({
    subject: formatMessage(copy.subject, { companyName: input.companyName }),
    message: formatMessage(copy.message, { companyName: input.companyName }),
    cta: copy.cta,
    destinationPath: "/recruiter/invitations",
  });
}

export function buildApplicationSubmittedEmail(
  input: {
    applicationId: string;
    candidateName: string | null | undefined;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.applicationSubmitted;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(copy.message, {
      candidate,
      jobTitle: input.jobTitle,
    }),
    cta: copy.cta,
    destinationPath: `/recruiter/applications/${input.applicationId}`,
  });
}

export function buildApplicationStatusChangedEmail(
  input: {
    applicationId: string;
    jobTitle: string;
    status: ApplicationStatusValue;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.applicationStatusChanged;
  return template({
    subject: copy.subject,
    message: formatMessage(copy.message, {
      jobTitle: input.jobTitle,
      status: dictionary.labels.applicationStatus[input.status],
    }),
    cta: copy.cta,
    destinationPath: `/candidate/applications/${input.applicationId}`,
  });
}

export function buildApplicationWithdrawnEmail(
  input: {
    applicationId: string;
    candidateName: string | null | undefined;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.applicationWithdrawn;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(copy.message, {
      candidate,
      jobTitle: input.jobTitle,
    }),
    cta: copy.cta,
    destinationPath: `/recruiter/applications/${input.applicationId}`,
  });
}

// Interview email bodies intentionally carry only the Job title (and, for the
// recruiter-facing response event, the Candidate display name). The schedule,
// meeting URL, location, and instructions stay behind the authenticated
// destination route, which re-authorizes on open — possessing the email never
// grants interview access.

export function buildInterviewScheduledEmail(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.interviewScheduled;
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(copy.message, { jobTitle: input.jobTitle }),
    cta: copy.cta,
    destinationPath: `/candidate/interviews/${input.interviewId}`,
  });
}

export function buildInterviewRescheduledEmail(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.interviewRescheduled;
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(copy.message, { jobTitle: input.jobTitle }),
    cta: copy.cta,
    destinationPath: `/candidate/interviews/${input.interviewId}`,
  });
}

export function buildInterviewCanceledEmail(
  input: {
    interviewId: string;
    jobTitle: string;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.interviewCanceled;
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(copy.message, { jobTitle: input.jobTitle }),
    cta: copy.cta,
    destinationPath: `/candidate/interviews/${input.interviewId}`,
  });
}

export function buildInterviewResponseReceivedEmail(
  input: {
    interviewId: string;
    jobTitle: string;
    candidateName: string | null | undefined;
    response: InterviewResponseValue;
  },
  dictionary: AppDictionary = englishDictionary,
): EmailTemplate {
  const copy = dictionary.email.events.interviewResponseReceived;
  const candidate = resolveCandidateDisplayName(
    input.candidateName,
    dictionary.labels.fallbacks.candidate,
  );
  const message =
    input.response === "ACCEPTED" ? copy.messageAccepted : copy.messageDeclined;
  return template({
    subject: formatMessage(copy.subject, { jobTitle: input.jobTitle }),
    message: formatMessage(message, { candidate, jobTitle: input.jobTitle }),
    cta: copy.cta,
    destinationPath: `/recruiter/interviews/${input.interviewId}`,
  });
}

function dedupeKey(prefix: string, eventId: string, recipientUserId: string) {
  return boundedText(
    `${prefix}:${eventId}:${recipientUserId}`,
    EMAIL_DEDUPE_KEY_MAX,
  );
}

export const companyInvitationEmailDedupeKey = (
  invitationId: string,
  recipientUserId: string,
) => dedupeKey("company-invitation-email", invitationId, recipientUserId);

export const applicationSubmittedEmailDedupeKey = (
  applicationId: string,
  recipientUserId: string,
) => dedupeKey("application-submitted-email", applicationId, recipientUserId);

export const applicationStatusEmailDedupeKey = (
  historyId: string,
  recipientUserId: string,
) => dedupeKey("application-status-email", historyId, recipientUserId);

export const applicationWithdrawnEmailDedupeKey = (
  historyId: string,
  recipientUserId: string,
) => dedupeKey("application-withdrawn-email", historyId, recipientUserId);

// Interview email dedupe keys mirror the in-app notification strategy: the
// interview id keys one-time events (creation, terminal cancellation) and the
// immutable event id keys repeatable ones (each reschedule, each response).

export const interviewScheduledEmailDedupeKey = (
  interviewId: string,
  recipientUserId: string,
) => dedupeKey("interview-scheduled-email", interviewId, recipientUserId);

export const interviewRescheduledEmailDedupeKey = (
  rescheduleEventId: string,
  recipientUserId: string,
) =>
  dedupeKey("interview-rescheduled-email", rescheduleEventId, recipientUserId);

export const interviewCanceledEmailDedupeKey = (
  interviewId: string,
  recipientUserId: string,
) => dedupeKey("interview-canceled-email", interviewId, recipientUserId);

export const interviewResponseReceivedEmailDedupeKey = (
  responseEventId: string,
  recipientUserId: string,
) =>
  dedupeKey(
    "interview-response-received-email",
    responseEventId,
    recipientUserId,
  );

export function renderEmailDestination(
  body: string,
  absoluteDestinationUrl: string,
): string {
  return body.replaceAll(EMAIL_DESTINATION_TOKEN, absoluteDestinationUrl);
}
