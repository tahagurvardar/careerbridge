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
import type { InterviewsDictionary } from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";
import { interviews as englishInterviews } from "@/i18n/dictionaries/en/interviews";

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

type ScheduleValidation = InterviewsDictionary["scheduleForm"]["validation"];

function titleSchema(v: ScheduleValidation) {
  return z
    .string()
    .trim()
    .min(1, v.titleRequired)
    .max(
      INTERVIEW_TITLE_MAX,
      formatMessage(v.titleTooLong, { max: INTERVIEW_TITLE_MAX }),
    );
}

// A UTC instant serialized by the browser (Date#toISOString). The trailing
// zone designator is required so a bare wall-clock string can never be
// reinterpreted in the server's local timezone.
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

function isoInstantSchema(message: string) {
  return z
    .string()
    .trim()
    .transform((value, ctx) => {
      const time = ISO_INSTANT_PATTERN.test(value)
        ? new Date(value).getTime()
        : Number.NaN;
      if (!Number.isFinite(time)) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return new Date(time);
    });
}

function timeZoneSchema(v: ScheduleValidation) {
  return z
    .string()
    .trim()
    .min(1, v.timezoneRequired)
    .max(INTERVIEW_TIMEZONE_MAX, v.timezoneInvalid)
    .refine(isValidIanaTimeZone, v.timezoneInvalid);
}

/** Trims, bounds, and collapses empty optional text to null. */
function optionalBoundedText(message: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, message)
    .default("")
    .transform((value) => (value.length > 0 ? value : null));
}

function meetingUrlSchema(v: ScheduleValidation) {
  return z
    .string()
    .trim()
    .max(INTERVIEW_MEETING_URL_MAX, v.meetingLinkTooLong)
    .default("")
    .transform((value, ctx) => {
      if (value.length === 0) return null;
      if (!isSafeMeetingUrl(value)) {
        ctx.addIssue({ code: "custom", message: v.meetingLinkInvalid });
        return z.NEVER;
      }
      return value;
    });
}

// ---------------------------------------------------------------------------
// Schedule schema (creation + reschedule share the same field rules)
// ---------------------------------------------------------------------------

/**
 * Builds the schedule validator against an explicit `now` so lead-time and
 * horizon rules stay deterministic under test. Unknown fields are stripped;
 * every cross-field rule (ordering, duration, format requirements) runs after
 * the field rules succeed.
 */
export function buildInterviewScheduleSchema(
  now: Date,
  v: ScheduleValidation = englishInterviews.scheduleForm.validation,
) {
  return z
    .object({
      title: titleSchema(v),
      format: z.enum(INTERVIEW_FORMATS, {
        error: v.formatRequired,
      }),
      startAt: isoInstantSchema(v.invalidDateTime),
      endAt: isoInstantSchema(v.invalidDateTime),
      timeZone: timeZoneSchema(v),
      location: optionalBoundedText(
        formatMessage(v.locationTooLong, { max: INTERVIEW_LOCATION_MAX }),
        INTERVIEW_LOCATION_MAX,
      ),
      meetingUrl: meetingUrlSchema(v),
      instructions: optionalBoundedText(
        formatMessage(v.instructionsTooLong, {
          max: INTERVIEW_INSTRUCTIONS_MAX,
        }),
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
          message: formatMessage(v.leadTime, {
            minutes: INTERVIEW_MIN_LEAD_MINUTES,
          }),
        });
      } else if (value.startAt.getTime() > maxStart) {
        ctx.addIssue({
          code: "custom",
          path: ["startAt"],
          message: v.futureLimit,
        });
      }

      const durationMinutes =
        (value.endAt.getTime() - value.startAt.getTime()) / 60_000;
      if (durationMinutes <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: v.endAfterStart,
        });
      } else if (durationMinutes < INTERVIEW_MIN_DURATION_MINUTES) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: formatMessage(v.minimumDuration, {
            minutes: INTERVIEW_MIN_DURATION_MINUTES,
          }),
        });
      } else if (durationMinutes > INTERVIEW_MAX_DURATION_MINUTES) {
        ctx.addIssue({
          code: "custom",
          path: ["endAt"],
          message: v.maximumDuration,
        });
      }

      if (value.format === "VIDEO" && !value.meetingUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingUrl"],
          message: v.videoLinkRequired,
        });
      }
      if (value.format === "ONSITE" && !value.location) {
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message: v.onsiteLocationRequired,
        });
      }
      if (value.format === "PHONE" && value.meetingUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["meetingUrl"],
          message: v.phoneLinkForbidden,
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
          message: v.attendanceRequired,
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
