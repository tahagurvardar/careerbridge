import { z } from "zod";
import type {
  CandidateDictionary,
  ValidationDictionary,
} from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";
import { candidate as englishCandidate } from "@/i18n/dictionaries/en/candidate";
import { validation as englishValidation } from "@/i18n/dictionaries/en/validation";

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

export function createCandidateProfileSchemas(
  validation: ValidationDictionary,
  candidate: CandidateDictionary,
) {
  const v = validation.profile;
  const profile = candidate.profile;
  const optionalText = (maxLength: number, label: string) =>
    z
      .string()
      .trim()
      .max(
        maxLength,
        formatMessage(v.fieldTooLong, { field: label, max: maxLength }),
      );

  const professionalUrlSchema = z
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
      } catch {
        context.addIssue({ code: "custom", message: v.invalidUrl });
      }
    })
    .transform((value) => (value ? new URL(value).toString() : ""));

  const basicProfileSchema = z.object({
    headline: optionalText(160, profile.basicForm.headlineLabel),
    location: optionalText(120, profile.basicForm.locationLabel),
    bio: optionalText(2000, profile.basicForm.bioLabel),
    websiteUrl: professionalUrlSchema,
    linkedinUrl: professionalUrlSchema,
    githubUrl: professionalUrlSchema,
  });

  const yearSchema = z
    .number({ error: v.enterYear })
    .int(v.wholeYear)
    .min(MIN_YEAR, formatMessage(v.yearMin, { min: MIN_YEAR }))
    .max(MAX_YEAR, formatMessage(v.yearMax, { max: MAX_YEAR }));

  const educationSchema = z
    .object({
      school: z
        .string()
        .trim()
        .min(
          1,
          formatMessage(v.required, { field: profile.educationForm.school }),
        )
        .max(
          160,
          formatMessage(v.fieldTooLong, {
            field: profile.educationForm.school,
            max: 160,
          }),
        ),
      degree: optionalText(120, profile.educationForm.degree),
      fieldOfStudy: optionalText(120, profile.educationForm.fieldOfStudy),
      startYear: yearSchema,
      endYear: yearSchema.nullable(),
      isCurrent: z.boolean(),
      description: optionalText(2000, profile.educationForm.description),
    })
    .superRefine((value, context) => {
      if (value.isCurrent && value.endYear !== null) {
        context.addIssue({
          code: "custom",
          path: ["endYear"],
          message: v.currentProgramEnd,
        });
      }
      if (value.endYear !== null && value.endYear < value.startYear) {
        context.addIssue({
          code: "custom",
          path: ["endYear"],
          message: v.endYearOrder,
        });
      }
    });

  const calendarDateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, v.validDate)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
      );
    }, v.validDate);

  const experienceSchema = z
    .object({
      companyName: z
        .string()
        .trim()
        .min(
          1,
          formatMessage(v.required, { field: profile.experienceForm.company }),
        )
        .max(
          160,
          formatMessage(v.fieldTooLong, {
            field: profile.experienceForm.company,
            max: 160,
          }),
        ),
      jobTitle: z
        .string()
        .trim()
        .min(
          1,
          formatMessage(v.required, { field: profile.experienceForm.jobTitle }),
        )
        .max(
          160,
          formatMessage(v.fieldTooLong, {
            field: profile.experienceForm.jobTitle,
            max: 160,
          }),
        ),
      employmentType: z.enum(EMPLOYMENT_TYPES, { error: v.chooseEmployment }),
      location: optionalText(120, profile.experienceForm.location),
      startDate: calendarDateSchema,
      endDate: z.union([calendarDateSchema, z.literal("")]),
      isCurrent: z.boolean(),
      description: optionalText(2000, profile.experienceForm.description),
    })
    .superRefine((value, context) => {
      if (value.isCurrent && value.endDate) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: v.currentRoleEnd,
        });
      }
      if (value.endDate && value.endDate < value.startDate) {
        context.addIssue({
          code: "custom",
          path: ["endDate"],
          message: v.endDateOrder,
        });
      }
    });

  const skillSchema = z.object({
    name: z
      .string()
      .transform(normalizeSkillName)
      .pipe(
        z
          .string()
          .min(2, formatMessage(v.skillMin, { min: 2 }))
          .max(80, formatMessage(v.skillMax, { max: 80 }))
          .regex(/^[\p{L}\p{N}][\p{L}\p{N}\s+#./&-]*$/u, v.skillCharacters),
      ),
  });

  return { basicProfileSchema, educationSchema, experienceSchema, skillSchema };
}

export function normalizeSkillName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function getSkillLookupName(value: string) {
  return normalizeSkillName(value).toLocaleLowerCase("en-US");
}

const defaultSchemas = createCandidateProfileSchemas(
  englishValidation,
  englishCandidate,
);
export const basicProfileSchema = defaultSchemas.basicProfileSchema;
export const educationSchema = defaultSchemas.educationSchema;
export const experienceSchema = defaultSchemas.experienceSchema;
export const skillSchema = defaultSchemas.skillSchema;

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
