import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

function ownedApplicationWhere(userId: string, applicationId: string) {
  return {
    id: applicationId,
    job: {
      company: {
        memberships: {
          some: {
            userId,
            role: "OWNER" as const,
            user: { role: "RECRUITER" as const },
          },
        },
      },
    },
  };
}

/**
 * Reads internal notes only after proving that the caller owns the job's
 * company. Deleted notes expose metadata for audit navigation, never their
 * current body on the application detail page.
 */
export async function getApplicationNotes(
  prisma: PrismaClient,
  userId: string,
  applicationId: string,
) {
  const application = await prisma.jobApplication.findFirst({
    where: ownedApplicationWhere(userId, applicationId),
    select: { id: true },
  });
  if (!application) return null;

  const rows = await prisma.applicationNote.findMany({
    where: {
      applicationId: application.id,
      application: ownedApplicationWhere(userId, applicationId),
    },
    select: {
      id: true,
      body: true,
      revision: true,
      authorUserId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      author: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });

  return {
    active: rows
      .filter((note) => note.deletedAt === null)
      .map(
        ({
          id,
          body,
          revision,
          authorUserId,
          createdAt,
          updatedAt,
          author,
        }) => ({
          id,
          body,
          revision,
          authorUserId,
          createdAt,
          updatedAt,
          author,
        }),
      ),
    deleted: rows
      .filter((note) => note.deletedAt !== null)
      .map(
        ({
          id,
          revision,
          authorUserId,
          createdAt,
          updatedAt,
          deletedAt,
          author,
        }) => ({
          id,
          revision,
          authorUserId,
          createdAt,
          updatedAt,
          deletedAt,
          author,
        }),
      ),
  };
}

/** Returns the immutable audit trail for one note, scoped to a Company OWNER. */
export function getApplicationNoteHistory(
  prisma: PrismaClient,
  userId: string,
  applicationId: string,
  noteId: string,
) {
  return prisma.applicationNote.findFirst({
    where: {
      id: noteId,
      applicationId,
      application: ownedApplicationWhere(userId, applicationId),
    },
    select: {
      id: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      author: { select: { name: true } },
      application: {
        select: {
          id: true,
          candidate: { select: { name: true } },
          job: { select: { title: true, company: { select: { name: true } } } },
        },
      },
      revisions: {
        select: {
          id: true,
          version: true,
          action: true,
          body: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
        orderBy: { version: "desc" },
      },
    },
  });
}
