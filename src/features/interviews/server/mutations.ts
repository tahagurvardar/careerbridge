import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";
import {
  ACTIVE_INTERVIEW_STATUSES,
  CANCELABLE_INTERVIEW_STATUSES,
  RESCHEDULABLE_INTERVIEW_STATUSES,
  canCandidateRespondToInterview,
  canRecruiterCancelInterview,
  canRecruiterCompleteInterview,
  canRecruiterRescheduleInterview,
  isApplicationEligibleForInterview,
  isStaleInterviewVersion,
  type InterviewResponseValue,
} from "@/features/interviews/interviews";
import type { ValidatedInterviewSchedule } from "@/features/interviews/schemas";
import {
  emitInterviewCanceledEmail,
  emitInterviewRescheduledEmail,
  emitInterviewResponseReceivedEmails,
  emitInterviewScheduledEmail,
} from "@/features/email/server/emit";
import {
  emitInterviewCanceledNotification,
  emitInterviewRescheduledNotification,
  emitInterviewResponseReceivedNotifications,
  emitInterviewScheduledNotification,
} from "@/features/notifications/server/emit";

// Every mutation here re-resolves identity, Company OWNER or Candidate
// ownership, Application eligibility, lifecycle legality, schedule conflicts,
// and the optimistic version from the session and fresh transaction reads. The
// browser only ever supplies opaque ids, validated schedule fields, and an
// expectedVersion concurrency token — never a status, an organizer, a
// recipient, a candidate, or an event type. Each Interview change, its
// immutable InterviewEvent, and its Notification/EmailOutbox rows commit or
// roll back together; no external provider is ever called inside these
// transactions.

export type InterviewActor = {
  userId: string;
  role: PlatformRole;
};

export type InterviewMutationErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NOT_ELIGIBLE"
  | "INVALID_TRANSITION"
  | "CANDIDATE_CONFLICT"
  | "ORGANIZER_CONFLICT"
  | "STALE_VERSION"
  | "CONFLICT";

export class InterviewMutationError extends Error {
  constructor(readonly code: InterviewMutationErrorCode) {
    super("Interview mutation failed.");
    this.name = "InterviewMutationError";
  }
}

type Tx = Prisma.TransactionClient;

function assertCandidate(actor: InterviewActor) {
  if (actor.role !== "CANDIDATE") {
    throw new InterviewMutationError("FORBIDDEN");
  }
}

function assertRecruiter(actor: InterviewActor) {
  if (actor.role !== "RECRUITER") {
    throw new InterviewMutationError("FORBIDDEN");
  }
}

function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

const SERIALIZABLE_ATTEMPTS = 3;

/**
 * Runs a conflict-window-sensitive mutation under Serializable isolation with
 * a bounded retry on serialization aborts (P2034), matching the repository's
 * existing transaction pattern. Concurrent overlapping schedules that would
 * write-skew past the conflict predicate are aborted by the database itself;
 * a retry re-executes every authorization, eligibility, and conflict check
 * against fresh state, so the loser of a race deterministically resolves to a
 * safe conflict error instead of a double booking.
 */
async function runSerializable<T>(
  prisma: PrismaClient,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        attempt < SERIALIZABLE_ATTEMPTS - 1 &&
        isPrismaErrorCode(error, "P2034")
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new InterviewMutationError("CONFLICT");
}

/** OWNER-scoped Application predicate: not owned is indistinguishable from absent. */
function ownedApplicationWhere(
  actorUserId: string,
): Prisma.JobApplicationWhereInput {
  return {
    job: {
      company: {
        memberships: { some: { userId: actorUserId, role: "OWNER" } },
      },
    },
  };
}

/**
 * Rejects a proposed schedule when the Candidate or the acting organizer
 * already holds an overlapping active (PENDING_RESPONSE or ACCEPTED)
 * interview. The overlap predicate is the shared half-open rule
 * (existing.startAt < proposed.endAt AND existing.endAt > proposed.startAt),
 * so back-to-back interviews never conflict, and CANCELED/DECLINED/COMPLETED
 * interviews never block a slot. Runs inside the Serializable transaction;
 * `excludeInterviewId` skips the interview being rescheduled.
 */
async function assertNoScheduleConflicts(
  tx: Tx,
  input: {
    candidateUserId: string;
    organizerUserId: string;
    startAt: Date;
    endAt: Date;
    excludeInterviewId?: string;
  },
) {
  const overlapWindow = {
    status: { in: [...ACTIVE_INTERVIEW_STATUSES] },
    startAt: { lt: input.endAt },
    endAt: { gt: input.startAt },
    ...(input.excludeInterviewId
      ? { id: { not: input.excludeInterviewId } }
      : {}),
  } satisfies Prisma.InterviewWhereInput;

  const candidateConflict = await tx.interview.findFirst({
    where: {
      ...overlapWindow,
      application: { candidateId: input.candidateUserId },
    },
    select: { id: true },
  });
  if (candidateConflict) {
    throw new InterviewMutationError("CANDIDATE_CONFLICT");
  }

  const organizerConflict = await tx.interview.findFirst({
    where: { ...overlapWindow, organizerUserId: input.organizerUserId },
    select: { id: true },
  });
  if (organizerConflict) {
    throw new InterviewMutationError("ORGANIZER_CONFLICT");
  }
}

/**
 * Schedules a new Interview for an active Application the acting Recruiter
 * OWNS. Atomically creates the Interview (PENDING_RESPONSE, version 1), its
 * CREATED event with a schedule snapshot, the Candidate's in-app notification,
 * and the Candidate's EmailOutbox (or SUPPRESSED) row.
 */
export async function scheduleInterview(
  prisma: PrismaClient,
  actor: InterviewActor,
  applicationId: string,
  schedule: ValidatedInterviewSchedule,
) {
  assertRecruiter(actor);

  return runSerializable(prisma, async (tx) => {
    const application = await tx.jobApplication.findFirst({
      where: { id: applicationId, ...ownedApplicationWhere(actor.userId) },
      select: {
        id: true,
        status: true,
        candidateId: true,
        job: { select: { id: true, companyId: true, title: true } },
      },
    });
    if (!application) {
      throw new InterviewMutationError("NOT_FOUND");
    }
    if (!isApplicationEligibleForInterview(application.status)) {
      throw new InterviewMutationError("NOT_ELIGIBLE");
    }

    await assertNoScheduleConflicts(tx, {
      candidateUserId: application.candidateId,
      organizerUserId: actor.userId,
      startAt: schedule.startAt,
      endAt: schedule.endAt,
    });

    const interview = await tx.interview.create({
      data: {
        applicationId: application.id,
        organizerUserId: actor.userId,
        title: schedule.title,
        format: schedule.format,
        status: "PENDING_RESPONSE",
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        timeZone: schedule.timeZone,
        location: schedule.location,
        meetingUrl: schedule.meetingUrl,
        instructions: schedule.instructions,
        version: 1,
      },
      select: { id: true },
    });
    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        actorUserId: actor.userId,
        type: "CREATED",
        fromStatus: null,
        toStatus: "PENDING_RESPONSE",
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        timeZone: schedule.timeZone,
      },
    });

    const shared = {
      interviewId: interview.id,
      applicationId: application.id,
      companyId: application.job.companyId,
      jobTitle: application.job.title,
      candidateUserId: application.candidateId,
      actorUserId: actor.userId,
    };
    await emitInterviewScheduledNotification(tx, {
      ...shared,
      jobId: application.job.id,
    });
    await emitInterviewScheduledEmail(tx, shared);

    return { id: interview.id, applicationId: application.id };
  });
}

/**
 * Records the owning Candidate's explicit accept or decline of a pending
 * interview. The response value is a server literal chosen by the accept and
 * decline actions — never browser input. Atomically compare-and-sets the
 * status + version, writes the matching immutable event, and notifies every
 * current Company OWNER in-app and through the outbox.
 */
export async function respondToInterview(
  prisma: PrismaClient,
  actor: InterviewActor,
  interviewId: string,
  expectedVersion: number,
  response: InterviewResponseValue,
) {
  assertCandidate(actor);

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findFirst({
      where: { id: interviewId, application: { candidateId: actor.userId } },
      select: {
        id: true,
        status: true,
        version: true,
        application: {
          select: {
            id: true,
            job: { select: { id: true, companyId: true, title: true } },
          },
        },
      },
    });
    if (!interview) {
      throw new InterviewMutationError("NOT_FOUND");
    }
    if (isStaleInterviewVersion(interview.version, expectedVersion)) {
      throw new InterviewMutationError("STALE_VERSION");
    }
    if (!canCandidateRespondToInterview(interview.status)) {
      throw new InterviewMutationError("INVALID_TRANSITION");
    }

    // Compare-and-set on id + version + allowed status. Any concurrent
    // response, reschedule, or cancellation already incremented the version,
    // so exactly one writer can win from a given version.
    const result = await tx.interview.updateMany({
      where: {
        id: interview.id,
        version: expectedVersion,
        status: "PENDING_RESPONSE",
        application: { candidateId: actor.userId },
      },
      data: {
        status: response,
        version: { increment: 1 },
        candidateRespondedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new InterviewMutationError("STALE_VERSION");
    }

    const event = await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        actorUserId: actor.userId,
        type: response,
        fromStatus: "PENDING_RESPONSE",
        toStatus: response,
      },
      select: { id: true },
    });

    const candidate = await tx.user.findUnique({
      where: { id: actor.userId },
      select: { name: true },
    });
    const shared = {
      interviewId: interview.id,
      responseEventId: event.id,
      applicationId: interview.application.id,
      companyId: interview.application.job.companyId,
      jobTitle: interview.application.job.title,
      response,
      candidateUserId: actor.userId,
      candidateName: candidate?.name,
    };
    await emitInterviewResponseReceivedNotifications(tx, {
      ...shared,
      jobId: interview.application.job.id,
    });
    await emitInterviewResponseReceivedEmails(tx, shared);

    return {
      id: interview.id,
      applicationId: interview.application.id,
      status: response,
    };
  });
}

/**
 * Reschedules a PENDING_RESPONSE, ACCEPTED, or DECLINED interview on an
 * Application the acting Recruiter OWNS and that is still active. The status
 * returns to PENDING_RESPONSE, the Candidate's previous response is cleared,
 * and the acting OWNER becomes the organizer. Conflict checks re-run for both
 * the Candidate and the acting organizer, excluding this interview's own slot.
 * Prior events are never modified; a new RESCHEDULED event snapshots the new
 * schedule.
 */
export async function rescheduleInterview(
  prisma: PrismaClient,
  actor: InterviewActor,
  interviewId: string,
  expectedVersion: number,
  schedule: ValidatedInterviewSchedule,
) {
  assertRecruiter(actor);

  return runSerializable(prisma, async (tx) => {
    const interview = await tx.interview.findFirst({
      where: {
        id: interviewId,
        application: ownedApplicationWhere(actor.userId),
      },
      select: {
        id: true,
        status: true,
        version: true,
        application: {
          select: {
            id: true,
            status: true,
            candidateId: true,
            job: { select: { id: true, companyId: true, title: true } },
          },
        },
      },
    });
    if (!interview) {
      throw new InterviewMutationError("NOT_FOUND");
    }
    if (isStaleInterviewVersion(interview.version, expectedVersion)) {
      throw new InterviewMutationError("STALE_VERSION");
    }
    if (!canRecruiterRescheduleInterview(interview.status)) {
      throw new InterviewMutationError("INVALID_TRANSITION");
    }
    if (!isApplicationEligibleForInterview(interview.application.status)) {
      throw new InterviewMutationError("NOT_ELIGIBLE");
    }

    await assertNoScheduleConflicts(tx, {
      candidateUserId: interview.application.candidateId,
      organizerUserId: actor.userId,
      startAt: schedule.startAt,
      endAt: schedule.endAt,
      excludeInterviewId: interview.id,
    });

    const result = await tx.interview.updateMany({
      where: {
        id: interview.id,
        version: expectedVersion,
        status: { in: [...RESCHEDULABLE_INTERVIEW_STATUSES] },
        application: ownedApplicationWhere(actor.userId),
      },
      data: {
        title: schedule.title,
        format: schedule.format,
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        timeZone: schedule.timeZone,
        location: schedule.location,
        meetingUrl: schedule.meetingUrl,
        instructions: schedule.instructions,
        status: "PENDING_RESPONSE",
        candidateRespondedAt: null,
        organizerUserId: actor.userId,
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new InterviewMutationError("STALE_VERSION");
    }

    const event = await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        actorUserId: actor.userId,
        type: "RESCHEDULED",
        fromStatus: interview.status,
        toStatus: "PENDING_RESPONSE",
        startAt: schedule.startAt,
        endAt: schedule.endAt,
        timeZone: schedule.timeZone,
      },
      select: { id: true },
    });

    const shared = {
      interviewId: interview.id,
      rescheduleEventId: event.id,
      applicationId: interview.application.id,
      companyId: interview.application.job.companyId,
      jobTitle: interview.application.job.title,
      candidateUserId: interview.application.candidateId,
      actorUserId: actor.userId,
    };
    await emitInterviewRescheduledNotification(tx, {
      ...shared,
      jobId: interview.application.job.id,
    });
    await emitInterviewRescheduledEmail(tx, shared);

    return { id: interview.id, applicationId: interview.application.id };
  });
}

/**
 * Cancels a PENDING_RESPONSE, ACCEPTED, or DECLINED interview on an
 * Application the acting Recruiter OWNS. Terminal and idempotence-safe: the
 * compare-and-set means a repeated cancellation resolves to a stale/invalid
 * error before any event, notification, or outbox write. The row is never
 * hard-deleted.
 */
export async function cancelInterview(
  prisma: PrismaClient,
  actor: InterviewActor,
  interviewId: string,
  expectedVersion: number,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findFirst({
      where: {
        id: interviewId,
        application: ownedApplicationWhere(actor.userId),
      },
      select: {
        id: true,
        status: true,
        version: true,
        application: {
          select: {
            id: true,
            candidateId: true,
            job: { select: { id: true, companyId: true, title: true } },
          },
        },
      },
    });
    if (!interview) {
      throw new InterviewMutationError("NOT_FOUND");
    }
    if (isStaleInterviewVersion(interview.version, expectedVersion)) {
      throw new InterviewMutationError("STALE_VERSION");
    }
    if (!canRecruiterCancelInterview(interview.status)) {
      throw new InterviewMutationError("INVALID_TRANSITION");
    }

    const result = await tx.interview.updateMany({
      where: {
        id: interview.id,
        version: expectedVersion,
        status: { in: [...CANCELABLE_INTERVIEW_STATUSES] },
        application: ownedApplicationWhere(actor.userId),
      },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new InterviewMutationError("STALE_VERSION");
    }

    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        actorUserId: actor.userId,
        type: "CANCELED",
        fromStatus: interview.status,
        toStatus: "CANCELED",
      },
    });

    const shared = {
      interviewId: interview.id,
      applicationId: interview.application.id,
      companyId: interview.application.job.companyId,
      jobTitle: interview.application.job.title,
      candidateUserId: interview.application.candidateId,
      actorUserId: actor.userId,
    };
    await emitInterviewCanceledNotification(tx, {
      ...shared,
      jobId: interview.application.job.id,
    });
    await emitInterviewCanceledEmail(tx, shared);

    return { id: interview.id, applicationId: interview.application.id };
  });
}

/**
 * Marks an ACCEPTED interview COMPLETED once its start time has arrived
 * (a small documented clock-skew tolerance is allowed). Terminal. No Candidate
 * notification or email is sent for completion in this phase, and the
 * Application status is never touched.
 */
export async function completeInterview(
  prisma: PrismaClient,
  actor: InterviewActor,
  interviewId: string,
  expectedVersion: number,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (tx) => {
    const interview = await tx.interview.findFirst({
      where: {
        id: interviewId,
        application: ownedApplicationWhere(actor.userId),
      },
      select: {
        id: true,
        status: true,
        version: true,
        startAt: true,
        application: { select: { id: true } },
      },
    });
    if (!interview) {
      throw new InterviewMutationError("NOT_FOUND");
    }
    if (isStaleInterviewVersion(interview.version, expectedVersion)) {
      throw new InterviewMutationError("STALE_VERSION");
    }
    if (
      !canRecruiterCompleteInterview(
        interview.status,
        interview.startAt,
        new Date(),
      )
    ) {
      throw new InterviewMutationError("INVALID_TRANSITION");
    }

    const result = await tx.interview.updateMany({
      where: {
        id: interview.id,
        version: expectedVersion,
        status: "ACCEPTED",
        application: ownedApplicationWhere(actor.userId),
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });
    if (result.count !== 1) {
      throw new InterviewMutationError("STALE_VERSION");
    }

    await tx.interviewEvent.create({
      data: {
        interviewId: interview.id,
        actorUserId: actor.userId,
        type: "COMPLETED",
        fromStatus: interview.status,
        toStatus: "COMPLETED",
      },
    });

    return { id: interview.id, applicationId: interview.application.id };
  });
}
