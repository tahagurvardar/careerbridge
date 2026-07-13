import { z } from "zod";

import {
  INTERVIEW_FORMATS,
  INTERVIEW_INSTRUCTIONS_MAX,
  INTERVIEW_LOCATION_MAX,
  INTERVIEW_MAX_DURATION_MINUTES,
  INTERVIEW_MAX_FUTURE_DAYS,
  INTERVIEW_MEETING_URL_MAX,
  INTERVIEW_MIN_DURATION_MINUTES,
  INTERVIEW_MIN_LEAD_MINUTES,
  INTERVIEW_TIMEZONE_MAX,
  INTERVIEW_TITLE_MAX,
  isValidIanaTimeZone,
} from "@/features/interviews/interviews";

// ---------------------------------------------------------------------------
// Meeting-link safety
// ---------------------------------------------------------------------------

/**
 * Meeting links must be absolute HTTPS URLs. Everything else — javascript:,
 * data:, mailto:, http:, protocol-relative "//", embedded credentials, or
 * unparseable values — is rejected before it can reach storage or a href.
 */
export function isSafeMeetingUrl(value: string): boolean {
  if (
    value.length === 0 ||
    value.length > INTERVIEW_MEETING_URL_MAX ||
    value.startsWith("//") ||
    /[\u0000-\u001F\u007F\s]/.test(value)
  ) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname.length > 0 &&
    url.username === "" &&
    url.password === ""
  );
}

// ---------------------------------------------------------------------------
// Field schemas
// ---------------------------------------------------------------------------

const titleSchema = z
  .string()
  .trim()
  .min(1, "Give the interview a title.")
  .max(
    INTERVIEW_TITLE_MAX,
    `Title must be ${INTERVIEW_TITLE_MAX} characters or fewer.`,
  );

// A UTC instant serialized by the browser (Date#toISOString). The trailing
// zone designator is required so a bare wall-clock string can never be
// reinterpreted in the server's local timezone.
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function isoInstantSchema(label: string) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      const time = ISO_INSTANT_PATTERN.test(value)
        ? new Date(value).getTime()
        : Number.NaN;
      if (!Number.isFinite(time)) {
        ctx.addIssue({ code: "custom", message: `${label} is not valid.` });
        return z.NEVER;
      }
      return new Date(time);
    });
}

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Choose a timezone.")
  .max(INTERVIEW_TIMEZONE_MAX, "Choose a valid timezone.")
  .refine(isValidIanaTimeZone, "Choose a valid timezone.");

/** Trims, bounds, and collapses empty optional text to null. */
function optionalBoundedText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${max.toLocaleString()} characters or fewer.`)
    .default("")
    .transform((value) => (value.length > 0 ? value : null));
}

const meetingUrlSchema = z
  .string()
  .trim()
  .max(INTERVIEW_MEETING_URL_MAX, "Meeting link is too long.")
  .default("")
  .transform((value, ctx) => {
    if (value.length === 0) return null;
    if (!isSafeMeetingUrl(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Meeting link must be a valid https:// URL.",
      });
      return z.NEVER;
    }
    return value;
  });

// ---------------------------------------------------------------------------
// Schedule schema (creation + reschedule share the same field rules)
// ---------------------------------------------------------------------------

/**
 * Builds the schedule validator against an explicit `now` so lead-time and
 * horizon rules stay deterministic under test. Unknown fields are stripped;
 * every cross-field rule (ordering, duration, format requirements) runs after
 * the field rules succeed.
 */
export function buildInterviewScheduleSchema(now: Date) {
  return z
    .object({
      title: titleSchema,
      format: z.enum(INTERVIEW_FORMATS, {
        error: "Choose an interview format.",
      }),
      startAt: isoInstantSchema("Start time"),
      endAt: isoInstantSchema("End time"),
      timeZone: timeZoneSchema,
      location: optionalBoundedText("Location", INTERVIEW_LOCATION_MAX),
      meetingUrl: meetingUrlSchema,
      instructions: optionalBoundedText(
        "Instructions",
        INTERVIEW_INSTRUCTIONS_MAX,
      ),
    })
    .strip()
    .superRefine((value, ctx) => {
      const minStart = now.getTime() + INTERVIEW_MIN_LEAD_MINUTES * 60_000;
      const maxStart =
        now.getTime() + INTERVIEW_MAX_FUTURE_DAYS * 24 * 60 * 60_000;
      if (value.startAt.getTime() < minStart) {
        ctx.addIssue({
          code: "custom",
          path: ["startAt"],
          message: `Interviews must start at least ${INTERVIEW_MIN_LEAD_MINUTES} minutes from now.`,
        });
      } else if (value.startAt.getTime() > maxStart) {
        ctx.addIssue({
          code: "custom",
          path: ["startAt"],
          message: "Interviews cannot be scheduled more than a year ahead.",
        });
      }

      const durationMinutes =
        (value.endAt.getTime() - value.startAt.getTime()) / 60_000;
      if (durationMinutes <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "End time must be after the start time.",
        });
      } else if (durationMinutes < INTERVIEW_MIN_DURATION_MINUTES) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: `Interviews must last at least ${INTERVIEW_MIN_DURATION_MINUTES} minutes.`,
        });
      } else if (durationMinutes > INTERVIEW_MAX_DURATION_MINUTES) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "Interviews cannot run longer than 8 hours.",
        });
      }

      if (value.format === "VIDEO" && !value.meetingUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingUrl"],
          message: "Video interviews need an https:// meeting link.",
        });
      }
      if (value.format === "ONSITE" && !value.location) {
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message: "Onsite interviews need a location.",
        });
      }
      if (value.format === "PHONE" && value.meetingUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingUrl"],
          message:
            "Phone interviews cannot use a meeting link. Describe the call in the instructions instead.",
        });
      }
      if (
        value.format === "OTHER" &&
        !value.location &&
        !value.meetingUrl &&
        !value.instructions
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["instructions"],
          message:
            "Add a location, meeting link, or instructions so the candidate knows how to attend.",
        });
      }
    });
}

export type InterviewScheduleInput = z.input<
  ReturnType<typeof buildInterviewScheduleSchema>
>;
export type ValidatedInterviewSchedule = z.output<
  ReturnType<typeof buildInterviewScheduleSchema>
>;

// ---------------------------------------------------------------------------
// Concurrency token
// ---------------------------------------------------------------------------

/** Positive integer version counter; a token only, never authorization. */
export const expectedVersionSchema = z.number().int().min(1).max(2_147_483_647);
