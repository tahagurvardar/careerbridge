import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { PUBLIC_JOB_VISIBILITY_WHERE } from "@/features/admin/moderation";
import type { PlatformRole } from "@/features/auth/roles";
import {
  getCandidateProfileReadiness,
  isApplicationDeadlinePassed,
} from "@/features/applications/eligibility";
import {
  canCandidateWithdrawApplication,
  canRecruiterTransitionApplication,
} from "@/features/applications/lifecycle";
import type { RecruiterTargetStatus } from "@/features/applications/schemas";
import {
  emitApplicationStatusChangedEmail,
  emitApplicationSubmittedEmails,
  emitApplicationWithdrawnEmails,
} from "@/features/email/server/emit";
import {
  emitApplicationStatusChangedNotification,
  emitApplicationSubmittedNotifications,
  emitApplicationWithdrawnNotifications,
} from "@/features/notifications/server/emit";

export type ApplicationActor = {
  userId: string;
  role: PlatformRole;
};

export type ApplicationMutationErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NOT_ELIGIBLE"
  | "PROFILE_INCOMPLETE"
  | "DEADLINE_PASSED"
  | "ALREADY_APPLIED"
  | "INVALID_TRANSITION"
  | "CONFLICT";

export class ApplicationMutationError extends Error {
  constructor(
    readonly code: ApplicationMutationErrorCode,
    readonly details?: readonly string[],
  ) {
    super("Application mutation failed.");
    this.name = "ApplicationMutationError";
  }
}

function assertCandidate(actor: ApplicationActor) {
  if (actor.role !== "CANDIDATE") {
    throw new ApplicationMutationError("FORBIDDEN");
  }
}

function assertRecruiter(actor: ApplicationActor) {
  if (actor.role !== "RECRUITER") {
    throw new ApplicationMutationError("FORBIDDEN");
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

export async function createJobApplication(
  prisma: PrismaClient,
  actor: ApplicationActor,
  slug: string,
  coverLetter: string,
) {
  assertCandidate(actor);
  const normalizedCoverLetter = coverLetter.trim() || null;

  try {
    return await prisma.$transaction(async (transaction) => {
      // Re-check every eligibility condition against fresh database state.
      const job = await transaction.job.findFirst({
        where: {
          slug,
          ...PUBLIC_JOB_VISIBILITY_WHERE,
        },
        select: {
          id: true,
          applicationDeadline: true,
          companyId: true,
          title: true,
        },
      });
      if (!job) {
        throw new ApplicationMutationError("NOT_ELIGIBLE");
      }
      if (isApplicationDeadlinePassed(job.applicationDeadline)) {
        throw new ApplicationMutationError("DEADLINE_PASSED");
      }

      const profile = await transaction.candidateProfile.findUnique({
        where: { userId: actor.userId },
        select: {
          headline: true,
          location: true,
          _count: { select: { skills: true } },
        },
      });
      const readiness = getCandidateProfileReadiness({
        headline: profile?.headline ?? null,
        location: profile?.location ?? null,
        skillCount: profile?._count.skills ?? 0,
      });
      if (!readiness.isReady) {
        throw new ApplicationMutationError(
          "PROFILE_INCOMPLETE",
          readiness.missingFields.map(({ label }) => label),
        );
      }

      // Snapshot the Candidate's current CV from fresh state inside the same
      // transaction. The document id comes only from the Candidate's own
      // current-resume pointer, never from browser input, so another
      // Candidate's document can never be attached. No current CV is allowed.
      const currentResume = await transaction.candidateResume.findUnique({
        where: { candidateId: actor.userId },
        select: { documentId: true },
      });

      const application = await transaction.jobApplication.create({
        data: {
          jobId: job.id,
          candidateId: actor.userId,
          coverLetter: normalizedCoverLetter,
          status: "SUBMITTED",
          resumeDocumentId: currentResume?.documentId ?? null,
        },
        select: { id: true },
      });
      await transaction.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: "SUBMITTED",
          changedByUserId: actor.userId,
        },
      });

      // Notify every current Company OWNER, atomically with the application and
      // its initial history. The Candidate display name is read from trusted
      // server state, never from the browser.
      const candidate = await transaction.user.findUnique({
        where: { id: actor.userId },
        select: { name: true },
      });
      await emitApplicationSubmittedNotifications(transaction, {
        applicationId: application.id,
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateUserId: actor.userId,
        candidateName: candidate?.name,
      });
      await emitApplicationSubmittedEmails(transaction, {
        applicationId: application.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateUserId: actor.userId,
        candidateName: candidate?.name,
      });

      return { id: application.id };
    });
  } catch (error) {
    if (error instanceof ApplicationMutationError) throw error;
    // The unique (jobId, candidateId) constraint turns a concurrent duplicate
    // submission into a clean already-applied result.
    if (isPrismaErrorCode(error, "P2002")) {
      throw new ApplicationMutationError("ALREADY_APPLIED");
    }
    throw error;
  }
}

export async function withdrawJobApplication(
  prisma: PrismaClient,
  actor: ApplicationActor,
  applicationId: string,
) {
  assertCandidate(actor);

  return prisma.$transaction(async (transaction) => {
    const application = await transaction.jobApplication.findFirst({
      where: { id: applicationId, candidateId: actor.userId },
      select: {
        id: true,
        status: true,
        candidateId: true,
        job: { select: { id: true, companyId: true, title: true } },
      },
    });
    if (!application) {
      throw new ApplicationMutationError("NOT_FOUND");
    }
    if (!canCandidateWithdrawApplication(application.status)) {
      throw new ApplicationMutationError("INVALID_TRANSITION");
    }

    // Compare-and-set on the current status guards against a concurrent change.
    const result = await transaction.jobApplication.updateMany({
      where: {
        id: application.id,
        candidateId: actor.userId,
        status: application.status,
      },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ApplicationMutationError("CONFLICT");
    }

    const history = await transaction.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: "WITHDRAWN",
        changedByUserId: actor.userId,
      },
      select: { id: true },
    });

    // Notify every current Company OWNER, atomically with the status change and
    // its history. Keyed on the history id so a repeated withdrawal — which can
    // never reach here after the compare-and-set — could add no duplicate.
    const candidate = await transaction.user.findUnique({
      where: { id: actor.userId },
      select: { name: true },
    });
    await emitApplicationWithdrawnNotifications(transaction, {
      applicationId: application.id,
      jobId: application.job.id,
      companyId: application.job.companyId,
      jobTitle: application.job.title,
      candidateUserId: actor.userId,
      candidateName: candidate?.name,
      statusHistoryId: history.id,
    });
    await emitApplicationWithdrawnEmails(transaction, {
      applicationId: application.id,
      companyId: application.job.companyId,
      jobTitle: application.job.title,
      candidateUserId: actor.userId,
      candidateName: candidate?.name,
      statusHistoryId: history.id,
    });

    return { status: "WITHDRAWN" as const };
  });
}

export async function transitionApplicationByRecruiter(
  prisma: PrismaClient,
  actor: ApplicationActor,
  applicationId: string,
  targetStatus: RecruiterTargetStatus,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const application = await transaction.jobApplication.findFirst({
      where: {
        id: applicationId,
        job: {
          company: {
            memberships: { some: { userId: actor.userId, role: "OWNER" } },
          },
        },
      },
      select: {
        id: true,
        status: true,
        candidateId: true,
        job: { select: { id: true, companyId: true, title: true } },
      },
    });
    if (!application) {
      throw new ApplicationMutationError("NOT_FOUND");
    }
    if (!canRecruiterTransitionApplication(application.status, targetStatus)) {
      throw new ApplicationMutationError("INVALID_TRANSITION");
    }

    const result = await transaction.jobApplication.updateMany({
      where: {
        id: application.id,
        status: application.status,
        job: {
          company: {
            memberships: { some: { userId: actor.userId, role: "OWNER" } },
          },
        },
      },
      data: { status: targetStatus },
    });
    if (result.count !== 1) {
      throw new ApplicationMutationError("CONFLICT");
    }

    const history = await transaction.applicationStatusHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus: targetStatus,
        changedByUserId: actor.userId,
      },
      select: { id: true },
    });

    // Notify the Candidate who owns the application, atomically with the status
    // change and its history. An invalid or conflicting transition throws
    // before this point, so it emits nothing.
    await emitApplicationStatusChangedNotification(transaction, {
      applicationId: application.id,
      jobId: application.job.id,
      companyId: application.job.companyId,
      jobTitle: application.job.title,
      status: targetStatus,
      candidateUserId: application.candidateId,
      actorUserId: actor.userId,
      statusHistoryId: history.id,
    });
    await emitApplicationStatusChangedEmail(transaction, {
      applicationId: application.id,
      companyId: application.job.companyId,
      jobTitle: application.job.title,
      status: targetStatus,
      candidateUserId: application.candidateId,
      actorUserId: actor.userId,
      statusHistoryId: history.id,
    });

    return { status: targetStatus };
  });
}
