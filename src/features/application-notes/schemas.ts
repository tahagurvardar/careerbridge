import { z } from "zod";
import type { RecruiterDictionary } from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";

export const NOTE_BODY_MAX = 5000;

/**
 * Normalizes line endings to `\n` so stored bodies and length checks stay
 * consistent regardless of the client platform. Internal line breaks are
 * preserved; the note is plain text only.
 */
export function normalizeNoteBody(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function createApplicationNoteSchemas(
  messages: Pick<RecruiterDictionary["notes"]["actions"], "empty" | "tooLong">,
) {
  const noteBodyTooLong = formatMessage(messages.tooLong, {
    max: NOTE_BODY_MAX,
  });
  const noteBody = z
    .string()
    // Bound the raw payload generously before normalizing/trimming so a huge
    // input is rejected without processing it.
    .max(NOTE_BODY_MAX * 4, noteBodyTooLong)
    .transform((value) => normalizeNoteBody(value).trim())
    .pipe(
      z.string().min(1, messages.empty).max(NOTE_BODY_MAX, noteBodyTooLong),
    );

  return {
    noteBodySchema: noteBody,
    createNoteSchema: z.object({ body: noteBody }).strip(),
    editNoteSchema: z
      .object({
        noteId: noteIdSchema,
        expectedRevision: expectedRevisionSchema,
        body: noteBody,
      })
      .strip(),
    deleteNoteSchema: z
      .object({
        noteId: noteIdSchema,
        expectedRevision: expectedRevisionSchema,
      })
      .strip(),
  };
}

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

const defaultSchemas = createApplicationNoteSchemas({
  empty: "A note cannot be empty.",
  tooLong: "Notes must be {max} characters or fewer.",
});

export const noteBodySchema = defaultSchemas.noteBodySchema;
export const createNoteSchema = defaultSchemas.createNoteSchema;
export const editNoteSchema = defaultSchemas.editNoteSchema;
export const deleteNoteSchema = defaultSchemas.deleteNoteSchema;

export type CreateNoteInput = z.input<typeof createNoteSchema>;
export type EditNoteInput = z.input<typeof editNoteSchema>;
export type DeleteNoteInput = z.input<typeof deleteNoteSchema>;
