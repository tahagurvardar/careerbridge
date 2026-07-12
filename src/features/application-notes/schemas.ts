import { z } from "zod";

export const NOTE_BODY_MAX = 5000;

/**
 * Normalizes line endings to `\n` so stored bodies and length checks stay
 * consistent regardless of the client platform. Internal line breaks are
 * preserved; the note is plain text only.
 */
export function normalizeNoteBody(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

const noteBodyTooLong = `Notes must be ${NOTE_BODY_MAX.toLocaleString()} characters or fewer.`;

export const noteBodySchema = z
  .string()
  // Bound the raw payload generously before normalizing/trimming so a huge
  // input is rejected without processing it.
  .max(NOTE_BODY_MAX * 4, noteBodyTooLong)
  .transform((value) => normalizeNoteBody(value).trim())
  .pipe(
    z
      .string()
      .min(1, "A note cannot be empty.")
      .max(NOTE_BODY_MAX, noteBodyTooLong),
  );

// Identifier shapes filter obvious garbage before any database access; they
// never authorize — ownership is always re-checked server-side.
export const noteIdSchema = z.string().trim().min(1).max(64);
export const applicationIdSchema = z.string().trim().min(1).max(64);

// A concurrency token, never an authorization value.
export const expectedRevisionSchema = z
  .number()
  .int()
  .positive()
  .max(1_000_000);

export const createNoteSchema = z.object({ body: noteBodySchema }).strip();

export const editNoteSchema = z
  .object({
    noteId: noteIdSchema,
    expectedRevision: expectedRevisionSchema,
    body: noteBodySchema,
  })
  .strip();

export const deleteNoteSchema = z
  .object({
    noteId: noteIdSchema,
    expectedRevision: expectedRevisionSchema,
  })
  .strip();

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type EditNoteInput = z.input<typeof editNoteSchema>;
export type DeleteNoteInput = z.input<typeof deleteNoteSchema>;
