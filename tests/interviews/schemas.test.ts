import { describe, expect, it } from "vitest";

import {
  buildInterviewScheduleSchema,
  expectedVersionSchema,
  isSafeMeetingUrl,
} from "@/features/interviews/schemas";

const NOW = new Date("2026-07-13T12:00:00Z");

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Technical interview",
    format: "VIDEO",
    startAt: "2026-07-20T14:00:00.000Z",
    endAt: "2026-07-20T15:00:00.000Z",
    timeZone: "Europe/Istanbul",
    location: "",
    meetingUrl: "https://meet.example.test/room",
    instructions: "",
    ...overrides,
  };
}

function parse(overrides: Record<string, unknown> = {}) {
  return buildInterviewScheduleSchema(NOW).safeParse(baseInput(overrides));
}

function firstIssuePath(result: ReturnType<typeof parse>) {
  return result.success ? null : result.error.issues[0]?.path.join(".");
}

describe("interview schedule schema", () => {
  it("accepts a valid schedule and normalizes values", () => {
    const result = parse({
      title: "  Technical interview  ",
      location: "   ",
      instructions: "",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe("Technical interview");
    expect(result.data.startAt).toEqual(new Date("2026-07-20T14:00:00.000Z"));
    expect(result.data.endAt).toEqual(new Date("2026-07-20T15:00:00.000Z"));
    expect(result.data.location).toBeNull();
    expect(result.data.instructions).toBeNull();
    expect(result.data.meetingUrl).toBe("https://meet.example.test/room");
  });

  it("strips unknown fields so nothing can be mass-assigned", () => {
    const result = buildInterviewScheduleSchema(NOW).safeParse({
      ...baseInput(),
      status: "COMPLETED",
      organizerUserId: "attacker",
      version: 99,
      candidateId: "someone-else",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).not.toHaveProperty("status");
    expect(result.data).not.toHaveProperty("organizerUserId");
    expect(result.data).not.toHaveProperty("version");
    expect(result.data).not.toHaveProperty("candidateId");
  });

  it("requires a bounded title", () => {
    expect(parse({ title: "   " }).success).toBe(false);
    expect(parse({ title: "x".repeat(121) }).success).toBe(false);
    expect(parse({ title: "x".repeat(120) }).success).toBe(true);
  });

  it("requires ISO instants with an explicit zone designator", () => {
    expect(parse({ startAt: "2026-07-20 14:00" }).success).toBe(false);
    // A bare wall-clock string must never be reinterpreted server-side.
    expect(parse({ startAt: "2026-07-20T14:00:00" }).success).toBe(false);
    expect(parse({ startAt: "not-a-date" }).success).toBe(false);
    expect(
      parse({
        startAt: "2026-07-20T17:00:00+03:00",
        endAt: "2026-07-20T18:00:00+03:00",
      }).success,
    ).toBe(true);
  });

  it("enforces the future lead time and the one-year horizon", () => {
    // 9 minutes ahead: below the 10-minute lead.
    const tooSoon = parse({
      startAt: "2026-07-13T12:09:00.000Z",
      endAt: "2026-07-13T13:09:00.000Z",
    });
    expect(tooSoon.success).toBe(false);
    expect(firstIssuePath(tooSoon)).toBe("startAt");

    const past = parse({
      startAt: "2026-07-13T11:00:00.000Z",
      endAt: "2026-07-13T12:30:00.000Z",
    });
    expect(past.success).toBe(false);

    // Exactly the 10-minute lead is allowed.
    expect(
      parse({
        startAt: "2026-07-13T12:10:00.000Z",
        endAt: "2026-07-13T13:10:00.000Z",
      }).success,
    ).toBe(true);

    const tooFar = parse({
      startAt: "2027-07-14T12:00:00.000Z",
      endAt: "2027-07-14T13:00:00.000Z",
    });
    expect(tooFar.success).toBe(false);
    expect(firstIssuePath(tooFar)).toBe("startAt");
  });

  it("enforces ordering and the 15-minute to 8-hour duration window", () => {
    const backwards = parse({ endAt: "2026-07-20T13:00:00.000Z" });
    expect(backwards.success).toBe(false);
    expect(firstIssuePath(backwards)).toBe("endAt");

    expect(parse({ endAt: "2026-07-20T14:00:00.000Z" }).success).toBe(false);
    expect(parse({ endAt: "2026-07-20T14:14:00.000Z" }).success).toBe(false);
    expect(parse({ endAt: "2026-07-20T14:15:00.000Z" }).success).toBe(true);
    expect(parse({ endAt: "2026-07-20T22:00:00.000Z" }).success).toBe(true);
    expect(parse({ endAt: "2026-07-20T22:01:00.000Z" }).success).toBe(false);
  });

  it("requires a valid IANA timezone", () => {
    expect(parse({ timeZone: "" }).success).toBe(false);
    expect(parse({ timeZone: "EST" }).success).toBe(false);
    expect(parse({ timeZone: "+03:00" }).success).toBe(false);
    expect(parse({ timeZone: "Not/AZone" }).success).toBe(false);
    expect(parse({ timeZone: "UTC" }).success).toBe(true);
  });

  it("enforces format-specific requirements", () => {
    // VIDEO requires an HTTPS meeting link.
    const videoMissing = parse({ meetingUrl: "" });
    expect(videoMissing.success).toBe(false);
    expect(firstIssuePath(videoMissing)).toBe("meetingUrl");

    // ONSITE requires a location; the link is optional.
    expect(
      parse({ format: "ONSITE", meetingUrl: "", location: "" }).success,
    ).toBe(false);
    expect(
      parse({ format: "ONSITE", meetingUrl: "", location: "HQ, Floor 4" })
        .success,
    ).toBe(true);

    // PHONE must not carry a meeting link.
    const phoneWithUrl = parse({ format: "PHONE" });
    expect(phoneWithUrl.success).toBe(false);
    expect(firstIssuePath(phoneWithUrl)).toBe("meetingUrl");
    expect(
      parse({
        format: "PHONE",
        meetingUrl: "",
        instructions: "We call the number from your application.",
      }).success,
    ).toBe(true);
    expect(parse({ format: "PHONE", meetingUrl: "" }).success).toBe(true);

    // OTHER needs at least one attendance detail.
    expect(
      parse({
        format: "OTHER",
        meetingUrl: "",
        location: "",
        instructions: "",
      }).success,
    ).toBe(false);
    expect(
      parse({
        format: "OTHER",
        meetingUrl: "",
        location: "",
        instructions: "Take-home exercise sent separately.",
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe meeting links", () => {
    for (const unsafe of [
      "http://meet.example.test/room",
      "javascript:alert(1)",
      "data:text/html,hello",
      "mailto:recruiter@example.test",
      "//meet.example.test/room",
      "meet.example.test/room",
      "https://user:secret@meet.example.test/room",
      `https://meet.example.test/${"a".repeat(1001)}`,
    ]) {
      const result = parse({ meetingUrl: unsafe });
      expect(result.success, `expected rejection for ${unsafe}`).toBe(false);
    }
  });

  it("bounds optional text fields", () => {
    expect(
      parse({ format: "ONSITE", meetingUrl: "", location: "x".repeat(301) })
        .success,
    ).toBe(false);
    expect(parse({ instructions: "x".repeat(3001) }).success).toBe(false);
    expect(parse({ instructions: "x".repeat(3000) }).success).toBe(true);
  });
});

describe("safe meeting URL helper", () => {
  it("accepts only clean absolute HTTPS URLs", () => {
    expect(isSafeMeetingUrl("https://meet.example.test/room?pin=1")).toBe(true);
    expect(isSafeMeetingUrl("https://meet.example.test")).toBe(true);
    expect(isSafeMeetingUrl("HTTPS://MEET.EXAMPLE.TEST/room")).toBe(true);
  });

  it("rejects other schemes, credentials, and whitespace", () => {
    expect(isSafeMeetingUrl("http://meet.example.test")).toBe(false);
    expect(isSafeMeetingUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMeetingUrl("data:text/html,x")).toBe(false);
    expect(isSafeMeetingUrl("mailto:a@example.test")).toBe(false);
    expect(isSafeMeetingUrl("//meet.example.test")).toBe(false);
    expect(isSafeMeetingUrl("https://user:pass@meet.example.test")).toBe(false);
    expect(isSafeMeetingUrl("https://meet.example.test/a b")).toBe(false);
    expect(isSafeMeetingUrl("")).toBe(false);
  });
});

describe("expected version token", () => {
  it("accepts only positive integers", () => {
    expect(expectedVersionSchema.safeParse(1).success).toBe(true);
    expect(expectedVersionSchema.safeParse(42).success).toBe(true);
    expect(expectedVersionSchema.safeParse(0).success).toBe(false);
    expect(expectedVersionSchema.safeParse(-1).success).toBe(false);
    expect(expectedVersionSchema.safeParse(1.5).success).toBe(false);
    expect(expectedVersionSchema.safeParse("1").success).toBe(false);
    expect(expectedVersionSchema.safeParse(null).success).toBe(false);
    expect(expectedVersionSchema.safeParse(2 ** 31).success).toBe(false);
  });
});
