import { z } from "zod";

import { publicRoleSchema } from "@/features/auth/roles";

export const registrationSchema = z
  .object({
    role: publicRoleSchema,
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(80, "Full name must be 80 characters or fewer."),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254, "Email address is too long."),
    password: z
      .string()
      .min(12, "Password must be at least 12 characters.")
      .max(128, "Password must be 128 characters or fewer."),
    confirmPassword: z.string(),
    termsAccepted: z.boolean().refine((accepted) => accepted, {
      message: "Accept the Terms of Service and Privacy Policy to continue.",
    }),
  })
  .superRefine(({ password, confirmPassword }, context) => {
    if (password !== confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords must match.",
      });
    }
  });

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(254, "Email address is too long."),
  password: z.string().min(1, "Enter your password.").max(128),
  callbackPath: z.string().optional(),
});

export type RegistrationValues = z.infer<typeof registrationSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
