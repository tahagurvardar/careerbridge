import { describe, expect, it } from "vitest";

import {
  inviteRecruiterSchema,
  teamEntityIdSchema,
} from "@/features/company-team/schemas";

describe("company invitation schemas", () => {
  it("normalizes a valid recruiter email and strips untrusted fields", () => {
    expect(
      inviteRecruiterSchema.parse({
        email: "  Recruiter@Example.TEST  ",
        role: "OWNER",
        companyId: "other-company",
      }),
    ).toEqual({ email: "recruiter@example.test" });
  });

  it.each(["", "not-an-email", `${"x".repeat(250)}@test.dev`])(
    "rejects invalid invitation email %s",
    (email) => {
      expect(inviteRecruiterSchema.safeParse({ email }).success).toBe(false);
    },
  );

  it("accepts bounded entity ids and rejects blank or oversized ids", () => {
    expect(teamEntityIdSchema.safeParse("membership_1").success).toBe(true);
    expect(teamEntityIdSchema.safeParse("  ").success).toBe(false);
    expect(teamEntityIdSchema.safeParse("x".repeat(65)).success).toBe(false);
  });
});
