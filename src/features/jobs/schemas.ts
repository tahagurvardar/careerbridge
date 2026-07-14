import { z } from "zod";

import {
  EMPLOYMENT_TYPES,
  employmentTypeLabels,
} from "@/features/candidate-profile/schemas";
import type {
  RecruiterDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";
import { recruiter as englishRecruiter } from "@/i18n/dictionaries/en/recruiter";
import { validation as englishValidation } from "@/i18n/dictionaries/en/validation";

export { EMPLOYMENT_TYPES, employmentTypeLabels };

export const WORKPLACE_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;
export const workplaceTypeLabels: Record<
  (typeof WORKPLACE_TYPES)[number],
  string
> = {
  ONSITE: "On-site",
  HYBRID: "Hybrid",
  REMOTE: "Remote",
};

export const EXPERIENCE_LEVELS = [
  "ENTRY",
  "JUNIOR",
  "MID",
  "SENIOR",
  "LEAD",
] as const;
export const experienceLevelLabels: Record<
  (typeof EXPERIENCE_LEVELS)[number],
  string
> = {
  ENTRY: "Entry level",
  JUNIOR: "Junior",
  MID: "Mid level",
  SENIOR: "Senior",
  LEAD: "Lead",
};

export const JOB_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CLOSED",
  "ARCHIVED",
] as const;
export type JobStatusValue = (typeof JOB_STATUSES)[number];
export const jobStatusLabels: Record<JobStatusValue, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

/**
 * Salary is persisted as whole, non-negative currency units (for example
 * `90000` for 90,000). Keeping money in integers avoids floating-point drift.
 */
export const MAX_SALARY = 1_000_000_000;

/**
 * Treats calendar dates in UTC so timezone offsets never shift a deadline
 * across the day boundary. The deadline day itself is not considered past.
 */
export function isPastCalendarDate(value: string, now = new Date()): boolean {
  if (!value) return false;
  const deadline = new Date(`${value}T00:00:00.000Z`).getTime();
  const today = new Date(
    `${now.toISOString().slice(0, 10)}T00:00:00.000Z`,
  ).getTime();
  return deadline < today;
}

type SalaryShape = {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
};
export function createJobSchemas(
  validation: ValidationDictionary,
  recruiter: RecruiterDictionary,
) {
  const v = validation.jobs;
  const labels = recruiter.jobs.form;
  const optionalText = (maxLength: number, label: string) =>
    z
      .string()
      .trim()
      .max(
        maxLength,
        formatMessage(v.fieldTooLong, { field: label, max: maxLength }),
      );
  const jobTitleSchema = z
    .string()
    .trim()
    .min(2, formatMessage(v.titleMin, { min: 2 }))
    .max(160, formatMessage(v.titleMax, { max: 160 }));
  const salaryAmountSchema = z
    .union([
      z
        .string()
        .trim()
        .refine(
          (value) => value === "" || /^\d{1,10}$/.test(value),
          v.wholeNonNegative,
        )
        .transform((value) => (value ? Number(value) : null)),
      z.number().int(v.wholeAmount).nonnegative(v.salaryNonNegative),
      z.null(),
    ])
    .refine(
      (value) => value === null || (value >= 0 && value <= MAX_SALARY),
      formatMessage(v.salaryBetween, { min: 0, max: MAX_SALARY }),
    );
  const salaryCurrencySchema = z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine(
      (value) => value === "" || /^[A-Z]{3}$/.test(value),
      v.currencyCode,
    );
  const calendarDateSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, v.validDate)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
      );
    }, v.validDate);
  const applicationDeadlineSchema = z.union([
    calendarDateSchema,
    z.literal(""),
  ]);
  const refineSalary = (value: SalaryShape, context: z.RefinementCtx) => {
    if (
      value.salaryMin !== null &&
      value.salaryMax !== null &&
      value.salaryMin > value.salaryMax
    ) {
      context.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message: v.salaryOrder,
      });
    }
    if (
      (value.salaryMin !== null || value.salaryMax !== null) &&
      !value.salaryCurrency
    ) {
      context.addIssue({
        code: "custom",
        path: ["salaryCurrency"],
        message: v.currencyRequired,
      });
    }
  };
  const jobContentShape = {
    title: jobTitleSchema,
    summary: optionalText(320, labels.summary),
    description: optionalText(8000, labels.description),
    responsibilities: optionalText(6000, labels.responsibilities),
    requirements: optionalText(6000, labels.requirements),
    location: optionalText(160, labels.location),
    employmentType: z.union([z.enum(EMPLOYMENT_TYPES), z.literal("")]),
    workplaceType: z.union([z.enum(WORKPLACE_TYPES), z.literal("")]),
    experienceLevel: z.union([z.enum(EXPERIENCE_LEVELS), z.literal("")]),
    salaryMin: salaryAmountSchema,
    salaryMax: salaryAmountSchema,
    salaryCurrency: salaryCurrencySchema,
    applicationDeadline: applicationDeadlineSchema,
  } as const;
  const jobContentSchema = z
    .object(jobContentShape)
    .strip()
    .superRefine(refineSalary);
  const jobCreateSchema = z
    .object({
      companyId: z.string().trim().min(1, v.chooseCompany),
      ...jobContentShape,
    })
    .strip()
    .superRefine(refineSalary);
  return {
    salaryAmountSchema,
    salaryCurrencySchema,
    applicationDeadlineSchema,
    jobContentSchema,
    jobCreateSchema,
  };
}

const defaultSchemas = createJobSchemas(englishValidation, englishRecruiter);
export const salaryAmountSchema = defaultSchemas.salaryAmountSchema;
export const salaryCurrencySchema = defaultSchemas.salaryCurrencySchema;
export const applicationDeadlineSchema =
  defaultSchemas.applicationDeadlineSchema;
export const jobContentSchema = defaultSchemas.jobContentSchema;
export const jobCreateSchema = defaultSchemas.jobCreateSchema;

// Reuse the shared, normalized Skill catalog rules from candidate profiles.
export {
  skillSchema,
  getSkillLookupName,
} from "@/features/candidate-profile/schemas";
export type { SkillInput } from "@/features/candidate-profile/schemas";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const jobSearchTextSchema = z.string().trim().max(100).catch("");
const employmentTypeFilterSchema = z.enum(EMPLOYMENT_TYPES);
const workplaceTypeFilterSchema = z.enum(WORKPLACE_TYPES);
const experienceLevelFilterSchema = z.enum(EXPERIENCE_LEVELS);

export interface PublicJobSearch {
  q: string;
  location: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number] | "";
  workplaceType: (typeof WORKPLACE_TYPES)[number] | "";
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number] | "";
}

export function parsePublicJobSearch(
  searchParams: SearchParams,
): PublicJobSearch {
  const employmentType = employmentTypeFilterSchema.safeParse(
    firstValue(searchParams.employmentType),
  );
  const workplaceType = workplaceTypeFilterSchema.safeParse(
    firstValue(searchParams.workplaceType),
  );
  const experienceLevel = experienceLevelFilterSchema.safeParse(
    firstValue(searchParams.experienceLevel),
  );

  return {
    q: jobSearchTextSchema.parse(firstValue(searchParams.q)),
    location: jobSearchTextSchema.parse(firstValue(searchParams.location)),
    employmentType: employmentType.success ? employmentType.data : "",
    workplaceType: workplaceType.success ? workplaceType.data : "",
    experienceLevel: experienceLevel.success ? experienceLevel.data : "",
  };
}

export function hasActiveJobFilters(search: PublicJobSearch) {
  return Boolean(
    search.q ||
    search.location ||
    search.employmentType ||
    search.workplaceType ||
    search.experienceLevel,
  );
}

const recruiterStatusFilterSchema = z.enum(JOB_STATUSES);

export interface RecruiterJobFilters {
  q: string;
  status: JobStatusValue | "";
  companyId: string;
}

export function parseRecruiterJobFilters(
  searchParams: SearchParams,
): RecruiterJobFilters {
  const status = recruiterStatusFilterSchema.safeParse(
    firstValue(searchParams.status),
  );

  return {
    q: jobSearchTextSchema.parse(firstValue(searchParams.q)),
    status: status.success ? status.data : "",
    companyId: jobSearchTextSchema.parse(firstValue(searchParams.companyId)),
  };
}

export function hasActiveRecruiterJobFilters(filters: RecruiterJobFilters) {
  return Boolean(filters.q || filters.status || filters.companyId);
}

export type JobContentInput = z.input<typeof jobContentSchema>;
export type ValidatedJobContent = z.output<typeof jobContentSchema>;
export type JobCreateInput = z.input<typeof jobCreateSchema>;
export type ValidatedJobCreate = z.output<typeof jobCreateSchema>;
