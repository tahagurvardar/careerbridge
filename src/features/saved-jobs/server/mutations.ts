import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { PUBLIC_JOB_VISIBILITY_WHERE } from "@/features/admin/moderation";
import type { PlatformRole } from "@/features/auth/roles";

export type SavedJobActor = {
  userId: string;
  role: PlatformRole;
};

export type SavedJobMutationErrorCode = "FORBIDDEN" | "NOT_ELIGIBLE";

export class SavedJobMutationError extends Error {
  constructor(readonly code: SavedJobMutationErrorCode) {
    super("Saved job mutation failed.");
    this.name = "SavedJobMutationError";
  }
}

function assertCandidate(actor: SavedJobActor) {
  if (actor.role !== "CANDIDATE") {
    throw new SavedJobMutationError("FORBIDDEN");
  }
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function saveJob(
  prisma: PrismaClient,
  actor: SavedJobActor,
  slug: string,
) {
  assertCandidate(actor);

  const job = await prisma.job.findFirst({
    where: {
      slug,
      ...PUBLIC_JOB_VISIBILITY_WHERE,
    },
    select: { id: true },
  });
  if (!job) throw new SavedJobMutationError("NOT_ELIGIBLE");

  try {
    await prisma.savedJob.create({
      data: { candidateId: actor.userId, jobId: job.id },
      select: { id: true },
    });
  } catch (error) {
    if (!isPrismaUniqueConstraintError(error)) throw error;
  }

  return { saved: true as const };
}

export async function unsaveJob(
  prisma: PrismaClient,
  actor: SavedJobActor,
  slug: string,
) {
  assertCandidate(actor);

  await prisma.savedJob.deleteMany({
    where: { candidateId: actor.userId, job: { slug } },
  });

  return { saved: false as const };
}
