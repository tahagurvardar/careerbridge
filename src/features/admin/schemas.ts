import { z } from "zod";

import {
  ADMIN_AUDIT_ACTIONS,
  CONTENT_MODERATION_STATUSES,
  MODERATION_REASON_CODES,
  USER_ACCOUNT_STATUSES,
} from "@/features/admin/moderation";
import { PLATFORM_ROLES } from "@/features/auth/roles";
import { JOB_STATUSES } from "@/features/jobs/schemas";
import type { AdminDictionary, ValidationDictionary } from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";

export const ADMIN_PAGE_SIZE = 20;

export function createModerationMutationSchema(
  validation: Pick<ValidationDictionary, "generic">,
  labels: Pick<AdminDictionary["moderationForm"], "chooseReason">,
) {
  const plainTextNoteSchema = z
    .string()
    .trim()
    .max(500, formatMessage(validation.generic.tooLong, { max: 500 }))
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), {
      message: validation.generic.invalidValue,
    })
    .transform((value) => value || undefined)
    .optional();

  return z.object({
    targetId: z.string().trim().min(1).max(128),
    expectedVersion: z.coerce.number().int().positive(),
    reasonCode: z.enum(MODERATION_REASON_CODES, {
      error: labels.chooseReason,
    }),
    reasonNote: plainTextNoteSchema,
  });
}

const defaultValidation: Pick<ValidationDictionary, "generic"> = {
  generic: {
    required: "This field is required.",
    tooLong: "Must be {max} characters or fewer.",
    fieldTooLong: "{field} must be {max} characters or fewer.",
    invalidValue: "Choose a valid value.",
  },
};

export const moderationMutationSchema = createModerationMutationSchema(
  defaultValidation,
  { chooseReason: "Choose a moderation reason." },
);

export type ModerationMutationInput = z.infer<typeof moderationMutationSchema>;

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const queryString = z.preprocess(
  firstQueryValue,
  z.string().trim().max(100).catch(""),
);
const pageNumber = z.preprocess(
  firstQueryValue,
  z.coerce.number().int().min(1).max(10_000).catch(1),
);

const userSearchSchema = z.object({
  q: queryString.default(""),
  role: z.preprocess(
    firstQueryValue,
    z.enum(["", ...PLATFORM_ROLES]).catch(""),
  ),
  status: z.preprocess(
    firstQueryValue,
    z.enum(["", ...USER_ACCOUNT_STATUSES]).catch(""),
  ),
  page: pageNumber.default(1),
});

const companySearchSchema = z.object({
  q: queryString.default(""),
  status: z.preprocess(
    firstQueryValue,
    z.enum(["", ...CONTENT_MODERATION_STATUSES]).catch(""),
  ),
  page: pageNumber.default(1),
});

const jobSearchSchema = z.object({
  q: queryString.default(""),
  lifecycle: z.preprocess(
    firstQueryValue,
    z.enum(["", ...JOB_STATUSES]).catch(""),
  ),
  status: z.preprocess(
    firstQueryValue,
    z.enum(["", ...CONTENT_MODERATION_STATUSES]).catch(""),
  ),
  page: pageNumber.default(1),
});

const auditSearchSchema = z.object({
  action: z.preprocess(
    firstQueryValue,
    z.enum(["", ...ADMIN_AUDIT_ACTIONS]).catch(""),
  ),
  reason: z.preprocess(
    firstQueryValue,
    z.enum(["", ...MODERATION_REASON_CODES]).catch(""),
  ),
  page: pageNumber.default(1),
});

export type AdminUserSearch = z.infer<typeof userSearchSchema>;
export type AdminCompanySearch = z.infer<typeof companySearchSchema>;
export type AdminJobSearch = z.infer<typeof jobSearchSchema>;
export type AdminAuditSearch = z.infer<typeof auditSearchSchema>;

export function parseAdminUserSearch(input: unknown): AdminUserSearch {
  return userSearchSchema.parse(input);
}

export function parseAdminCompanySearch(input: unknown): AdminCompanySearch {
  return companySearchSchema.parse(input);
}

export function parseAdminJobSearch(input: unknown): AdminJobSearch {
  return jobSearchSchema.parse(input);
}

export function parseAdminAuditSearch(input: unknown): AdminAuditSearch {
  return auditSearchSchema.parse(input);
}
