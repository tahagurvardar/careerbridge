import { z } from "zod";
import type { ValidationDictionary } from "@/i18n/dictionary";
import { validation as englishValidation } from "@/i18n/dictionaries/en/validation";

export const INVITATION_EMAIL_MAX = 254;

/**
 * The invite form's only accepted input: one email address, trimmed,
 * lowercased, syntax-checked, and bounded. Unknown fields (such as an
 * attempted `inviteeUserId`, `role`, or `companyId`) are stripped by the
 * object schema; recipient identity, membership role, and Company
 * authorization are always resolved server-side.
 */
export function createInviteRecruiterSchema(validation: ValidationDictionary) {
  return z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(validation.team.invalidEmail)
      .max(INVITATION_EMAIL_MAX, validation.team.emailTooLong),
  });
}

export const inviteRecruiterSchema =
  createInviteRecruiterSchema(englishValidation);

export type InviteRecruiterInput = z.input<typeof inviteRecruiterSchema>;
export type ValidatedInviteRecruiter = z.output<typeof inviteRecruiterSchema>;

/**
 * Shape guard for client-supplied invitation and membership identifiers. It
 * filters obvious garbage before any database access and never authorizes —
 * every id is re-authorized server-side against the session user's Company
 * OWNER membership or invitee identity.
 */
export const teamEntityIdSchema = z.string().trim().min(1).max(64);
