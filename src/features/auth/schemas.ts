import { z } from "zod";

import { PUBLIC_ROLES } from "@/features/auth/roles";
import type { ValidationDictionary } from "@/i18n/dictionary";

// Locale-aware schema factories: one set of business rules, four languages of
// feedback. The server action builds the schema from the request locale and
// the client form from the locale passed by its server parent, so identical
// invalid input is rejected in every locale — only the message text differs.

export function createRegistrationSchema(v: ValidationDictionary) {
  return z
    .object({
      role: z.enum(PUBLIC_ROLES, { error: v.auth.chooseAccountType }),
      fullName: z
        .string()
        .trim()
        .min(2, v.auth.fullNameRequired)
        .max(80, v.auth.fullNameTooLong),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email(v.auth.invalidEmail)
        .max(254, v.auth.emailTooLong),
      password: z
        .string()
        .min(12, v.auth.passwordMinLength)
        .max(128, v.auth.passwordMaxLength),
      confirmPassword: z.string(),
      termsAccepted: z.boolean().refine((accepted) => accepted, {
        message: v.auth.acceptTerms,
      }),
    })
    .superRefine(({ password, confirmPassword }, context) => {
      if (password !== confirmPassword) {
        context.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: v.auth.passwordsMustMatch,
        });
      }
    });
}

export function createSignInSchema(v: ValidationDictionary) {
  return z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(v.auth.invalidEmail)
      .max(254, v.auth.emailTooLong),
    password: z.string().min(1, v.auth.passwordRequired).max(128),
    callbackPath: z.string().optional(),
  });
}

export type RegistrationValues = z.infer<
  ReturnType<typeof createRegistrationSchema>
>;
export type SignInValues = z.infer<ReturnType<typeof createSignInSchema>>;
