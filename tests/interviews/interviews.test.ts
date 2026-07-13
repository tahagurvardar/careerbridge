import { describe, expect, it } from "vitest";

import {
  ACTIVE_INTERVIEW_STATUSES,
  CANDIDATE_INTERVIEW_CONFLICT_MESSAGE,
  canCandidateRespondToInterview,
  canRecruiterCancelInterview,
  canRecruiterCompleteInterview,
  canRecruiterRescheduleInterview,
  formatInterviewDate,
  formatInterviewDuration,
  formatInterviewRange,
  formatInterviewTime,
  getTimeZoneAbbreviation,
  INTERVIEW_COMPLETE_CLOCK_TOLERANCE_MS,
  INTERVIEW_STATUSES,
  interviewEventTypeLabels,
  interviewFormatLabels,
  interviewRangesOverlap,
  interviewResponseWords,
  interviewStatusLabels,
  isActiveInterviewStatus,
  isApplicationEligibleForInterview,
  isStaleInterviewVersion,
  isTerminalInterviewStatus,
  isUpcomingInterview,
  isValidIanaTimeZone,
  ORGANIZER_INTERVIEW_CONFLICT_MESSAGE,
  parseInterviewRangeFilter,
  STALE_INTERVIEW_MESSAGE,
  utcInstantToZonedWall,
  zonedWallTimeToUtcInstant,
} from "@/features/interviews/interviews";

// Some ICU builds separate time and AM/PM with a narrow no-break space.
const NARROW_SPACE = String.fromCharCode(8239);
function normalize(value: string) {
  return value.replaceAll(NARROW_SPACE, " ");
}

describe("interview lifecycle rules", () => {
  it("lets the candidate respond only to a pending interview", () => {
    expect(canCandidateRespondToInterview("PENDING_RESPONSE")).toBe(true);
    expect(canCandidateRespondToInterview("ACCEPTED")).toBe(false);
    expect(canCandidateRespondToInterview("DECLINED")).toBe(false);
    expect(canCandidateRespondToInterview("CANCELED")).toBe(false);
    expect(canCandidateRespondToInterview("COMPLETED")).toBe(false);
  });

  it("lets the recruiter reschedule and cancel only non-terminal interviews", () => {
    for (const status of [
      "PENDING_RESPONSE",
      "ACCEPTED",
      "DECLINED",
    ] as const) {
      expect(canRecruiterRescheduleInterview(status)).toBe(true);
      expect(canRecruiterCancelInterview(status)).toBe(true);
    }
    for (const status of ["CANCELED", "COMPLETED"] as const) {
      expect(canRecruiterRescheduleInterview(status)).toBe(false);
      expect(canRecruiterCancelInterview(status)).toBe(false);
    }
  });

  it("allows completion only for accepted interviews that have started", () => {
    const now = new Date("2026-07-20T15:00:00Z");
    const started = new Date("2026-07-20T14:00:00Z");
    const nearFuture = new Date(
      now.getTime() + INTERVIEW_COMPLETE_CLOCK_TOLERANCE_MS,
    );
    const farFuture = new Date(
      now.getTime() + INTERVIEW_COMPLETE_CLOCK_TOLERANCE_MS + 1000,
    );

    expect(canRecruiterCompleteInterview("ACCEPTED", started, now)).toBe(true);
    expect(canRecruiterCompleteInterview("ACCEPTED", now, now)).toBe(true);
    // Small documented clock tolerance for near-future starts.
    expect(canRecruiterCompleteInterview("ACCEPTED", nearFuture, now)).toBe(
      true,
    );
    expect(canRecruiterCompleteInterview("ACCEPTED", farFuture, now)).toBe(
      false,
    );
    expect(
      canRecruiterCompleteInterview("PENDING_RESPONSE", started, now),
    ).toBe(false);
    expect(canRecruiterCompleteInterview("DECLINED", started, now)).toBe(false);
    expect(canRecruiterCompleteInterview("CANCELED", started, now)).toBe(false);
    expect(canRecruiterCompleteInterview("COMPLETED", started, now)).toBe(
      false,
    );
  });

  it("classifies terminal and conflict-blocking statuses", () => {
    expect(ACTIVE_INTERVIEW_STATUSES).toEqual(["PENDING_RESPONSE", "ACCEPTED"]);
    expect(isActiveInterviewStatus("PENDING_RESPONSE")).toBe(true);
    expect(isActiveInterviewStatus("ACCEPTED")).toBe(true);
    expect(isActiveInterviewStatus("DECLINED")).toBe(false);
    expect(isTerminalInterviewStatus("CANCELED")).toBe(true);
    expect(isTerminalInterviewStatus("COMPLETED")).toBe(true);
    expect(isTerminalInterviewStatus("DECLINED")).toBe(false);
  });

  it("permits interviews only for active applications", () => {
    for (const status of ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "OFFER"]) {
      expect(isApplicationEligibleForInterview(status)).toBe(true);
    }
    for (const status of ["HIRED", "REJECTED", "WITHDRAWN"]) {
      expect(isApplicationEligibleForInterview(status)).toBe(false);
    }
  });
});

describe("interview conflict detection helpers", () => {
  const start = new Date("2026-07-20T14:00:00Z");
  const end = new Date("2026-07-20T15:00:00Z");

  it("detects overlapping ranges", () => {
    expect(
      interviewRangesOverlap(
        start,
        end,
        new Date("2026-07-20T14:30:00Z"),
        new Date("2026-07-20T15:30:00Z"),
      ),
    ).toBe(true);
    // Containment overlaps in both directions.
    expect(
      interviewRangesOverlap(
        start,
        end,
        new Date("2026-07-20T13:00:00Z"),
        new Date("2026-07-20T16:00:00Z"),
      ),
    ).toBe(true);
  });

  it("does not flag disjoint or exactly adjacent ranges", () => {
    expect(
      interviewRangesOverlap(
        start,
        end,
        new Date("2026-07-20T16:00:00Z"),
        new Date("2026-07-20T17:00:00Z"),
      ),
    ).toBe(false);
    // Back-to-back: existing end === proposed start.
    expect(
      interviewRangesOverlap(start, end, end, new Date("2026-07-20T16:00:00Z")),
    ).toBe(false);
    expect(
      interviewRangesOverlap(end, new Date("2026-07-20T16:00:00Z"), start, end),
    ).toBe(false);
  });

  it("uses fixed conflict copy that reveals nothing about the other interview", () => {
    expect(CANDIDATE_INTERVIEW_CONFLICT_MESSAGE).toBe(
      "The candidate already has another interview during this time.",
    );
    expect(ORGANIZER_INTERVIEW_CONFLICT_MESSAGE).toBe(
      "You already have another interview during this time.",
    );
  });
});

describe("optimistic concurrency helpers", () => {
  it("classifies stale versions", () => {
    expect(isStaleInterviewVersion(1, 1)).toBe(false);
    expect(isStaleInterviewVersion(2, 1)).toBe(true);
    expect(isStaleInterviewVersion(1, 2)).toBe(true);
  });

  it("has fixed stale copy", () => {
    expect(STALE_INTERVIEW_MESSAGE).toBe(
      "This interview changed. Refresh and try again.",
    );
  });
});

describe("IANA timezone validation", () => {
  it("accepts Region/City identifiers and UTC", () => {
    for (const zone of [
      "UTC",
      "America/New_York",
      "Europe/Istanbul",
      "Asia/Baku",
      "Pacific/Auckland",
      "America/Argentina/Buenos_Aires",
    ]) {
      expect(isValidIanaTimeZone(zone)).toBe(true);
    }
  });

  it("rejects offsets, abbreviations, and junk", () => {
    for (const zone of [
      "",
      "EST",
      "GMT",
      "+05:00",
      "UTC+3",
      "Not/AZone",
      "America/Fake_City",
      "javascript:alert(1)",
      "Europe/Istanbul; DROP TABLE interview",
      "A".repeat(101),
    ]) {
      expect(isValidIanaTimeZone(zone)).toBe(false);
    }
  });
});

describe("wall-clock to UTC conversion", () => {
  it("converts UTC wall time directly", () => {
    expect(
      zonedWallTimeToUtcInstant("2026-07-20T14:00", "UTC")?.toISOString(),
    ).toBe("2026-07-20T14:00:00.000Z");
  });

  it("applies standard and daylight offsets from the IANA database", () => {
    // Winter (EST, UTC-5) and summer (EDT, UTC-4) for the same wall time.
    expect(
      zonedWallTimeToUtcInstant(
        "2026-01-20T14:00",
        "America/New_York",
      )?.toISOString(),
    ).toBe("2026-01-20T19:00:00.000Z");
    expect(
      zonedWallTimeToUtcInstant(
        "2026-07-20T14:00",
        "America/New_York",
      )?.toISOString(),
    ).toBe("2026-07-20T18:00:00.000Z");
  });

  it("rejects malformed wall times, impossible dates, and invalid zones", () => {
    expect(zonedWallTimeToUtcInstant("2026-02-30T10:00", "UTC")).toBeNull();
    expect(zonedWallTimeToUtcInstant("2026-07-20", "UTC")).toBeNull();
    expect(zonedWallTimeToUtcInstant("not-a-date", "UTC")).toBeNull();
    expect(
      zonedWallTimeToUtcInstant("2026-07-20T14:00", "Not/AZone"),
    ).toBeNull();
    expect(zonedWallTimeToUtcInstant("2026-07-20T24:30", "UTC")).toBeNull();
  });

  it("round-trips an instant back to the same wall time", () => {
    const instant = zonedWallTimeToUtcInstant(
      "2026-07-20T14:00",
      "Europe/Istanbul",
    );
    expect(instant).not.toBeNull();
    expect(utcInstantToZonedWall(instant as Date, "Europe/Istanbul")).toEqual({
      date: "2026-07-20",
      time: "14:00",
    });
  });
});

describe("interview display formatting", () => {
  const startAt = new Date("2026-07-20T14:00:00Z");
  const endAt = new Date("2026-07-20T15:00:00Z");

  it("renders the stored instant in the stored IANA timezone", () => {
    expect(formatInterviewDate(startAt, "UTC")).toBe("Mon, Jul 20, 2026");
    expect(normalize(formatInterviewTime(startAt, "UTC"))).toBe("2:00 PM");
    // The same instant reads differently — but consistently — per zone.
    expect(normalize(formatInterviewTime(startAt, "America/New_York"))).toBe(
      "10:00 AM",
    );
    expect(normalize(formatInterviewTime(startAt, "Europe/Istanbul"))).toBe(
      "5:00 PM",
    );
  });

  it("renders a full range with a DST-aware zone abbreviation", () => {
    expect(normalize(formatInterviewRange(startAt, endAt, "UTC"))).toBe(
      "Mon, Jul 20, 2026 · 2:00 PM – 3:00 PM UTC",
    );
    expect(
      normalize(formatInterviewRange(startAt, endAt, "America/New_York")),
    ).toBe("Mon, Jul 20, 2026 · 10:00 AM – 11:00 AM EDT");
    // Winter instant resolves to the standard-time abbreviation.
    expect(
      getTimeZoneAbbreviation(
        new Date("2026-01-20T14:00:00Z"),
        "America/New_York",
      ),
    ).toBe("EST");
    expect(getTimeZoneAbbreviation(startAt, "America/New_York")).toBe("EDT");
  });

  it("repeats the end date when a range crosses midnight in its zone", () => {
    const lateStart = new Date("2026-07-20T23:30:00Z");
    const lateEnd = new Date("2026-07-21T00:30:00Z");
    const rendered = normalize(formatInterviewRange(lateStart, lateEnd, "UTC"));
    expect(rendered).toContain("Mon, Jul 20, 2026");
    expect(rendered).toContain("Tue, Jul 21, 2026");
  });

  it("formats durations", () => {
    const base = new Date("2026-07-20T14:00:00Z");
    const plus = (minutes: number) =>
      new Date(base.getTime() + minutes * 60_000);
    expect(formatInterviewDuration(base, plus(45))).toBe("45 min");
    expect(formatInterviewDuration(base, plus(60))).toBe("1 hr");
    expect(formatInterviewDuration(base, plus(90))).toBe("1 hr 30 min");
    expect(formatInterviewDuration(base, plus(480))).toBe("8 hr");
  });

  it("labels every format, status, event type, and response", () => {
    expect(interviewFormatLabels.VIDEO).toBe("Video call");
    expect(interviewFormatLabels.PHONE).toBe("Phone call");
    expect(interviewFormatLabels.ONSITE).toBe("Onsite");
    expect(interviewFormatLabels.OTHER).toBe("Other");
    for (const status of INTERVIEW_STATUSES) {
      expect(interviewStatusLabels[status].length).toBeGreaterThan(0);
    }
    expect(interviewEventTypeLabels.CREATED).toBe("Interview scheduled");
    expect(interviewEventTypeLabels.RESCHEDULED).toBe("Interview rescheduled");
    expect(interviewResponseWords.ACCEPTED).toBe("accepted");
    expect(interviewResponseWords.DECLINED).toBe("declined");
  });
});

describe("agenda range filter", () => {
  it("parses known filters case-insensitively and defaults to ALL", () => {
    expect(parseInterviewRangeFilter("UPCOMING")).toBe("UPCOMING");
    expect(parseInterviewRangeFilter("past")).toBe("PAST");
    expect(parseInterviewRangeFilter(["PAST", "UPCOMING"])).toBe("PAST");
    expect(parseInterviewRangeFilter("junk")).toBe("ALL");
    expect(parseInterviewRangeFilter(undefined)).toBe("ALL");
  });

  it("keeps an interview upcoming until its end time passes", () => {
    const now = new Date("2026-07-20T15:00:00Z");
    expect(isUpcomingInterview(new Date("2026-07-20T15:00:00Z"), now)).toBe(
      true,
    );
    expect(isUpcomingInterview(new Date("2026-07-20T14:59:59Z"), now)).toBe(
      false,
    );
  });
});
