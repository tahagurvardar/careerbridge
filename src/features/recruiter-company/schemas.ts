import { z } from "zod";

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

function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(
      maxLength,
      `${label} must be ${maxLength.toLocaleString()} characters or fewer.`,
    );
}

export const safeHttpUrlSchema = z
  .string()
  .trim()
  .max(2048, "URL must be 2,048 characters or fewer.")
  .superRefine((value, context) => {
    if (!value) return;

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        context.addIssue({
          code: "custom",
          message: "Use an http or https URL.",
        });
      }

      if (!url.hostname) {
        context.addIssue({ code: "custom", message: "Enter a valid URL." });
      }
    } catch {
      context.addIssue({ code: "custom", message: "Enter a valid URL." });
    }
  })
  .transform((value) => (value ? new URL(value).toString() : ""));

export const recruiterProfileSchema = z
  .object({
    jobTitle: optionalText(160, "Job title"),
    bio: optionalText(2000, "Bio"),
    linkedinUrl: safeHttpUrlSchema,
  })
  .strip();

const companyNameSchema = z
  .string()
  .trim()
  .min(1, "Company name is required.")
  .max(160, "Company name must be 160 characters or fewer.");

export const foundedYearSchema = z
  .union([
    z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{4}$/.test(value),
        "Enter a four-digit year.",
      )
      .transform((value) => (value ? Number(value) : null)),
    z.number().int("Enter a whole year."),
    z.null(),
  ])
  .refine(
    (value) =>
      value === null || (value >= 1600 && value <= new Date().getUTCFullYear()),
    `Founded year must be between 1600 and ${new Date().getUTCFullYear()}.`,
  );

export const companySchema = z
  .object({
    name: companyNameSchema,
    tagline: optionalText(240, "Tagline"),
    description: optionalText(4000, "Description"),
    industry: optionalText(120, "Industry"),
    headquarters: optionalText(160, "Headquarters"),
    websiteUrl: safeHttpUrlSchema,
    companySize: z.union([
      z.enum(COMPANY_SIZES, { error: "Choose a company size." }),
      z.literal(""),
    ]),
    foundedYear: foundedYearSchema,
  })
  .strip();

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
