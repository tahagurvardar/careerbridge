// Pure, database-free Interview domain logic: lifecycle transition rules,
// UTC/IANA-timezone helpers, overlap detection, safe display formatting, and
// the fixed user-facing safety copy. The server layer resolves trusted facts
// (actor, application, interview, versions) from the session and database and
// delegates every rule decision and user-visible string here so both stay
// unit-testable without a database.
//
// Nothing in this module reads the database, renders HTML/Markdown, or trusts
// browser input beyond the explicit value being validated.

import type {
  InterviewEventType,
  InterviewFormat,
  InterviewStatus,
} from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Enumerations and bounds (mirroring the `interview` table columns)
// ---------------------------------------------------------------------------

export const INTERVIEW_FORMATS = [
  "VIDEO",
  "PHONE",
  "ONSITE",
  "OTHER",
] as const satisfies readonly InterviewFormat[];
export type InterviewFormatValue = (typeof INTERVIEW_FORMATS)[number];

export const INTERVIEW_STATUSES = [
  "PENDING_RESPONSE",
  "ACCEPTED",
  "DECLINED",
  "CANCELED",
  "COMPLETED",
] as const satisfies readonly InterviewStatus[];
export type InterviewStatusValue = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_TITLE_MAX = 120;
export const INTERVIEW_TIMEZONE_MAX = 100;
export const INTERVIEW_LOCATION_MAX = 300;
export const INTERVIEW_MEETING_URL_MAX = 1000;
export const INTERVIEW_INSTRUCTIONS_MAX = 3000;

/** New schedules must start at least this many minutes after server time. */
export const INTERVIEW_MIN_LEAD_MINUTES = 10;
/** New schedules cannot start more than this many days ahead. */
export const INTERVIEW_MAX_FUTURE_DAYS = 365;
export const INTERVIEW_MIN_DURATION_MINUTES = 15;
export const INTERVIEW_MAX_DURATION_MINUTES = 8 * 60;

/**
 * An ACCEPTED interview may be marked completed once its start time is no
 * more than this far in the future — a small allowance for clock skew between
 * the interviewer's device and the server.
 */
export const INTERVIEW_COMPLETE_CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Statuses that occupy a time slot and therefore block conflicting schedules. */
export const ACTIVE_INTERVIEW_STATUSES = [
  "PENDING_RESPONSE",
  "ACCEPTED",
] as const satisfies readonly InterviewStatus[];

/** Terminal statuses: no transition of any kind may leave them. */
export const TERMINAL_INTERVIEW_STATUSES = [
  "CANCELED",
  "COMPLETED",
] as const satisfies readonly InterviewStatus[];

/** Statuses a Recruiter OWNER may reschedule from. */
export const RESCHEDULABLE_INTERVIEW_STATUSES = [
  "PENDING_RESPONSE",
  "ACCEPTED",
  "DECLINED",
] as const satisfies readonly InterviewStatus[];

/** Statuses a Recruiter OWNER may cancel from (same set as reschedule). */
export const CANCELABLE_INTERVIEW_STATUSES = RESCHEDULABLE_INTERVIEW_STATUSES;

export function isActiveInterviewStatus(status: InterviewStatusValue): boolean {
  return (
    ACTIVE_INTERVIEW_STATUSES as readonly InterviewStatusValue[]
  ).includes(status);
}

export function isTerminalInterviewStatus(
  status: InterviewStatusValue,
): boolean {
  return (
    TERMINAL_INTERVIEW_STATUSES as readonly InterviewStatusValue[]
  ).includes(status);
}

/** The Candidate may answer only a not-yet-answered, non-terminal interview. */
export function canCandidateRespondToInterview(
  status: InterviewStatusValue,
): boolean {
  return status === "PENDING_RESPONSE";
}

/**
 * The two statuses a Candidate response may produce. The server maps each
 * explicit accept/decline operation to one of these — the browser never
 * submits a status value.
 */
export const INTERVIEW_RESPONSES = [
  "ACCEPTED",
  "DECLINED",
] as const satisfies readonly InterviewStatus[];
export type InterviewResponseValue = (typeof INTERVIEW_RESPONSES)[number];

/** Past-tense verbs for response event copy ("accepted"/"declined"). */
export const interviewResponseWords: Record<InterviewResponseValue, string> = {
  ACCEPTED: "accepted",
  DECLINED: "declined",
};

export function canRecruiterRescheduleInterview(
  status: InterviewStatusValue,
): boolean {
  return (
    RESCHEDULABLE_INTERVIEW_STATUSES as readonly InterviewStatusValue[]
  ).includes(status);
}

export function canRecruiterCancelInterview(
  status: InterviewStatusValue,
): boolean {
  return (
    CANCELABLE_INTERVIEW_STATUSES as readonly InterviewStatusValue[]
  ).includes(status);
}

/**
 * Completion is allowed only for an ACCEPTED interview whose start time is not
 * substantially in the future (a small clock-skew tolerance is permitted).
 */
export function canRecruiterCompleteInterview(
  status: InterviewStatusValue,
  startAt: Date,
  now: Date,
): boolean {
  return (
    status === "ACCEPTED" &&
    startAt.getTime() <= now.getTime() + INTERVIEW_COMPLETE_CLOCK_TOLERANCE_MS
  );
}

// ---------------------------------------------------------------------------
// Application eligibility
// ---------------------------------------------------------------------------

/**
 * Interviews may be scheduled or rescheduled only while the Application is
 * active. Interview scheduling and Application status remain separate,
 * independently controlled workflows: scheduling never mutates the
 * Application status and terminal Applications keep their Interview history.
 */
export const INTERVIEW_ELIGIBLE_APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
] as const;

export function isApplicationEligibleForInterview(status: string): boolean {
  return (
    INTERVIEW_ELIGIBLE_APPLICATION_STATUSES as readonly string[]
  ).includes(status);
}

// ---------------------------------------------------------------------------
// Conflict detection
// ---------------------------------------------------------------------------

/**
 * Half-open overlap: two ranges conflict when each starts before the other
 * ends. Back-to-back interviews (`existing.endAt === proposed.startAt`) never
 * conflict.
 */
export function interviewRangesOverlap(
  aStartAt: Date,
  aEndAt: Date,
  bStartAt: Date,
  bEndAt: Date,
): boolean {
  return (
    aStartAt.getTime() < bEndAt.getTime() &&
    aEndAt.getTime() > bStartAt.getTime()
  );
}

// Fixed conflict copy. Deliberately reveals nothing about the conflicting
// interview — no id, Company, Candidate, or Job.
export const CANDIDATE_INTERVIEW_CONFLICT_MESSAGE =
  "The candidate already has another interview during this time.";
export const ORGANIZER_INTERVIEW_CONFLICT_MESSAGE =
  "You already have another interview during this time.";

// ---------------------------------------------------------------------------
// Optimistic concurrency
// ---------------------------------------------------------------------------

export const STALE_INTERVIEW_MESSAGE =
  "This interview changed. Refresh and try again.";

/** `expectedVersion` is a concurrency token only — never authorization. */
export function isStaleInterviewVersion(
  currentVersion: number,
  expectedVersion: number,
): boolean {
  return currentVersion !== expectedVersion;
}

// ---------------------------------------------------------------------------
// Timezone behavior (UTC storage + IANA display)
// ---------------------------------------------------------------------------

// Region/City IANA identifiers (plus the UTC alias). Raw offsets ("+05:00"),
// bare abbreviations ("EST"), and anything Intl cannot resolve are rejected so
// stored zones always carry real daylight-saving rules.
const IANA_TIMEZONE_PATTERN = /^[A-Za-z0-9_+\-/]+$/;

export function isValidIanaTimeZone(value: string): boolean {
  if (
    !value ||
    value.length > INTERVIEW_TIMEZONE_MAX ||
    !IANA_TIMEZONE_PATTERN.test(value) ||
    (!value.includes("/") && value !== "UTC")
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Offset (ms) that `timeZone` applies to `instant`, from the IANA database. */
function getTimeZoneOffsetMs(timeZone: string, instant: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const zonedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return zonedAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock time ("YYYY-MM-DDTHH:mm") read in `timeZone` to the
 * UTC instant, using a two-pass offset correction so times on either side of
 * a daylight-saving transition resolve through the IANA rules. Returns null
 * for malformed wall times, impossible dates, or invalid zones. Used by the
 * schedule form; the server always re-validates the resulting instant and the
 * zone independently.
 */
export function zonedWallTimeToUtcInstant(
  wallDateTime: string,
  timeZone: string,
): Date | null {
  const match = WALL_TIME_PATTERN.exec(wallDateTime);
  if (!match || !isValidIanaTimeZone(timeZone)) return null;
  const [, year, month, day, hour, minute] = match.map(Number);

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const check = new Date(utcGuess);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const firstOffset = getTimeZoneOffsetMs(timeZone, check);
  const secondOffset = getTimeZoneOffsetMs(
    timeZone,
    new Date(utcGuess - firstOffset),
  );
  return new Date(utcGuess - secondOffset);
}

/**
 * Renders a UTC instant as the wall-clock date and time shown in `timeZone`,
 * shaped for `<input type="date">` / `<input type="time">` prefills. The
 * inverse of `zonedWallTimeToUtcInstant` for representable times.
 */
export function utcInstantToZonedWall(
  value: Date,
  timeZone: string,
): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(value)
      .map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

/** Short zone label (e.g. "EDT", "GMT+3") for the instant, DST-aware. */
export function getTimeZoneAbbreviation(value: Date, timeZone: string): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(value)
    .find((entry) => entry.type === "timeZoneName");
  return part?.value ?? timeZone;
}

function formatZonedDate(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatZonedTime(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

/** "Mon, Jul 20, 2026" in the interview's stored zone. */
export function formatInterviewDate(value: Date, timeZone: string): string {
  return formatZonedDate(value, timeZone);
}

/** "2:00 PM" in the interview's stored zone. */
export function formatInterviewTime(value: Date, timeZone: string): string {
  return formatZonedTime(value, timeZone);
}

/**
 * Full schedule line, always rendered in the stored IANA zone with its
 * DST-aware abbreviation, e.g. "Mon, Jul 20, 2026 · 2:00 PM – 3:00 PM EDT".
 * Ranges that cross midnight in the zone repeat the end date.
 */
export function formatInterviewRange(
  startAt: Date,
  endAt: Date,
  timeZone: string,
): string {
  const startDate = formatZonedDate(startAt, timeZone);
  const endDate = formatZonedDate(endAt, timeZone);
  const zone = getTimeZoneAbbreviation(startAt, timeZone);
  const end =
    startDate === endDate
      ? formatZonedTime(endAt, timeZone)
      : `${endDate}, ${formatZonedTime(endAt, timeZone)}`;
  return `${startDate} · ${formatZonedTime(startAt, timeZone)} – ${end} ${zone}`;
}

/** "45 min", "1 hr", "1 hr 30 min". */
export function formatInterviewDuration(startAt: Date, endAt: Date): string {
  const totalMinutes = Math.round(
    (endAt.getTime() - startAt.getTime()) / 60_000,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------

export const interviewFormatLabels: Record<InterviewFormat, string> = {
  VIDEO: "Video call",
  PHONE: "Phone call",
  ONSITE: "Onsite",
  OTHER: "Other",
};

export const interviewStatusLabels: Record<InterviewStatus, string> = {
  PENDING_RESPONSE: "Awaiting response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CANCELED: "Canceled",
  COMPLETED: "Completed",
};

export const interviewEventTypeLabels: Record<InterviewEventType, string> = {
  CREATED: "Interview scheduled",
  ACCEPTED: "Accepted by candidate",
  DECLINED: "Declined by candidate",
  RESCHEDULED: "Interview rescheduled",
  CANCELED: "Interview canceled",
  COMPLETED: "Marked completed",
};

/** Shown in history rows whose acting user account was removed. */
export const INTERVIEW_ACTOR_REMOVED_FALLBACK = "Account removed";

// ---------------------------------------------------------------------------
// Agenda range filter (URL query parameter)
// ---------------------------------------------------------------------------

export const INTERVIEW_RANGE_FILTERS = ["UPCOMING", "PAST", "ALL"] as const;
export type InterviewRangeFilter = (typeof INTERVIEW_RANGE_FILTERS)[number];

export function parseInterviewRangeFilter(
  value: string | string[] | undefined,
): InterviewRangeFilter {
  const candidate = (Array.isArray(value) ? value[0] : value)?.toUpperCase();
  return (INTERVIEW_RANGE_FILTERS as readonly string[]).includes(
    candidate ?? "",
  )
    ? (candidate as InterviewRangeFilter)
    : "ALL";
}

/** An interview stays "upcoming" until its end time passes. */
export function isUpcomingInterview(endAt: Date, now: Date): boolean {
  return endAt.getTime() >= now.getTime();
}
