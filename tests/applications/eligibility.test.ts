import { describe, expect, it } from "vitest";

import {
  getCandidateProfileReadiness,
  isApplicationDeadlinePassed,
} from "@/features/applications/eligibility";

describe("Candidate profile eligibility", () => {
  it("is ready with a headline, location, and at least one skill", () => {
    expect(
      getCandidateProfileReadiness({
        headline: "Frontend Engineer",
        location: "Baku",
        skillCount: 1,
      }),
    ).toEqual({ isReady: true, missingFields: [] });
  });

  it("lists every missing requirement in order", () => {
    const readiness = getCandidateProfileReadiness({
      headline: "",
      location: "   ",
      skillCount: 0,
    });
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingFields.map(({ field }) => field)).toEqual([
      "headline",
      "location",
      "skills",
    ]);
  });

  it("treats null and whitespace-only values as missing", () => {
    expect(
      getCandidateProfileReadiness({
        headline: null,
        location: "Baku",
        skillCount: 2,
      }).isReady,
    ).toBe(false);
    expect(
      getCandidateProfileReadiness({
        headline: "Engineer",
        location: "Baku",
        skillCount: 0,
      }).missingFields.map(({ field }) => field),
    ).toEqual(["skills"]);
  });
});

describe("Application deadline eligibility", () => {
  const now = new Date("2026-07-11T12:00:00.000Z");

  it("treats an absent deadline as always open", () => {
    expect(isApplicationDeadlinePassed(null, now)).toBe(false);
  });

  it("keeps future and same-day deadlines open in UTC", () => {
    expect(
      isApplicationDeadlinePassed(new Date("2030-01-01T00:00:00.000Z"), now),
    ).toBe(false);
    expect(
      isApplicationDeadlinePassed(new Date("2026-07-11T00:00:00.000Z"), now),
    ).toBe(false);
  });

  it("marks a past deadline as closed", () => {
    expect(
      isApplicationDeadlinePassed(new Date("2020-01-01T00:00:00.000Z"), now),
    ).toBe(true);
  });
});
