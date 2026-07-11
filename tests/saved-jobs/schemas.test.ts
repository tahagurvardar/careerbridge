import { describe, expect, it } from "vitest";

import {
  hasActiveSavedJobFilters,
  parseSavedJobSearch,
  savedJobAvailabilitySchema,
  savedJobSearchTextSchema,
} from "@/features/saved-jobs/schemas";

describe("saved job search validation", () => {
  it("trims and bounds search text", () => {
    expect(savedJobSearchTextSchema.parse("  React  ")).toBe("React");
    expect(savedJobSearchTextSchema.parse("x".repeat(101))).toBe("");
  });

  it("accepts only known availability filters", () => {
    expect(savedJobAvailabilitySchema.safeParse("ALL").success).toBe(true);
    expect(savedJobAvailabilitySchema.safeParse("OPEN").success).toBe(true);
    expect(savedJobAvailabilitySchema.safeParse("UNAVAILABLE").success).toBe(
      true,
    );
    expect(savedJobAvailabilitySchema.safeParse("PRIVATE").success).toBe(false);
  });

  it("normalizes URL params and ignores unknown fields", () => {
    expect(
      parseSavedJobSearch({
        q: ["  TypeScript ", "ignored"],
        availability: "OPEN",
        candidateId: "browser-controlled",
      }),
    ).toEqual({ q: "TypeScript", availability: "OPEN" });

    expect(
      parseSavedJobSearch({ q: undefined, availability: "invalid" }),
    ).toEqual({ q: "", availability: "ALL" });
  });

  it("detects active filters", () => {
    expect(hasActiveSavedJobFilters({ q: "", availability: "ALL" })).toBe(
      false,
    );
    expect(hasActiveSavedJobFilters({ q: "React", availability: "ALL" })).toBe(
      true,
    );
    expect(hasActiveSavedJobFilters({ q: "", availability: "OPEN" })).toBe(
      true,
    );
  });
});
