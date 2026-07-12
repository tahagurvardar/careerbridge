import { describe, expect, it } from "vitest";

import {
  canDeleteNote,
  canEditNote,
  canRecruiterAccessNotes,
  classifyNoteDisplay,
  isNoteActive,
  isNoteEdited,
  matchesExpectedRevision,
  revisionActionLabels,
} from "@/features/application-notes/notes";

const active = { authorUserId: "rec-1", deletedAt: null };
const deleted = { authorUserId: "rec-1", deletedAt: new Date() };

describe("active-note classification", () => {
  it("treats a null deletedAt as active", () => {
    expect(isNoteActive(active)).toBe(true);
    expect(isNoteActive(deleted)).toBe(false);
  });

  it("classifies display state from deletion", () => {
    expect(classifyNoteDisplay(active)).toBe("ACTIVE");
    expect(classifyNoteDisplay(deleted)).toBe("DELETED");
  });
});

describe("edited indicator", () => {
  it("marks a note edited only after the first revision", () => {
    expect(isNoteEdited(1)).toBe(false);
    expect(isNoteEdited(2)).toBe(true);
  });
});

describe("edit and delete ownership helpers", () => {
  it("allows only the original author to edit an active note", () => {
    expect(canEditNote(active, "rec-1")).toBe(true);
    expect(canEditNote(active, "rec-2")).toBe(false);
  });

  it("never allows editing a deleted note", () => {
    expect(canEditNote(deleted, "rec-1")).toBe(false);
  });

  it("never allows editing a note from a since-removed author", () => {
    expect(canEditNote({ authorUserId: null, deletedAt: null }, "rec-1")).toBe(
      false,
    );
  });

  it("applies the same rule to deletion", () => {
    expect(canDeleteNote(active, "rec-1")).toBe(true);
    expect(canDeleteNote(active, "rec-2")).toBe(false);
    expect(canDeleteNote(deleted, "rec-1")).toBe(false);
  });
});

describe("note visibility", () => {
  it("includes only Recruiter Company OWNERs", () => {
    expect(
      canRecruiterAccessNotes({ role: "RECRUITER", isCompanyOwner: true }),
    ).toBe(true);
    expect(
      canRecruiterAccessNotes({ role: "RECRUITER", isCompanyOwner: false }),
    ).toBe(false);
    expect(
      canRecruiterAccessNotes({ role: "CANDIDATE", isCompanyOwner: true }),
    ).toBe(false);
    expect(
      canRecruiterAccessNotes({ role: "ADMIN", isCompanyOwner: true }),
    ).toBe(false);
  });
});

describe("optimistic concurrency token", () => {
  it("matches only an identical revision", () => {
    expect(matchesExpectedRevision(3, 3)).toBe(true);
    expect(matchesExpectedRevision(3, 2)).toBe(false);
  });
});

describe("revision action labels", () => {
  it("labels every revision action", () => {
    expect(revisionActionLabels).toEqual({
      CREATED: "Created",
      EDITED: "Edited",
      DELETED: "Deleted",
    });
  });
});
