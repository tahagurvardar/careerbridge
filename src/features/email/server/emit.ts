import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { EmailEventType } from "@/generated/prisma/enums";
import type { ApplicationStatusValue } from "@/features/applications/schemas";
import type { InterviewResponseValue } from "@/features/interviews/interviews";
import { getEmailMaxAttempts } from "@/features/email/config";
import {
  applicationStatusEmailDedupeKey,
  applicationSubmittedEmailDedupeKey,
  applicationWithdrawnEmailDedupeKey,
  buildApplicationStatusChangedEmail,
  buildApplicationSubmittedEmail,
  buildApplicationWithdrawnEmail,
  buildCompanyInvitationEmail,
  buildInterviewCanceledEmail,
  buildInterviewRescheduledEmail,
  buildInterviewResponseReceivedEmail,
  buildInterviewScheduledEmail,
  companyInvitationEmailDedupeKey,
  interviewCanceledEmailDedupeKey,
  interviewRescheduledEmailDedupeKey,
  interviewResponseReceivedEmailDedupeKey,
  interviewScheduledEmailDedupeKey,
  resolveEmailPreference,
  type EmailTemplate,
} from "@/features/email/email";

type Tx = Prisma.TransactionClient;

type Recipient = {
  id: string;
  email: string;
  emailPreferences: { eventType: EmailEventType; enabled: boolean }[];
};

async function resolveCompanyOwners(
  tx: Tx,
  companyId: string,
  actorUserId: string,
  eventType: EmailEventType,
): Promise<Recipient[]> {
  const owners = await tx.user.findMany({
    where: {
      id: { not: actorUserId },
      role: "RECRUITER",
      companyMemberships: { some: { companyId, role: "OWNER" } },
    },
    select: {
      id: true,
      email: true,
      emailPreferences: {
        where: { eventType },
        select: { eventType: true, enabled: true },
      },
    },
  });
  return [...new Map(owners.map((owner) => [owner.id, owner])).values()];
}

async function resolveRecipient(
  tx: Tx,
  recipientUserId: string,
  expectedRole: "CANDIDATE" | "RECRUITER",
  actorUserId: string,
  eventType: EmailEventType,
): Promise<Recipient[]> {
  if (recipientUserId === actorUserId) return [];
  const recipient = await tx.user.findFirst({
    where: { id: recipientUserId, role: expectedRole },
    select: {
      id: true,
      email: true,
      emailPreferences: {
        where: { eventType },
        select: { eventType: true, enabled: true },
      },
    },
  });
  return recipient ? [recipient] : [];
}

async function createOutboxRows(
  tx: Tx,
  input: {
    recipients: Recipient[];
    eventType: EmailEventType;
    content: EmailTemplate;
    dedupeKey: (recipientUserId: string) => string;
    applicationId?: string;
    companyId?: string;
    invitationId?: string;
  },
): Promise<number> {
  if (input.recipients.length === 0) return 0;
  const maxAttempts = getEmailMaxAttempts();
  const result = await tx.emailOutbox.createMany({
    data: input.recipients.map((recipient) => {
      const enabled = resolveEmailPreference(
        recipient.emailPreferences,
        input.eventType,
      );
      return {
        recipientUserId: recipient.id,
        recipientEmail: recipient.email,
        eventType: input.eventType,
        subject: input.content.subject,
        textBody: input.content.textBody,
        htmlBody: input.content.htmlBody,
        destinationPath: input.content.destinationPath,
        dedupeKey: input.dedupeKey(recipient.id),
        status: enabled ? ("PENDING" as const) : ("SUPPRESSED" as const),
        maxAttempts,
        lastErrorCode: enabled ? null : "USER_PREFERENCE",
        applicationId: input.applicationId,
        companyId: input.companyId,
        invitationId: input.invitationId,
      };
    }),
    skipDuplicates: true,
  });
  return result.count;
}

export async function emitApplicationSubmittedEmails(
  tx: Tx,
  input: {
    applicationId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    candidateName: string | null | undefined;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveCompanyOwners(
      tx,
      input.companyId,
      input.candidateUserId,
      "APPLICATION_SUBMITTED",
    ),
    eventType: "APPLICATION_SUBMITTED",
    content: buildApplicationSubmittedEmail(input),
    dedupeKey: (recipientUserId) =>
      applicationSubmittedEmailDedupeKey(input.applicationId, recipientUserId),
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
}

export async function emitApplicationStatusChangedEmail(
  tx: Tx,
  input: {
    applicationId: string;
    companyId: string;
    jobTitle: string;
    status: ApplicationStatusValue;
    candidateUserId: string;
    actorUserId: string;
    statusHistoryId: string;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveRecipient(
      tx,
      input.candidateUserId,
      "CANDIDATE",
      input.actorUserId,
      "APPLICATION_STATUS_CHANGED",
    ),
    eventType: "APPLICATION_STATUS_CHANGED",
    content: buildApplicationStatusChangedEmail(input),
    dedupeKey: (recipientUserId) =>
      applicationStatusEmailDedupeKey(input.statusHistoryId, recipientUserId),
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
}

export async function emitApplicationWithdrawnEmails(
  tx: Tx,
  input: {
    applicationId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    candidateName: string | null | undefined;
    statusHistoryId: string;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveCompanyOwners(
      tx,
      input.companyId,
      input.candidateUserId,
      "APPLICATION_WITHDRAWN",
    ),
    eventType: "APPLICATION_WITHDRAWN",
    content: buildApplicationWithdrawnEmail(input),
    dedupeKey: (recipientUserId) =>
      applicationWithdrawnEmailDedupeKey(
        input.statusHistoryId,
        recipientUserId,
      ),
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
}

/**
 * One Candidate-facing interview outbox row (or SUPPRESSED row when the
 * Candidate disabled the event). Shared by the scheduled, rescheduled, and
 * canceled events, which differ only in template and dedupe key. Bodies never
 * contain the meeting URL, location, instructions, or schedule.
 */
async function emitCandidateInterviewEmail(
  tx: Tx,
  input: {
    eventType:
      "INTERVIEW_SCHEDULED" | "INTERVIEW_RESCHEDULED" | "INTERVIEW_CANCELED";
    content: EmailTemplate;
    dedupeKey: (recipientUserId: string) => string;
    applicationId: string;
    companyId: string;
    candidateUserId: string;
    actorUserId: string;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveRecipient(
      tx,
      input.candidateUserId,
      "CANDIDATE",
      input.actorUserId,
      input.eventType,
    ),
    eventType: input.eventType,
    content: input.content,
    dedupeKey: input.dedupeKey,
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
}

export async function emitInterviewScheduledEmail(
  tx: Tx,
  input: {
    interviewId: string;
    applicationId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
) {
  return emitCandidateInterviewEmail(tx, {
    eventType: "INTERVIEW_SCHEDULED",
    content: buildInterviewScheduledEmail(input),
    dedupeKey: (recipientUserId) =>
      interviewScheduledEmailDedupeKey(input.interviewId, recipientUserId),
    ...input,
  });
}

export async function emitInterviewRescheduledEmail(
  tx: Tx,
  input: {
    interviewId: string;
    rescheduleEventId: string;
    applicationId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
) {
  return emitCandidateInterviewEmail(tx, {
    eventType: "INTERVIEW_RESCHEDULED",
    content: buildInterviewRescheduledEmail(input),
    dedupeKey: (recipientUserId) =>
      interviewRescheduledEmailDedupeKey(
        input.rescheduleEventId,
        recipientUserId,
      ),
    ...input,
  });
}

export async function emitInterviewCanceledEmail(
  tx: Tx,
  input: {
    interviewId: string;
    applicationId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
) {
  return emitCandidateInterviewEmail(tx, {
    eventType: "INTERVIEW_CANCELED",
    content: buildInterviewCanceledEmail(input),
    dedupeKey: (recipientUserId) =>
      interviewCanceledEmailDedupeKey(input.interviewId, recipientUserId),
    ...input,
  });
}

/**
 * One INTERVIEW_RESPONSE_RECEIVED outbox row (or SUPPRESSED row) per current
 * Recruiter OWNER of the Job's Company when the Candidate responds. The
 * responding Candidate is the actor, so owners are resolved from fresh
 * transaction state and MEMBERs, Admins, and cross-Company Recruiters are
 * excluded by construction.
 */
export async function emitInterviewResponseReceivedEmails(
  tx: Tx,
  input: {
    interviewId: string;
    responseEventId: string;
    applicationId: string;
    companyId: string;
    jobTitle: string;
    response: InterviewResponseValue;
    candidateUserId: string;
    candidateName: string | null | undefined;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveCompanyOwners(
      tx,
      input.companyId,
      input.candidateUserId,
      "INTERVIEW_RESPONSE_RECEIVED",
    ),
    eventType: "INTERVIEW_RESPONSE_RECEIVED",
    content: buildInterviewResponseReceivedEmail(input),
    dedupeKey: (recipientUserId) =>
      interviewResponseReceivedEmailDedupeKey(
        input.responseEventId,
        recipientUserId,
      ),
    applicationId: input.applicationId,
    companyId: input.companyId,
  });
}

export async function emitCompanyInvitationReceivedEmail(
  tx: Tx,
  input: {
    invitationId: string;
    companyId: string;
    companyName: string;
    inviteeUserId: string;
    invitedByUserId: string;
  },
) {
  return createOutboxRows(tx, {
    recipients: await resolveRecipient(
      tx,
      input.inviteeUserId,
      "RECRUITER",
      input.invitedByUserId,
      "COMPANY_INVITATION_RECEIVED",
    ),
    eventType: "COMPANY_INVITATION_RECEIVED",
    content: buildCompanyInvitationEmail(input),
    dedupeKey: (recipientUserId) =>
      companyInvitationEmailDedupeKey(input.invitationId, recipientUserId),
    companyId: input.companyId,
    invitationId: input.invitationId,
  });
}
