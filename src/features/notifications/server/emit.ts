import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatusValue } from "@/features/applications/schemas";
import type { InterviewResponseValue } from "@/features/interviews/interviews";
import {
  applicationStatusChangedDedupeKey,
  applicationSubmittedDedupeKey,
  applicationWithdrawnDedupeKey,
  buildApplicationStatusChangedContent,
  buildApplicationSubmittedContent,
  buildApplicationWithdrawnContent,
  buildCompanyInvitationReceivedContent,
  buildInterviewCanceledContent,
  buildInterviewRescheduledContent,
  buildInterviewResponseReceivedContent,
  buildInterviewScheduledContent,
  companyInvitationReceivedDedupeKey,
  dedupeRecipientIds,
  interviewCanceledDedupeKey,
  interviewRescheduledDedupeKey,
  interviewResponseReceivedDedupeKey,
  interviewScheduledDedupeKey,
  type NotificationContent,
} from "@/features/notifications/notifications";

// Emit helpers run INSIDE the caller's domain transaction, so notification
// rows are atomic with the JobApplication + ApplicationStatusHistory writes. A
// rolled-back mutation therefore creates no notifications. `createMany` with
// `skipDuplicates` relies on the `dedupeKey` unique constraint to make retries
// and concurrent duplicate events idempotent.
type Tx = Prisma.TransactionClient;

/**
 * Resolves the current OWNER recipients of a Company from fresh transaction
 * state. The extra `user.role = RECRUITER` predicate is the repository's
 * owner-scoping idiom: it excludes MEMBER memberships, any Admin who might hold
 * a membership row, and any non-Recruiter, so only Recruiter OWNERs are ever
 * notified. The acting user is always removed (no self-notifications).
 */
async function resolveCompanyOwnerRecipients(
  tx: Tx,
  companyId: string,
  actorUserId: string,
): Promise<string[]> {
  const owners = await tx.companyMembership.findMany({
    where: {
      companyId,
      role: "OWNER",
      user: { role: "RECRUITER" },
    },
    select: { userId: true },
  });
  return dedupeRecipientIds(
    owners.map((owner) => owner.userId),
    actorUserId,
  );
}

/**
 * One APPLICATION_SUBMITTED notification per current Company OWNER when a
 * Candidate submits an application.
 */
export async function emitApplicationSubmittedNotifications(
  tx: Tx,
  input: {
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    candidateName: string | null | undefined;
  },
): Promise<number> {
  const recipients = await resolveCompanyOwnerRecipients(
    tx,
    input.companyId,
    input.candidateUserId,
  );
  if (recipients.length === 0) return 0;

  const content = buildApplicationSubmittedContent({
    applicationId: input.applicationId,
    candidateName: input.candidateName,
    jobTitle: input.jobTitle,
  });

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.candidateUserId,
      type: "APPLICATION_SUBMITTED" as const,
      title: content.title,
      message: content.message,
      href: content.href,
      applicationId: input.applicationId,
      jobId: input.jobId,
      companyId: input.companyId,
      dedupeKey: applicationSubmittedDedupeKey(
        input.applicationId,
        recipientUserId,
      ),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * One APPLICATION_STATUS_CHANGED notification for the Candidate who owns the
 * application when a Recruiter transitions its status. The status-history id
 * keys the dedupe value so each distinct transition is its own notification.
 */
export async function emitApplicationStatusChangedNotification(
  tx: Tx,
  input: {
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    status: ApplicationStatusValue;
    candidateUserId: string;
    actorUserId: string;
    statusHistoryId: string;
  },
): Promise<number> {
  const recipients = dedupeRecipientIds(
    [input.candidateUserId],
    input.actorUserId,
  );
  if (recipients.length === 0) return 0;

  const content = buildApplicationStatusChangedContent({
    applicationId: input.applicationId,
    jobTitle: input.jobTitle,
    status: input.status,
  });

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.actorUserId,
      type: "APPLICATION_STATUS_CHANGED" as const,
      title: content.title,
      message: content.message,
      href: content.href,
      applicationId: input.applicationId,
      jobId: input.jobId,
      companyId: input.companyId,
      dedupeKey: applicationStatusChangedDedupeKey(
        input.statusHistoryId,
        recipientUserId,
      ),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * One COMPANY_INVITATION_RECEIVED notification for the invited Recruiter when
 * a Company OWNER creates an invitation. Runs inside the invitation-creation
 * transaction, so a rolled-back invitation emits nothing. The recipient is the
 * server-resolved invitee — never a client value — and the copy contains only
 * the Company name and the safe invitation-list destination: no invitee email,
 * no activeKey, no private membership data. Possessing the notification grants
 * no membership; the invitation must still be explicitly accepted.
 */
export async function emitCompanyInvitationReceivedNotification(
  tx: Tx,
  input: {
    invitationId: string;
    companyId: string;
    companyName: string;
    inviteeUserId: string;
    invitedByUserId: string;
  },
): Promise<number> {
  const recipients = dedupeRecipientIds(
    [input.inviteeUserId],
    input.invitedByUserId,
  );
  if (recipients.length === 0) return 0;

  const content = buildCompanyInvitationReceivedContent({
    companyName: input.companyName,
  });

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.invitedByUserId,
      type: "COMPANY_INVITATION_RECEIVED" as const,
      title: content.title,
      message: content.message,
      href: content.href,
      companyId: input.companyId,
      dedupeKey: companyInvitationReceivedDedupeKey(
        input.invitationId,
        recipientUserId,
      ),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * One Candidate-facing interview notification. Shared by the scheduled,
 * rescheduled, and canceled events, which differ only in copy and dedupe key.
 * The recipient is always the Application's Candidate resolved by the caller
 * from fresh transaction state — never a browser value — and the copy never
 * contains the meeting URL, location, instructions, or schedule.
 */
async function emitCandidateInterviewNotification(
  tx: Tx,
  input: {
    type:
      "INTERVIEW_SCHEDULED" | "INTERVIEW_RESCHEDULED" | "INTERVIEW_CANCELED";
    content: NotificationContent;
    dedupeKey: (recipientUserId: string) => string;
    applicationId: string;
    jobId: string;
    companyId: string;
    candidateUserId: string;
    actorUserId: string;
  },
): Promise<number> {
  const recipients = dedupeRecipientIds(
    [input.candidateUserId],
    input.actorUserId,
  );
  if (recipients.length === 0) return 0;

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.actorUserId,
      type: input.type,
      title: input.content.title,
      message: input.content.message,
      href: input.content.href,
      applicationId: input.applicationId,
      jobId: input.jobId,
      companyId: input.companyId,
      dedupeKey: input.dedupeKey(recipientUserId),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * One INTERVIEW_SCHEDULED notification for the Candidate when a Company OWNER
 * schedules an interview for their application.
 */
export async function emitInterviewScheduledNotification(
  tx: Tx,
  input: {
    interviewId: string;
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
): Promise<number> {
  return emitCandidateInterviewNotification(tx, {
    type: "INTERVIEW_SCHEDULED",
    content: buildInterviewScheduledContent(input),
    dedupeKey: (recipientUserId) =>
      interviewScheduledDedupeKey(input.interviewId, recipientUserId),
    ...input,
  });
}

/**
 * One INTERVIEW_RESCHEDULED notification for the Candidate. Keyed on the
 * immutable RESCHEDULED event id so every distinct reschedule notifies once.
 */
export async function emitInterviewRescheduledNotification(
  tx: Tx,
  input: {
    interviewId: string;
    rescheduleEventId: string;
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
): Promise<number> {
  return emitCandidateInterviewNotification(tx, {
    type: "INTERVIEW_RESCHEDULED",
    content: buildInterviewRescheduledContent(input),
    dedupeKey: (recipientUserId) =>
      interviewRescheduledDedupeKey(input.rescheduleEventId, recipientUserId),
    ...input,
  });
}

/**
 * One INTERVIEW_CANCELED notification for the Candidate. Cancellation is a
 * one-time terminal transition, so the interview id keys the dedupe value and
 * a replayed cancellation can never add a duplicate.
 */
export async function emitInterviewCanceledNotification(
  tx: Tx,
  input: {
    interviewId: string;
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    actorUserId: string;
  },
): Promise<number> {
  return emitCandidateInterviewNotification(tx, {
    type: "INTERVIEW_CANCELED",
    content: buildInterviewCanceledContent(input),
    dedupeKey: (recipientUserId) =>
      interviewCanceledDedupeKey(input.interviewId, recipientUserId),
    ...input,
  });
}

/**
 * One INTERVIEW_RESPONSE_RECEIVED notification per current Company OWNER when
 * the Candidate accepts or declines. The responding Candidate is the actor, so
 * the owner-recipient helper's self-exclusion keeps MEMBERs, Admins,
 * cross-Company Recruiters, and the Candidate out by construction.
 */
export async function emitInterviewResponseReceivedNotifications(
  tx: Tx,
  input: {
    interviewId: string;
    responseEventId: string;
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    response: InterviewResponseValue;
    candidateUserId: string;
    candidateName: string | null | undefined;
  },
): Promise<number> {
  const recipients = await resolveCompanyOwnerRecipients(
    tx,
    input.companyId,
    input.candidateUserId,
  );
  if (recipients.length === 0) return 0;

  const content = buildInterviewResponseReceivedContent(input);

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.candidateUserId,
      type: "INTERVIEW_RESPONSE_RECEIVED" as const,
      title: content.title,
      message: content.message,
      href: content.href,
      applicationId: input.applicationId,
      jobId: input.jobId,
      companyId: input.companyId,
      dedupeKey: interviewResponseReceivedDedupeKey(
        input.responseEventId,
        recipientUserId,
      ),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

/**
 * One APPLICATION_WITHDRAWN notification per current Company OWNER when a
 * Candidate withdraws an application. The status-history id keys the dedupe
 * value so a repeated (no-op) withdrawal never adds a duplicate.
 */
export async function emitApplicationWithdrawnNotifications(
  tx: Tx,
  input: {
    applicationId: string;
    jobId: string;
    companyId: string;
    jobTitle: string;
    candidateUserId: string;
    candidateName: string | null | undefined;
    statusHistoryId: string;
  },
): Promise<number> {
  const recipients = await resolveCompanyOwnerRecipients(
    tx,
    input.companyId,
    input.candidateUserId,
  );
  if (recipients.length === 0) return 0;

  const content = buildApplicationWithdrawnContent({
    applicationId: input.applicationId,
    candidateName: input.candidateName,
    jobTitle: input.jobTitle,
  });

  const result = await tx.notification.createMany({
    data: recipients.map((recipientUserId) => ({
      recipientUserId,
      actorUserId: input.candidateUserId,
      type: "APPLICATION_WITHDRAWN" as const,
      title: content.title,
      message: content.message,
      href: content.href,
      applicationId: input.applicationId,
      jobId: input.jobId,
      companyId: input.companyId,
      dedupeKey: applicationWithdrawnDedupeKey(
        input.statusHistoryId,
        recipientUserId,
      ),
    })),
    skipDuplicates: true,
  });
  return result.count;
}
