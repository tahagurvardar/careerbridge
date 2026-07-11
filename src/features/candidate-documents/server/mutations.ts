import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { ACTIVE_APPLICATION_STATUSES } from "@/features/applications/lifecycle";
import {
  type DocumentActor,
  canAttachResumeToApplication,
  resolveDocumentDownloadAccess,
} from "@/features/candidate-documents/documents";
import type { CandidateDocumentAccessType } from "@/generated/prisma/enums";
import type { PrivateDocumentStorage } from "@/lib/storage";

export type CandidateDocumentErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NO_CURRENT_RESUME"
  | "ALREADY_ATTACHED"
  | "NOT_ELIGIBLE"
  | "CONFLICT"
  | "STORAGE";

export class CandidateDocumentError extends Error {
  constructor(readonly code: CandidateDocumentErrorCode) {
    super("Candidate document operation failed.");
    this.name = "CandidateDocumentError";
  }
}

function assertCandidate(actor: DocumentActor) {
  if (actor.role !== "CANDIDATE") {
    throw new CandidateDocumentError("FORBIDDEN");
  }
}

function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

export interface NewResumeInput {
  /** Opaque key generated server-side; never from the client. */
  storageKey: string;
  bytes: Buffer;
  /** Already sanitized display filename. */
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

/**
 * Uploads a new immutable resume version and atomically moves the Candidate's
 * current-CV pointer to it.
 *
 * Consistency ordering:
 *   1. Upload the object first — a failed upload never writes metadata.
 *   2. Create the document row and upsert the pointer in one transaction.
 *   3. If the transaction fails, best-effort delete the just-uploaded object so
 *      no pointer or metadata ever references a missing object.
 *
 * Previous versions are never deleted or mutated; only the pointer moves.
 */
export async function replaceCurrentResume(
  prisma: PrismaClient,
  storage: PrivateDocumentStorage,
  actor: DocumentActor,
  input: NewResumeInput,
): Promise<{ documentId: string }> {
  assertCandidate(actor);

  await storage.putObject({
    key: input.storageKey,
    body: input.bytes,
    contentType: input.mimeType,
  });

  try {
    const document = await prisma.$transaction(async (tx) => {
      const created = await tx.candidateDocument.create({
        data: {
          candidateId: actor.userId,
          kind: "RESUME",
          storageKey: input.storageKey,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          sha256: input.sha256,
        },
        select: { id: true },
      });

      // candidateId is the pointer's primary key, so at most one current
      // resume can ever exist even under concurrent replacement.
      await tx.candidateResume.upsert({
        where: { candidateId: actor.userId },
        create: { candidateId: actor.userId, documentId: created.id },
        update: { documentId: created.id },
      });

      return created;
    });

    return { documentId: document.id };
  } catch (error) {
    await storage.deleteObject(input.storageKey).catch(() => {});
    if (isPrismaErrorCode(error, "P2002")) {
      throw new CandidateDocumentError("CONFLICT");
    }
    throw new CandidateDocumentError("STORAGE");
  }
}

/**
 * Clears the Candidate's current-CV pointer and marks the version as removed
 * from the active profile. The immutable object is retained so historical
 * application attachments keep working; application references are untouched.
 */
export async function removeCurrentResume(
  prisma: PrismaClient,
  actor: DocumentActor,
): Promise<{ removed: boolean }> {
  assertCandidate(actor);

  return prisma.$transaction(async (tx) => {
    const pointer = await tx.candidateResume.findUnique({
      where: { candidateId: actor.userId },
      select: { documentId: true },
    });
    if (!pointer) return { removed: false };

    await tx.candidateResume.delete({ where: { candidateId: actor.userId } });
    await tx.candidateDocument.update({
      where: { id: pointer.documentId },
      data: { removedFromProfileAt: new Date() },
    });

    return { removed: true };
  });
}

/**
 * Attaches the Candidate's current CV to one of their existing applications,
 * one time only. Re-authorizes ownership, re-reads the current resume from the
 * database, refuses to replace an existing snapshot, and uses a compare-and-set
 * so concurrent attempts cannot double-attach or race a status change.
 */
export async function attachCurrentResumeToApplication(
  prisma: PrismaClient,
  actor: DocumentActor,
  applicationId: string,
): Promise<{ attached: true }> {
  assertCandidate(actor);

  return prisma.$transaction(async (tx) => {
    const application = await tx.jobApplication.findFirst({
      where: { id: applicationId, candidateId: actor.userId },
      select: { id: true, status: true, resumeDocumentId: true },
    });
    if (!application) throw new CandidateDocumentError("NOT_FOUND");
    if (application.resumeDocumentId) {
      throw new CandidateDocumentError("ALREADY_ATTACHED");
    }
    if (
      !canAttachResumeToApplication({
        status: application.status,
        hasAttachedResume: false,
      })
    ) {
      throw new CandidateDocumentError("NOT_ELIGIBLE");
    }

    const pointer = await tx.candidateResume.findUnique({
      where: { candidateId: actor.userId },
      select: { documentId: true },
    });
    if (!pointer) throw new CandidateDocumentError("NO_CURRENT_RESUME");

    const result = await tx.jobApplication.updateMany({
      where: {
        id: application.id,
        candidateId: actor.userId,
        resumeDocumentId: null,
        status: { in: [...ACTIVE_APPLICATION_STATUSES] },
      },
      data: { resumeDocumentId: pointer.documentId },
    });
    if (result.count !== 1) throw new CandidateDocumentError("CONFLICT");

    return { attached: true as const };
  });
}

export interface AuthorizedDocumentDownload {
  document: {
    id: string;
    storageKey: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    candidateId: string;
  };
  accessType: CandidateDocumentAccessType;
  applicationId: string | null;
}

/**
 * Re-authorizes a document download from trusted session state on every call.
 * Returns null for missing documents and every unauthorized case alike, so the
 * route cannot become an existence oracle. Recruiter access is resolved only
 * through an owned application that references the document.
 */
export async function authorizeDocumentDownload(
  prisma: PrismaClient,
  actor: DocumentActor | null,
  documentId: string,
): Promise<AuthorizedDocumentDownload | null> {
  if (!actor) return null;

  const document = await prisma.candidateDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      storageKey: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      candidateId: true,
    },
  });
  if (!document) return null;

  let ownedApplicationId: string | null = null;
  if (actor.role === "RECRUITER") {
    const application = await prisma.jobApplication.findFirst({
      where: {
        resumeDocumentId: documentId,
        job: {
          company: {
            memberships: { some: { userId: actor.userId, role: "OWNER" } },
          },
        },
      },
      select: { id: true },
    });
    ownedApplicationId = application?.id ?? null;
  }

  const decision = resolveDocumentDownloadAccess({
    actor,
    documentCandidateId: document.candidateId,
    ownedApplicationId,
  });
  if (!decision.allowed) return null;

  return {
    document,
    accessType: decision.accessType,
    applicationId:
      decision.accessType === "RECRUITER_APPLICATION_DOWNLOAD"
        ? ownedApplicationId
        : null,
  };
}

/** Records a successful, already-authorized download. Never called on denial. */
export async function logDocumentDownload(
  prisma: PrismaClient,
  input: {
    documentId: string;
    actorUserId: string;
    applicationId: string | null;
    accessType: CandidateDocumentAccessType;
  },
): Promise<void> {
  await prisma.candidateDocumentAccessLog.create({
    data: {
      documentId: input.documentId,
      actorUserId: input.actorUserId,
      applicationId: input.applicationId,
      accessType: input.accessType,
    },
  });
}
