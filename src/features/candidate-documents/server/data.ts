import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Compact current-CV summary for the dashboard, profile, and apply surfaces.
 * Exposes only display-safe fields — never storage keys, hashes, or MIME type.
 */
export async function getCandidateCurrentResume(
  prisma: PrismaClient,
  userId: string,
) {
  const current = await prisma.candidateResume.findUnique({
    where: { candidateId: userId },
    select: {
      updatedAt: true,
      document: {
        select: {
          id: true,
          originalFilename: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
    },
  });

  if (!current) {
    return { hasResume: false as const };
  }

  return {
    hasResume: true as const,
    documentId: current.document.id,
    filename: current.document.originalFilename,
    sizeBytes: current.document.sizeBytes,
    uploadedAt: current.document.uploadedAt,
    updatedAt: current.updatedAt,
  };
}

export interface CandidateDocumentSummary {
  id: string;
  filename: string;
  sizeBytes: number;
  uploadedAt: Date;
  isCurrent: boolean;
  applicationCount: number;
  removedFromProfileAt: Date | null;
}

/**
 * Full CV history for the Candidate documents page: current pointer plus every
 * immutable version with a count of applications it is attached to. Returns
 * only browser-safe fields.
 */
export async function getCandidateDocumentsOverview(
  prisma: PrismaClient,
  userId: string,
): Promise<{
  currentDocumentId: string | null;
  documents: CandidateDocumentSummary[];
}> {
  const [current, documents] = await Promise.all([
    prisma.candidateResume.findUnique({
      where: { candidateId: userId },
      select: { documentId: true },
    }),
    prisma.candidateDocument.findMany({
      where: { candidateId: userId, kind: "RESUME" },
      select: {
        id: true,
        originalFilename: true,
        sizeBytes: true,
        uploadedAt: true,
        removedFromProfileAt: true,
        _count: { select: { applications: true } },
      },
      orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    }),
  ]);

  const currentDocumentId = current?.documentId ?? null;

  return {
    currentDocumentId,
    documents: documents.map((document) => ({
      id: document.id,
      filename: document.originalFilename,
      sizeBytes: document.sizeBytes,
      uploadedAt: document.uploadedAt,
      isCurrent: document.id === currentDocumentId,
      applicationCount: document._count.applications,
      removedFromProfileAt: document.removedFromProfileAt,
    })),
  };
}
