import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { ApplicationStatusValue } from "@/features/applications/schemas";
import {
  applicationStatusChangedDedupeKey,
  applicationSubmittedDedupeKey,
  applicationWithdrawnDedupeKey,
  buildApplicationStatusChangedContent,
  buildApplicationSubmittedContent,
  buildApplicationWithdrawnContent,
  dedupeRecipientIds,
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
