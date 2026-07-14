import { describe, expect, it } from "vitest";

import {
  ADMIN_AUDIT_ACTIONS,
  CONTENT_MODERATION_STATUSES,
  MODERATION_REASON_CODES,
  USER_ACCOUNT_STATUSES,
  adminAuditActionLabels,
  canModerateContent,
  canModerateUser,
  contentModerationStatusLabels,
  isCompanyPubliclyVisible,
  isJobPubliclyVisible,
  isModerationTargetActionCompatible,
  isStaleModerationVersion,
  moderationReasonLabels,
  userAccountStatusLabels,
} from "@/features/admin/moderation";

describe("Admin moderation domain", () => {
  it("labels every status, reason, and audit action", () => {
    for (const status of USER_ACCOUNT_STATUSES) {
      expect(userAccountStatusLabels[status]).toBeTruthy();
    }
    for (const status of CONTENT_MODERATION_STATUSES) {
      expect(contentModerationStatusLabels[status]).toBeTruthy();
    }
    for (const reason of MODERATION_REASON_CODES) {
      expect(moderationReasonLabels[reason]).toBeTruthy();
    }
    for (const action of ADMIN_AUDIT_ACTIONS) {
      expect(adminAuditActionLabels[action]).toBeTruthy();
    }
  });

  it("allows only valid Candidate and Recruiter account transitions", () => {
    expect(
      canModerateUser({
        actorAdminUserId: "admin",
        targetUserId: "candidate",
        targetRole: "CANDIDATE",
        currentStatus: "ACTIVE",
        action: "SUSPEND",
      }),
    ).toBe(true);
    expect(
      canModerateUser({
        actorAdminUserId: "admin",
        targetUserId: "recruiter",
        targetRole: "RECRUITER",
        currentStatus: "SUSPENDED",
        action: "RESTORE",
      }),
    ).toBe(true);
    expect(
      canModerateUser({
        actorAdminUserId: "admin",
        targetUserId: "candidate",
        targetRole: "CANDIDATE",
        currentStatus: "SUSPENDED",
        action: "SUSPEND",
      }),
    ).toBe(false);
  });

  it("rejects self-targeting and all Admin targets", () => {
    expect(
      canModerateUser({
        actorAdminUserId: "admin",
        targetUserId: "admin",
        targetRole: "ADMIN",
        currentStatus: "ACTIVE",
        action: "SUSPEND",
      }),
    ).toBe(false);
    expect(
      canModerateUser({
        actorAdminUserId: "admin-a",
        targetUserId: "admin-b",
        targetRole: "ADMIN",
        currentStatus: "ACTIVE",
        action: "SUSPEND",
      }),
    ).toBe(false);
  });

  it("allows only visible-to-hidden and hidden-to-visible transitions", () => {
    expect(canModerateContent("VISIBLE", "HIDE")).toBe(true);
    expect(canModerateContent("HIDDEN", "RESTORE")).toBe(true);
    expect(canModerateContent("HIDDEN", "HIDE")).toBe(false);
    expect(canModerateContent("VISIBLE", "RESTORE")).toBe(false);
  });

  it("validates audit target and action compatibility", () => {
    expect(isModerationTargetActionCompatible("USER_SUSPENDED", "USER")).toBe(
      true,
    );
    expect(
      isModerationTargetActionCompatible("COMPANY_HIDDEN", "COMPANY"),
    ).toBe(true);
    expect(isModerationTargetActionCompatible("JOB_RESTORED", "JOB")).toBe(
      true,
    );
    expect(isModerationTargetActionCompatible("JOB_HIDDEN", "COMPANY")).toBe(
      false,
    );
  });

  it("classifies stale versions", () => {
    expect(isStaleModerationVersion(1, 1)).toBe(false);
    expect(isStaleModerationVersion(1, 2)).toBe(true);
    expect(isStaleModerationVersion(3, 2)).toBe(true);
  });
});

describe("public moderation visibility", () => {
  it("requires both publication and visible Company moderation", () => {
    expect(
      isCompanyPubliclyVisible({
        isPublished: true,
        moderationStatus: "VISIBLE",
      }),
    ).toBe(true);
    expect(
      isCompanyPubliclyVisible({
        isPublished: true,
        moderationStatus: "HIDDEN",
      }),
    ).toBe(false);
    expect(
      isCompanyPubliclyVisible({
        isPublished: false,
        moderationStatus: "VISIBLE",
      }),
    ).toBe(false);
  });

  it("requires public lifecycle plus visible Job and Company moderation", () => {
    expect(
      isJobPubliclyVisible({
        status: "PUBLISHED",
        moderationStatus: "VISIBLE",
        companyIsPublished: true,
        companyModerationStatus: "VISIBLE",
      }),
    ).toBe(true);
    for (const partial of [
      { moderationStatus: "HIDDEN" as const },
      { companyModerationStatus: "HIDDEN" as const },
      { companyIsPublished: false },
      { status: "DRAFT" as const },
    ]) {
      expect(
        isJobPubliclyVisible({
          status: "PUBLISHED",
          moderationStatus: "VISIBLE",
          companyIsPublished: true,
          companyModerationStatus: "VISIBLE",
          ...partial,
        }),
      ).toBe(false);
    }
  });
});
