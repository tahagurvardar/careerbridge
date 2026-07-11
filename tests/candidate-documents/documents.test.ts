import { describe, expect, it } from "vitest";

import {
  canAttachResumeToApplication,
  classifyDocumentRetention,
  formatFileSize,
  isDocumentOwnedByCandidate,
  isDocumentPhysicallyDeletable,
  resolveDocumentDownloadAccess,
} from "@/features/candidate-documents/documents";

describe("candidate document ownership", () => {
  it("recognizes only the owning candidate", () => {
    expect(isDocumentOwnedByCandidate({ candidateId: "c1" }, "c1")).toBe(true);
    expect(isDocumentOwnedByCandidate({ candidateId: "c1" }, "c2")).toBe(false);
  });
});

describe("document download authorization matrix", () => {
  const candidate = { userId: "cand-1", role: "CANDIDATE" as const };
  const recruiter = { userId: "rec-1", role: "RECRUITER" as const };
  const admin = { userId: "adm-1", role: "ADMIN" as const };

  it("allows a candidate to download only their own document", () => {
    expect(
      resolveDocumentDownloadAccess({
        actor: candidate,
        documentCandidateId: "cand-1",
        ownedApplicationId: null,
      }),
    ).toEqual({ allowed: true, accessType: "OWNER_DOWNLOAD" });

    expect(
      resolveDocumentDownloadAccess({
        actor: candidate,
        documentCandidateId: "cand-2",
        ownedApplicationId: null,
      }),
    ).toEqual({ allowed: false });
  });

  it("allows a recruiter only through an owned application", () => {
    expect(
      resolveDocumentDownloadAccess({
        actor: recruiter,
        documentCandidateId: "cand-1",
        ownedApplicationId: "app-1",
      }),
    ).toEqual({ allowed: true, accessType: "RECRUITER_APPLICATION_DOWNLOAD" });

    expect(
      resolveDocumentDownloadAccess({
        actor: recruiter,
        documentCandidateId: "cand-1",
        ownedApplicationId: null,
      }),
    ).toEqual({ allowed: false });
  });

  it("grants no implicit access to admins or signed-out users", () => {
    expect(
      resolveDocumentDownloadAccess({
        actor: admin,
        documentCandidateId: "cand-1",
        ownedApplicationId: null,
      }),
    ).toEqual({ allowed: false });

    expect(
      resolveDocumentDownloadAccess({
        actor: null,
        documentCandidateId: "cand-1",
        ownedApplicationId: null,
      }),
    ).toEqual({ allowed: false });
  });
});

describe("existing-application attachment eligibility", () => {
  it("allows attaching only to an active application with no CV", () => {
    for (const status of [
      "SUBMITTED",
      "UNDER_REVIEW",
      "INTERVIEW",
      "OFFER",
    ] as const) {
      expect(
        canAttachResumeToApplication({ status, hasAttachedResume: false }),
      ).toBe(true);
    }
  });

  it("refuses to replace a CV that is already attached", () => {
    expect(
      canAttachResumeToApplication({
        status: "SUBMITTED",
        hasAttachedResume: true,
      }),
    ).toBe(false);
  });

  it("refuses attachment for terminal applications", () => {
    for (const status of ["HIRED", "REJECTED", "WITHDRAWN"] as const) {
      expect(
        canAttachResumeToApplication({ status, hasAttachedResume: false }),
      ).toBe(false);
    }
  });
});

describe("document retention classification", () => {
  it("retains the current resume", () => {
    expect(
      classifyDocumentRetention({
        isCurrentResume: true,
        applicationReferenceCount: 0,
      }),
    ).toBe("CURRENT");
  });

  it("retains a version attached to any application", () => {
    expect(
      classifyDocumentRetention({
        isCurrentResume: false,
        applicationReferenceCount: 2,
      }),
    ).toBe("APPLICATION_REFERENCED");
  });

  it("marks a fully unreferenced version as purgeable", () => {
    const input = { isCurrentResume: false, applicationReferenceCount: 0 };
    expect(classifyDocumentRetention(input)).toBe("PURGEABLE");
    expect(isDocumentPhysicallyDeletable(input)).toBe(true);
    expect(
      isDocumentPhysicallyDeletable({
        isCurrentResume: false,
        applicationReferenceCount: 1,
      }),
    ).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formats bytes, kilobytes, and megabytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatFileSize(-1)).toBe("—");
  });
});
