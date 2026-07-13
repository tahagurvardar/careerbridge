import { describe, expect, it } from "vitest";

import {
  buildInvitationActiveKey,
  canReduceOwnerCount,
  canRespondToInvitation,
  canTransitionInvitation,
  canViewMemberEmails,
  canViewMembershipAudit,
  canViewTeamAdministration,
  computeInvitationExpiry,
  getDemotionBlock,
  getInvitationDisplayStatus,
  getLeaveBlock,
  getOwnershipTransferBlock,
  getPromotionBlock,
  getRemovalBlock,
  isInvitablePlatformRole,
  isInvitationExpired,
  LAST_OWNER_MESSAGE,
  membershipEventTypeLabels,
  resolveTeamUserDisplayName,
} from "@/features/company-team/team";

const now = new Date("2026-07-13T12:00:00.000Z");

describe("company invitation lifecycle", () => {
  it("computes a fixed 14-day expiry and deterministic active key", () => {
    expect(computeInvitationExpiry(now).toISOString()).toBe(
      "2026-07-27T12:00:00.000Z",
    );
    expect(buildInvitationActiveKey("company", "invitee")).toBe(
      "company:invitee",
    );
  });

  it("treats expiry as inclusive and never reclassifies terminal rows", () => {
    expect(
      isInvitationExpired({ status: "PENDING", expiresAt: now }, now),
    ).toBe(true);
    expect(
      isInvitationExpired({ status: "ACCEPTED", expiresAt: new Date(0) }, now),
    ).toBe(false);
    expect(
      getInvitationDisplayStatus(
        { status: "PENDING", expiresAt: new Date(now.getTime() - 1) },
        now,
      ),
    ).toBe("EXPIRED");
  });

  it("allows only pending-to-terminal transitions and live responses", () => {
    expect(canTransitionInvitation("PENDING", "ACCEPTED")).toBe(true);
    expect(canTransitionInvitation("PENDING", "PENDING")).toBe(false);
    expect(canTransitionInvitation("DECLINED", "ACCEPTED")).toBe(false);
    expect(
      canRespondToInvitation(
        { status: "PENDING", expiresAt: new Date(now.getTime() + 1) },
        now,
      ),
    ).toBe(true);
    expect(
      canRespondToInvitation({ status: "PENDING", expiresAt: now }, now),
    ).toBe(false);
  });

  it("admits only existing Recruiter platform roles", () => {
    expect(isInvitablePlatformRole("RECRUITER")).toBe(true);
    expect(isInvitablePlatformRole("CANDIDATE")).toBe(false);
    expect(isInvitablePlatformRole("ADMIN")).toBe(false);
  });
});

describe("company owner invariants", () => {
  it("permits reducing owners only when more than one exists", () => {
    expect(canReduceOwnerCount(2)).toBe(true);
    expect(canReduceOwnerCount(1)).toBe(false);
    expect(canReduceOwnerCount(0)).toBe(false);
    expect(canReduceOwnerCount(1.5)).toBe(false);
  });

  it("allows eligible promotion and transfer targets", () => {
    expect(
      getPromotionBlock({
        targetMembershipRole: "MEMBER",
        targetPlatformRole: "RECRUITER",
      }),
    ).toBeNull();
    expect(
      getOwnershipTransferBlock({
        isSelf: false,
        targetMembershipRole: "MEMBER",
        targetPlatformRole: "RECRUITER",
      }),
    ).toBeNull();
  });

  it("blocks invalid role changes, self targets, and final-owner changes", () => {
    expect(
      getPromotionBlock({
        targetMembershipRole: "OWNER",
        targetPlatformRole: "RECRUITER",
      })?.code,
    ).toBe("TARGET_NOT_ELIGIBLE");
    expect(
      getOwnershipTransferBlock({
        isSelf: true,
        targetMembershipRole: "MEMBER",
        targetPlatformRole: "RECRUITER",
      })?.code,
    ).toBe("SELF_TARGET");
    expect(
      getRemovalBlock({
        isSelf: true,
        targetMembershipRole: "OWNER",
        ownerCount: 2,
      })?.code,
    ).toBe("SELF_TARGET");
    expect(
      getDemotionBlock({ targetMembershipRole: "OWNER", ownerCount: 1 }),
    ).toEqual({ code: "LAST_OWNER", message: LAST_OWNER_MESSAGE });
    expect(getLeaveBlock({ membershipRole: "OWNER", ownerCount: 1 })).toEqual({
      code: "LAST_OWNER",
      message: LAST_OWNER_MESSAGE,
    });
  });
});

describe("team privacy and audit presentation", () => {
  it("exposes administration, member emails, and audit only to owners", () => {
    for (const role of ["MEMBER", null, undefined] as const) {
      expect(canViewTeamAdministration(role)).toBe(false);
      expect(canViewMemberEmails(role)).toBe(false);
      expect(canViewMembershipAudit(role)).toBe(false);
    }
    expect(canViewTeamAdministration("OWNER")).toBe(true);
    expect(canViewMemberEmails("OWNER")).toBe(true);
    expect(canViewMembershipAudit("OWNER")).toBe(true);
  });

  it("labels every audit event and safely falls back for removed users", () => {
    expect(Object.keys(membershipEventTypeLabels)).toHaveLength(11);
    expect(resolveTeamUserDisplayName("  Ada  ")).toBe("Ada");
    expect(resolveTeamUserDisplayName("   ")).toBe("Removed user");
    expect(resolveTeamUserDisplayName(null)).toBe("Removed user");
  });
});
