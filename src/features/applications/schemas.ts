import { z } from "zod";
import type { ValidationDictionary } from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const applicationStatusLabels: Record<ApplicationStatusValue, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/**
 * The statuses a recruiter may target. SUBMITTED is only the initial state and
 * WITHDRAWN is candidate-only, so neither can ever be set by a recruiter.
 */
export const RECRUITER_TARGET_STATUSES = [
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
] as const;
export type RecruiterTargetStatus = (typeof RECRUITER_TARGET_STATUSES)[number];
export const recruiterStatusActionSchema = z.enum(RECRUITER_TARGET_STATUSES);

const MAX_COVER_LETTER = 6000;

export function createApplySchema(
  validation: Pick<ValidationDictionary, "generic">,
) {
  return z
    .object({
      coverLetter: z
        .string()
        .trim()
        .max(
          MAX_COVER_LETTER,
          formatMessage(validation.generic.tooLong, { max: MAX_COVER_LETTER }),
        ),
    })
    .strip();
}

const englishValidation = {
  generic: {
    required: "This field is required.",
    tooLong: "Must be {max} characters or fewer.",
    fieldTooLong: "{field} must be {max} characters or fewer.",
    invalidValue: "Choose a valid value.",
  },
} satisfies Pick<ValidationDictionary, "generic">;

export const applySchema = createApplySchema(englishValidation);
export const coverLetterSchema = applySchema.shape.coverLetter;

export type ApplyInput = z.input<typeof applySchema>;
export type ValidatedApply = z.output<typeof applySchema>;

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const searchTextSchema = z.string().trim().max(100).catch("");
const statusFilterSchema = z.enum(APPLICATION_STATUSES);

export interface CandidateApplicationSearch {
  q: string;
  status: ApplicationStatusValue | "";
}

export function parseCandidateApplicationSearch(
  searchParams: SearchParams,
): CandidateApplicationSearch {
  const status = statusFilterSchema.safeParse(firstValue(searchParams.status));
  return {
    q: searchTextSchema.parse(firstValue(searchParams.q)),
    status: status.success ? status.data : "",
  };
}

export function hasActiveCandidateApplicationFilters(
  search: CandidateApplicationSearch,
) {
  return Boolean(search.q || search.status);
}

export interface RecruiterApplicationSearch {
  q: string;
  status: ApplicationStatusValue | "";
  companyId: string;
  jobId: string;
}

export function parseRecruiterApplicationSearch(
  searchParams: SearchParams,
): RecruiterApplicationSearch {
  const status = statusFilterSchema.safeParse(firstValue(searchParams.status));
  return {
    q: searchTextSchema.parse(firstValue(searchParams.q)),
    status: status.success ? status.data : "",
    companyId: searchTextSchema.parse(firstValue(searchParams.companyId)),
    jobId: searchTextSchema.parse(firstValue(searchParams.jobId)),
  };
}

export function hasActiveRecruiterApplicationFilters(
  search: RecruiterApplicationSearch,
) {
  return Boolean(search.q || search.status || search.companyId || search.jobId);
}
