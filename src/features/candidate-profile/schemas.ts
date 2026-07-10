import { z } from "zod";

const CURRENT_YEAR = new Date().getUTCFullYear();
const MIN_YEAR = 1950;
const MAX_YEAR = CURRENT_YEAR + 5;

export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "TEMPORARY",
  "FREELANCE",
] as const;

export const employmentTypeLabels: Record<
  (typeof EMPLOYMENT_TYPES)[number],
  string
> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  TEMPORARY: "Temporary",
  FREELANCE: "Freelance",
};

function optionalText(maxLength: number, label: string) {
  return z
    .string()
    .trim()
    .max(maxLength, `${label} must be ${maxLength} characters or fewer.`);
}

const professionalUrlSchema = z
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
    } catch {
      context.addIssue({ code: "custom", message: "Enter a valid URL." });
    }
  })
  .transform((value) => (value ? new URL(value).toString() : ""));

export const basicProfileSchema = z.object({
  headline: optionalText(160, "Headline"),
  location: optionalText(120, "Location"),
  bio: optionalText(2000, "Bio"),
  websiteUrl: professionalUrlSchema,
  linkedinUrl: professionalUrlSchema,
  githubUrl: professionalUrlSchema,
});

const yearSchema = z
  .number({ error: "Enter a year." })
  .int("Enter a whole year.")
  .min(MIN_YEAR, `Year must be ${MIN_YEAR} or later.`)
  .max(MAX_YEAR, `Year must be ${MAX_YEAR} or earlier.`);

export const educationSchema = z
  .object({
    school: z
      .string()
      .trim()
      .min(1, "School is required.")
      .max(160, "School must be 160 characters or fewer."),
    degree: optionalText(120, "Degree"),
    fieldOfStudy: optionalText(120, "Field of study"),
    startYear: yearSchema,
    endYear: yearSchema.nullable(),
    isCurrent: z.boolean(),
    description: optionalText(2000, "Description"),
  })
  .superRefine((value, context) => {
    if (value.isCurrent && value.endYear !== null) {
      context.addIssue({
        code: "custom",
        path: ["endYear"],
        message: "A current program cannot have an end year.",
      });
    }

    if (value.endYear !== null && value.endYear < value.startYear) {
      context.addIssue({
        code: "custom",
        path: ["endYear"],
        message: "End year cannot be earlier than start year.",
      });
    }
  });

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }, "Enter a valid date.");

export const experienceSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(1, "Company is required.")
      .max(160, "Company must be 160 characters or fewer."),
    jobTitle: z
      .string()
      .trim()
      .min(1, "Job title is required.")
      .max(160, "Job title must be 160 characters or fewer."),
    employmentType: z.enum(EMPLOYMENT_TYPES, {
      error: "Choose an employment type.",
    }),
    location: optionalText(120, "Location"),
    startDate: calendarDateSchema,
    endDate: z.union([calendarDateSchema, z.literal("")]),
    isCurrent: z.boolean(),
    description: optionalText(2000, "Description"),
  })
  .superRefine((value, context) => {
    if (value.isCurrent && value.endDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "A current role cannot have an end date.",
      });
    }

    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "End date cannot be earlier than start date.",
      });
    }
  });

export function normalizeSkillName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function getSkillLookupName(value: string) {
  return normalizeSkillName(value).toLocaleLowerCase("en-US");
}

export const skillSchema = z.object({
  name: z
    .string()
    .transform(normalizeSkillName)
    .pipe(
      z
        .string()
        .min(2, "Skill must be at least 2 characters.")
        .max(80, "Skill must be 80 characters or fewer.")
        .regex(
          /^[\p{L}\p{N}][\p{L}\p{N}\s+#./&-]*$/u,
          "Use letters, numbers, spaces, or common skill punctuation.",
        ),
    ),
});

export function isDuplicateSkillAssignment(
  existingNormalizedNames: readonly string[],
  candidateName: string,
) {
  const parsed = skillSchema.safeParse({ name: candidateName });
  return (
    parsed.success &&
    existingNormalizedNames.includes(getSkillLookupName(parsed.data.name))
  );
}

export type BasicProfileInput = z.input<typeof basicProfileSchema>;
export type EducationInput = z.input<typeof educationSchema>;
export type ExperienceInput = z.input<typeof experienceSchema>;
export type SkillInput = z.input<typeof skillSchema>;
export type ValidatedBasicProfile = z.output<typeof basicProfileSchema>;
export type ValidatedEducation = z.output<typeof educationSchema>;
export type ValidatedExperience = z.output<typeof experienceSchema>;
