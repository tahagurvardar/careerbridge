import { describe, expect, it } from "vitest";

import { createRegistrationSchema } from "@/features/auth/schemas";
import { validation as az } from "@/i18n/dictionaries/az/validation";
import { validation as en } from "@/i18n/dictionaries/en/validation";
import { validation as ru } from "@/i18n/dictionaries/ru/validation";
import { validation as tr } from "@/i18n/dictionaries/tr/validation";

const registrationSchema = createRegistrationSchema(en);

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

  it("rejects the same invalid input in every locale, with localized text", () => {
    const invalid = { ...validRegistration, password: "short" };
    const messages = new Set<string>();

    for (const dictionary of [en, tr, az, ru]) {
      const result = createRegistrationSchema(dictionary).safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        messages.add(result.error.issues[0]?.message ?? "");
      }
    }

    // Same rule fails everywhere; each locale words it in its own language.
    expect(messages.size).toBe(4);
  });

  it("accepts identical valid input in every locale", () => {
    for (const dictionary of [en, tr, az, ru]) {
      expect(
        createRegistrationSchema(dictionary).safeParse(validRegistration)
          .success,
      ).toBe(true);
    }
  });
});
