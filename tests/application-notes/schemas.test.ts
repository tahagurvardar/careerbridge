import { describe, expect, it } from "vitest";

import {
  createNoteSchema,
  deleteNoteSchema,
  editNoteSchema,
  NOTE_BODY_MAX,
} from "@/features/application-notes/schemas";

describe("application note schemas", () => {
  it("normalizes line endings and trims outer whitespace", () => {
    expect(createNoteSchema.parse({ body: "  first\r\nsecond\r  " })).toEqual({
      body: "first\nsecond",
    });
  });

  it("rejects empty and oversized note bodies", () => {
    expect(createNoteSchema.safeParse({ body: " \r\n " }).success).toBe(false);
    expect(
      createNoteSchema.safeParse({ body: "x".repeat(NOTE_BODY_MAX + 1) })
        .success,
    ).toBe(false);
  });

  it("requires a positive integer expected revision", () => {
    expect(
      editNoteSchema.safeParse({
        noteId: "note-1",
        body: "Changed",
        expectedRevision: 1,
      }).success,
    ).toBe(true);
    expect(
      editNoteSchema.safeParse({
        noteId: "note-1",
        body: "Changed",
        expectedRevision: 0,
      }).success,
    ).toBe(false);
    expect(
      deleteNoteSchema.safeParse({ noteId: "note-1", expectedRevision: 1.5 })
        .success,
    ).toBe(false);
  });

  it("strips unrecognized client fields", () => {
    expect(
      createNoteSchema.parse({ body: "Private", authorUserId: "forged" }),
    ).toEqual({
      body: "Private",
    });
  });
});
