import { z } from "zod";
import type {
  RecruiterDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";
import { recruiter as englishRecruiter } from "@/i18n/dictionaries/en/recruiter";
import { validation as englishValidation } from "@/i18n/dictionaries/en/validation";

export const COMPANY_SIZES = [
  "SOLO",
  "TWO_TO_TEN",
  "ELEVEN_TO_FIFTY",
  "FIFTY_ONE_TO_TWO_HUNDRED",
  "TWO_HUNDRED_ONE_TO_FIVE_HUNDRED",
  "FIVE_HUNDRED_ONE_TO_ONE_THOUSAND",
  "ONE_THOUSAND_PLUS",
] as const;

export const companySizeLabels: Record<(typeof COMPANY_SIZES)[number], string> =
  {
    SOLO: "1 person",
    TWO_TO_TEN: "2–10 people",
    ELEVEN_TO_FIFTY: "11–50 people",
    FIFTY_ONE_TO_TWO_HUNDRED: "51–200 people",
    TWO_HUNDRED_ONE_TO_FIVE_HUNDRED: "201–500 people",
    FIVE_HUNDRED_ONE_TO_ONE_THOUSAND: "501–1,000 people",
    ONE_THOUSAND_PLUS: "1,001+ people",
  };

export function createRecruiterCompanySchemas(
  validation: ValidationDictionary,
  recruiter: RecruiterDictionary,
) {
  const v = validation.company;
  const form = recruiter.companyForm;
  const optionalText = (maxLength: number, label: string) =>
    z
      .string()
      .trim()
      .max(
        maxLength,
        formatMessage(v.fieldTooLong, { field: label, max: maxLength }),
      );
  const safeHttpUrlSchema = z
    .string()
    .trim()
    .max(2048, formatMessage(v.urlTooLong, { max: 2048 }))
    .superRefine((value, context) => {
      if (!value) return;
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) {
          context.addIssue({ code: "custom", message: v.urlScheme });
        }
        if (!url.hostname)
          context.addIssue({ code: "custom", message: v.invalidUrl });
      } catch {
        context.addIssue({ code: "custom", message: v.invalidUrl });
      }
    })
    .transform((value) => (value ? new URL(value).toString() : ""));
  const recruiterProfileSchema = z
    .object({
      jobTitle: optionalText(160, recruiter.profileForm.jobTitle),
      bio: optionalText(2000, recruiter.profileForm.bio),
      linkedinUrl: safeHttpUrlSchema,
    })
    .strip();
  const companyNameSchema = z
    .string()
    .trim()
    .min(1, v.nameRequired)
    .max(160, formatMessage(v.fieldTooLong, { field: form.name, max: 160 }));
  const currentYear = new Date().getUTCFullYear();
  const foundedYearSchema = z
    .union([
      z
        .string()
        .trim()
        .refine(
          (value) => value === "" || /^\d{4}$/.test(value),
          v.fourDigitYear,
        )
        .transform((value) => (value ? Number(value) : null)),
      z.number().int(v.wholeYear),
      z.null(),
    ])
    .refine(
      (value) => value === null || (value >= 1600 && value <= currentYear),
      formatMessage(v.foundedBetween, { min: 1600, max: currentYear }),
    );
  const companySchema = z
    .object({
      name: companyNameSchema,
      tagline: optionalText(240, form.tagline),
      description: optionalText(4000, form.description),
      industry: optionalText(120, form.industry),
      headquarters: optionalText(160, form.headquarters),
      websiteUrl: safeHttpUrlSchema,
      companySize: z.union([
        z.enum(COMPANY_SIZES, { error: v.chooseSize }),
        z.literal(""),
      ]),
      foundedYear: foundedYearSchema,
    })
    .strip();
  return {
    safeHttpUrlSchema,
    recruiterProfileSchema,
    foundedYearSchema,
    companySchema,
  };
}

const defaultSchemas = createRecruiterCompanySchemas(
  englishValidation,
  englishRecruiter,
);
export const safeHttpUrlSchema = defaultSchemas.safeHttpUrlSchema;
export const recruiterProfileSchema = defaultSchemas.recruiterProfileSchema;
export const foundedYearSchema = defaultSchemas.foundedYearSchema;
export const companySchema = defaultSchemas.companySchema;

const searchText = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => value ?? "");

export const publicCompanySearchSchema = z
  .object({
    q: searchText,
    industry: searchText,
    headquarters: searchText,
  })
  .strip();

export type RecruiterProfileInput = z.input<typeof recruiterProfileSchema>;
export type ValidatedRecruiterProfile = z.output<typeof recruiterProfileSchema>;
export type CompanyInput = z.input<typeof companySchema>;
export type ValidatedCompany = z.output<typeof companySchema>;
export type PublicCompanySearch = z.output<typeof publicCompanySearchSchema>;
