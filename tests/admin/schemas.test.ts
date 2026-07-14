import { describe, expect, it } from "vitest";

import {
  moderationMutationSchema,
  parseAdminAuditSearch,
  parseAdminCompanySearch,
  parseAdminJobSearch,
  parseAdminUserSearch,
} from "@/features/admin/schemas";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    targetId: "target-1",
    expectedVersion: 1,
    reasonCode: "POLICY_VIOLATION",
    reasonNote: "  Internal context only.  ",
    ...overrides,
  };
}

describe("moderation mutation validation", () => {
  it("requires a valid reason and positive version", () => {
    expect(moderationMutationSchema.safeParse(validInput()).success).toBe(true);
    expect(
      moderationMutationSchema.safeParse(validInput({ reasonCode: "" }))
        .success,
    ).toBe(false);
    expect(
      moderationMutationSchema.safeParse(validInput({ reasonCode: "UNKNOWN" }))
        .success,
    ).toBe(false);
    expect(
      moderationMutationSchema.safeParse(validInput({ expectedVersion: 0 }))
        .success,
    ).toBe(false);
  });

  it("trims, bounds, and enforces plain-text notes", () => {
    const parsed = moderationMutationSchema.parse(validInput());
    expect(parsed.reasonNote).toBe("Internal context only.");
    expect(
      moderationMutationSchema.safeParse(
        validInput({ reasonNote: "x".repeat(501) }),
      ).success,
    ).toBe(false);
    expect(
      moderationMutationSchema.safeParse(
        validInput({ reasonNote: "<script>alert(1)</script>" }),
      ).success,
    ).toBe(false);
    expect(
      moderationMutationSchema.parse(validInput({ reasonNote: "   " }))
        .reasonNote,
    ).toBeUndefined();
  });

  it("strips unknown authorization and state fields", () => {
    const parsed = moderationMutationSchema.parse({
      ...validInput(),
      actorAdminUserId: "attacker",
      targetRole: "ADMIN",
      action: "USER_RESTORED",
      currentStatus: "SUSPENDED",
      moderationVersion: 99,
      createdAt: new Date(),
    });
    expect(parsed).toEqual({
      targetId: "target-1",
      expectedVersion: 1,
      reasonCode: "POLICY_VIOLATION",
      reasonNote: "Internal context only.",
    });
  });
});

describe("Admin list filter validation", () => {
  it("normalizes valid user filters and defaults invalid pagination", () => {
    expect(
      parseAdminUserSearch({
        q: "  alex@example.test ",
        role: "CANDIDATE",
        status: "SUSPENDED",
        page: "2",
      }),
    ).toEqual({
      q: "alex@example.test",
      role: "CANDIDATE",
      status: "SUSPENDED",
      page: 2,
    });
    expect(parseAdminUserSearch({ page: "bad" }).page).toBe(1);
    expect(parseAdminUserSearch({ role: "OWNER" }).role).toBe("");
  });

  it("validates Company, Job, and audit filters", () => {
    expect(
      parseAdminCompanySearch({ status: "HIDDEN", page: ["3", "4"] }),
    ).toMatchObject({ status: "HIDDEN", page: 3 });
    expect(
      parseAdminJobSearch({ lifecycle: "CLOSED", status: "VISIBLE" }),
    ).toMatchObject({ lifecycle: "CLOSED", status: "VISIBLE", page: 1 });
    expect(
      parseAdminAuditSearch({
        action: "JOB_HIDDEN",
        reason: "SECURITY_RISK",
      }),
    ).toEqual({
      action: "JOB_HIDDEN",
      reason: "SECURITY_RISK",
      page: 1,
    });
    expect(parseAdminAuditSearch({ action: "DELETE" }).action).toBe("");
  });
});
