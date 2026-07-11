// Pure, database-free document domain logic: authorization decisions expressed
// over already-resolved facts, attachment eligibility, retention classification,
// and small display helpers. The server layer resolves the facts from trusted
// session state and the database, then delegates the decision to these helpers.

import type { PlatformRole } from "@/features/auth/roles";
import { isActiveApplicationStatus } from "@/features/applications/lifecycle";
import type { ApplicationStatusValue } from "@/features/applications/schemas";

export interface DocumentActor {
  userId: string;
  role: PlatformRole;
}

/**
 * A Candidate owns a document only when the document's Candidate id matches
 * their session id. This single check covers their current CV, previous
 * versions, and any document snapshotted onto their own applications.
 */
export function isDocumentOwnedByCandidate(
  document: { candidateId: string },
  userId: string,
): boolean {
  return document.candidateId === userId;
}

export type DocumentDownloadDecision =
  | { allowed: true; accessType: "OWNER_DOWNLOAD" }
  | { allowed: true; accessType: "RECRUITER_APPLICATION_DOWNLOAD" }
  | { allowed: false };

/**
 * Central download authorization matrix, evaluated purely.
 *
 * - A Candidate may download only their own document.
 * - A Recruiter may download only a document attached to an application whose
 *   Job Company they OWN (`ownedApplicationId` is resolved server-side and is
 *   null otherwise).
 * - Admins and everyone else receive no implicit access.
 */
export function resolveDocumentDownloadAccess(input: {
  actor: DocumentActor | null;
  documentCandidateId: string;
  ownedApplicationId: string | null;
}): DocumentDownloadDecision {
  const { actor } = input;
  if (!actor) return { allowed: false };

  if (
    actor.role === "CANDIDATE" &&
    input.documentCandidateId === actor.userId
  ) {
    return { allowed: true, accessType: "OWNER_DOWNLOAD" };
  }

  if (actor.role === "RECRUITER" && input.ownedApplicationId) {
    return { allowed: true, accessType: "RECRUITER_APPLICATION_DOWNLOAD" };
  }

  return { allowed: false };
}

/**
 * Whether a Candidate may attach their current CV to an existing application.
 * Allowed only while the application is active and has no CV yet — a snapshot
 * is never replaced, and terminal applications never receive a late CV.
 */
export function canAttachResumeToApplication(input: {
  status: ApplicationStatusValue;
  hasAttachedResume: boolean;
}): boolean {
  if (input.hasAttachedResume) return false;
  return isActiveApplicationStatus(input.status);
}

export type DocumentRetention =
  "CURRENT" | "APPLICATION_REFERENCED" | "PURGEABLE";

/**
 * Classifies an immutable document version for retention decisions. A document
 * is retained while it is the current CV or attached to any application; only a
 * fully unreferenced version is classified as purgeable.
 */
export function classifyDocumentRetention(input: {
  isCurrentResume: boolean;
  applicationReferenceCount: number;
}): DocumentRetention {
  if (input.isCurrentResume) return "CURRENT";
  if (input.applicationReferenceCount > 0) return "APPLICATION_REFERENCED";
  return "PURGEABLE";
}

/** True only for a version safe to physically delete without losing history. */
export function isDocumentPhysicallyDeletable(input: {
  isCurrentResume: boolean;
  applicationReferenceCount: number;
}): boolean {
  return classifyDocumentRetention(input) === "PURGEABLE";
}

/** Human-readable file size for UI (never exposes exact byte counts as noise). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
