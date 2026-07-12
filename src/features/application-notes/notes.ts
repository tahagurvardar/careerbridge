// Pure, database-free domain logic for internal Recruiter notes: visibility,
// ownership, edit/delete eligibility, display classification, concurrency
// tokens, and revision-action labels. The server layer resolves facts (role,
// OWNER membership, note state) from trusted session and database state, then
// delegates the decision to these helpers so they can be unit tested directly.

import type { PlatformRole } from "@/features/auth/roles";
import type { ApplicationNoteRevisionAction } from "@/generated/prisma/enums";

export interface NoteActor {
  userId: string;
  role: PlatformRole;
}

/** A note is active until it is soft-deleted. */
export function isNoteActive(note: { deletedAt: Date | null }): boolean {
  return note.deletedAt === null;
}

export type NoteDisplayState = "ACTIVE" | "DELETED";

export function classifyNoteDisplay(note: {
  deletedAt: Date | null;
}): NoteDisplayState {
  return isNoteActive(note) ? "ACTIVE" : "DELETED";
}

/** A note counts as edited once its revision advances past the initial version. */
export function isNoteEdited(revision: number): boolean {
  return revision > 1;
}

/**
 * Only the original author may edit an active note. Deleted notes and notes
 * authored by someone else (or by a since-removed account) are never editable.
 */
export function canEditNote(
  note: { authorUserId: string | null; deletedAt: Date | null },
  userId: string,
): boolean {
  return note.authorUserId === userId && note.deletedAt === null;
}

/** Soft-deletion follows the same author-and-active rule as editing. */
export function canDeleteNote(
  note: { authorUserId: string | null; deletedAt: Date | null },
  userId: string,
): boolean {
  return canEditNote(note, userId);
}

/**
 * Read/write visibility over already-resolved facts. Notes are internal to
 * Recruiters who OWN the application's Job Company; Candidates, MEMBER users,
 * other companies, Admins, and signed-out users are never included.
 */
export function canRecruiterAccessNotes(input: {
  role: PlatformRole;
  isCompanyOwner: boolean;
}): boolean {
  return input.role === "RECRUITER" && input.isCompanyOwner;
}

/**
 * Concurrency-token comparison for optimistic edits/deletes. This is never an
 * authorization decision on its own — the server re-authorizes ownership and
 * authorship independently.
 */
export function matchesExpectedRevision(
  current: number,
  expected: number,
): boolean {
  return current === expected;
}

export const revisionActionLabels: Record<
  ApplicationNoteRevisionAction,
  string
> = {
  CREATED: "Created",
  EDITED: "Edited",
  DELETED: "Deleted",
};
