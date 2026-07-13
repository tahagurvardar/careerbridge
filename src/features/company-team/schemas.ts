import { z } from "zod";

export const INVITATION_EMAIL_MAX = 254;

/**
 * The invite form's only accepted input: one email address, trimmed,
 * lowercased, syntax-checked, and bounded. Unknown fields (such as an
 * attempted `inviteeUserId`, `role`, or `companyId`) are stripped by the
 * object schema; recipient identity, membership role, and Company
 * authorization are always resolved server-side.
 */
export const inviteRecruiterSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address.")
    .max(INVITATION_EMAIL_MAX, "Email address is too long."),
});

export type InviteRecruiterInput = z.input<typeof inviteRecruiterSchema>;
export type ValidatedInviteRecruiter = z.output<typeof inviteRecruiterSchema>;

/**
 * Shape guard for client-supplied invitation and membership identifiers. It
 * filters obvious garbage before any database access and never authorizes —
 * every id is re-authorized server-side against the session user's Company
 * OWNER membership or invitee identity.
 */
export const teamEntityIdSchema = z.string().trim().min(1).max(64);
