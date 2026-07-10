import { describe, expect, it } from "vitest";

import { registrationSchema } from "@/features/auth/schemas";

const validRegistration = {
  role: "CANDIDATE",
  fullName: "  Alex Morgan  ",
  email: "  ALEX@EXAMPLE.COM  ",
  password: "a long passphrase",
  confirmPassword: "a long passphrase",
  termsAccepted: true,
} as const;

describe("registration schema", () => {
  it("normalizes a valid registration", () => {
    const parsed = registrationSchema.parse(validRegistration);

    expect(parsed.fullName).toBe("Alex Morgan");
    expect(parsed.email).toBe("alex@example.com");
  });

  it("rejects ADMIN even when sent directly", () => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      role: "ADMIN",
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["invalid email", { email: "not-an-email" }],
    ["short password", { password: "too-short", confirmPassword: "too-short" }],
    ["password mismatch", { confirmPassword: "different passphrase" }],
    ["missing terms", { termsAccepted: false }],
    ["short name", { fullName: "A" }],
  ])("rejects %s", (_label, override) => {
    const result = registrationSchema.safeParse({
      ...validRegistration,
      ...override,
    });

    expect(result.success).toBe(false);
  });
});
