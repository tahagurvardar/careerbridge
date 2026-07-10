import { describe, expect, it } from "vitest";

import {
  calculateProfileCompletion,
  getCompletionFromProfile,
} from "@/features/candidate-profile/completion";

describe("profile completion", () => {
  it("returns zero and every recommendation for an empty profile", () => {
    const result = getCompletionFromProfile(null);

    expect(result.percentage).toBe(0);
    expect(result.incomplete.map((item) => item.key)).toEqual([
      "headline",
      "location",
      "bio",
      "skills",
      "education",
      "experience",
      "professionalLink",
    ]);
  });

  it("applies the documented 15-point and 10-point weights", () => {
    expect(
      calculateProfileCompletion({
        headline: true,
        location: false,
        bio: true,
        skills: false,
        education: true,
        experience: false,
        professionalLink: true,
      }).percentage,
    ).toBe(55);
  });

  it("returns 100 with no incomplete sections for a complete profile", () => {
    const result = calculateProfileCompletion({
      headline: true,
      location: true,
      bio: true,
      skills: true,
      education: true,
      experience: true,
      professionalLink: true,
    });

    expect(result).toEqual({ percentage: 100, incomplete: [] });
  });

  it("is deterministic for the same signals", () => {
    const signals = {
      headline: true,
      location: true,
      bio: false,
      skills: false,
      education: true,
      experience: false,
      professionalLink: false,
    };

    expect(calculateProfileCompletion(signals)).toEqual(
      calculateProfileCompletion(signals),
    );
  });
});
