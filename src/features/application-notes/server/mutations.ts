import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

export type ApplicationNoteActor = {
  userId: string;
  role: PlatformRole;
};

export type ApplicationNoteMutationErrorCode =
  "FORBIDDEN" | "NOT_FOUND" | "CONFLICT";

export class ApplicationNoteMutationError extends Error {
  constructor(readonly code: ApplicationNoteMutationErrorCode) {
    super("Application note mutation failed.");
    this.name = "ApplicationNoteMutationError";
  }
}

function assertRecruiter(actor: ApplicationNoteActor) {
  if (actor.role !== "RECRUITER") {
    throw new ApplicationNoteMutationError("FORBIDDEN");
  }
}

function ownedApplicationWhere(actor: ApplicationNoteActor, id: string) {
  return {
    id,
    job: {
      company: {
        memberships: {
          some: { userId: actor.userId, role: "OWNER" as const },
        },
      },
    },
  };
}

function isPrismaErrorCode(error: unknown, codes: readonly string[]) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    codes.includes(error.code)
  );
}

export async function createApplicationNote(
  prisma: PrismaClient,
  actor: ApplicationNoteActor,
  applicationId: string,
  body: string,
) {
  assertRecruiter(actor);

  return prisma.$transaction(async (transaction) => {
    const application = await transaction.jobApplication.findFirst({
      where: ownedApplicationWhere(actor, applicationId),
      select: { id: true, jobId: true },
    });
    if (!application) {
      throw new ApplicationNoteMutationError("NOT_FOUND");
    }

    const note = await transaction.applicationNote.create({
      data: {
        applicationId: application.id,
        authorUserId: actor.userId,
        body,
        revisions: {
          create: {
            version: 1,
            action: "CREATED",
            body,
            actorUserId: actor.userId,
          },
        },
      },
      select: { id: true, revision: true },
    });

    return { ...note, applicationId: application.id, jobId: application.jobId };
  });
}

export async function editApplicationNote(
  prisma: PrismaClient,
  actor: ApplicationNoteActor,
  applicationId: string,
  noteId: string,
  expectedRevision: number,
  body: string,
) {
  assertRecruiter(actor);

  try {
    return await prisma.$transaction(async (transaction) => {
      const note = await transaction.applicationNote.findFirst({
        where: {
          id: noteId,
          applicationId,
          authorUserId: actor.userId,
          deletedAt: null,
          application: ownedApplicationWhere(actor, applicationId),
        },
        select: {
          id: true,
          revision: true,
          applicationId: true,
          application: { select: { jobId: true } },
        },
      });
      if (!note) {
        throw new ApplicationNoteMutationError("NOT_FOUND");
      }
      if (note.revision !== expectedRevision) {
        throw new ApplicationNoteMutationError("CONFLICT");
      }

      const nextRevision = expectedRevision + 1;
      const updated = await transaction.applicationNote.updateMany({
        where: {
          id: note.id,
          applicationId,
          authorUserId: actor.userId,
          deletedAt: null,
          revision: expectedRevision,
          application: ownedApplicationWhere(actor, applicationId),
        },
        data: { body, revision: nextRevision },
      });
      if (updated.count !== 1) {
        throw new ApplicationNoteMutationError("CONFLICT");
      }

      await transaction.applicationNoteRevision.create({
        data: {
          noteId: note.id,
          version: nextRevision,
          action: "EDITED",
          body,
          actorUserId: actor.userId,
        },
      });

      return {
        id: note.id,
        revision: nextRevision,
        applicationId: note.applicationId,
        jobId: note.application.jobId,
      };
    });
  } catch (error) {
    if (error instanceof ApplicationNoteMutationError) throw error;
    if (isPrismaErrorCode(error, ["P2002", "P2034"])) {
      throw new ApplicationNoteMutationError("CONFLICT");
    }
    throw error;
  }
}

export async function deleteApplicationNote(
  prisma: PrismaClient,
  actor: ApplicationNoteActor,
  applicationId: string,
  noteId: string,
  expectedRevision: number,
) {
  assertRecruiter(actor);

  try {
    return await prisma.$transaction(async (transaction) => {
      const note = await transaction.applicationNote.findFirst({
        where: {
          id: noteId,
          applicationId,
          authorUserId: actor.userId,
          deletedAt: null,
          application: ownedApplicationWhere(actor, applicationId),
        },
        select: {
          id: true,
          body: true,
          revision: true,
          applicationId: true,
          application: { select: { jobId: true } },
        },
      });
      if (!note) {
        throw new ApplicationNoteMutationError("NOT_FOUND");
      }
      if (note.revision !== expectedRevision) {
        throw new ApplicationNoteMutationError("CONFLICT");
      }

      const nextRevision = expectedRevision + 1;
      const deletedAt = new Date();
      const updated = await transaction.applicationNote.updateMany({
        where: {
          id: note.id,
          applicationId,
          authorUserId: actor.userId,
          deletedAt: null,
          revision: expectedRevision,
          application: ownedApplicationWhere(actor, applicationId),
        },
        data: { deletedAt, revision: nextRevision },
      });
      if (updated.count !== 1) {
        throw new ApplicationNoteMutationError("CONFLICT");
      }

      await transaction.applicationNoteRevision.create({
        data: {
          noteId: note.id,
          version: nextRevision,
          action: "DELETED",
          body: note.body,
          actorUserId: actor.userId,
        },
      });

      return {
        id: note.id,
        revision: nextRevision,
        applicationId: note.applicationId,
        jobId: note.application.jobId,
      };
    });
  } catch (error) {
    if (error instanceof ApplicationNoteMutationError) throw error;
    if (isPrismaErrorCode(error, ["P2002", "P2034"])) {
      throw new ApplicationNoteMutationError("CONFLICT");
    }
    throw error;
  }
}
