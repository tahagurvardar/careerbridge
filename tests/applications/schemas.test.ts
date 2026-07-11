import { describe, expect, it } from "vitest";

import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  applySchema,
  hasActiveCandidateApplicationFilters,
  hasActiveRecruiterApplicationFilters,
  parseCandidateApplicationSearch,
  parseRecruiterApplicationSearch,
  RECRUITER_TARGET_STATUSES,
  recruiterStatusActionSchema,
} from "@/features/applications/schemas";

describe("Cover letter validation", () => {
  it("trims the cover letter and strips unknown/ownership fields", () => {
    expect(
      applySchema.parse({
        coverLetter: "  Hello team  ",
        candidateId: "browser",
        status: "HIRED",
        submittedAt: "2020-01-01",
      }),
    ).toEqual({ coverLetter: "Hello team" });
  });

  it("accepts an empty cover letter and preserves line breaks", () => {
    expect(applySchema.parse({ coverLetter: "" })).toEqual({ coverLetter: "" });
    expect(applySchema.parse({ coverLetter: "line one\nline two" })).toEqual({
      coverLetter: "line one\nline two",
    });
  });

  it("rejects an overly long cover letter", () => {
    expect(
      applySchema.safeParse({ coverLetter: "x".repeat(6001) }).success,
    ).toBe(false);
  });
});

describe("Application status labels", () => {
  it("labels every status", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(applicationStatusLabels[status]).toBeTruthy();
    }
  });
});

describe("Recruiter status action schema", () => {
  it("accepts recruiter target statuses only", () => {
    for (const status of RECRUITER_TARGET_STATUSES) {
      expect(recruiterStatusActionSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects SUBMITTED, WITHDRAWN, and unknown values", () => {
    expect(recruiterStatusActionSchema.safeParse("SUBMITTED").success).toBe(
      false,
    );
    expect(recruiterStatusActionSchema.safeParse("WITHDRAWN").success).toBe(
      false,
    );
    expect(recruiterStatusActionSchema.safeParse("NONSENSE").success).toBe(
      false,
    );
  });
});

describe("Candidate application search validation", () => {
  it("trims text, validates status, and bounds length", () => {
    expect(
      parseCandidateApplicationSearch({ q: "  React  ", status: "INTERVIEW" }),
    ).toEqual({ q: "React", status: "INTERVIEW" });
    expect(parseCandidateApplicationSearch({ status: "NOPE" })).toEqual({
      q: "",
      status: "",
    });
    expect(parseCandidateApplicationSearch({ q: "x".repeat(101) }).q).toBe("");
    expect(parseCandidateApplicationSearch({ q: ["first", "second"] }).q).toBe(
      "first",
    );
  });

  it("reports whether a filter is active", () => {
    expect(hasActiveCandidateApplicationFilters({ q: "", status: "" })).toBe(
      false,
    );
    expect(
      hasActiveCandidateApplicationFilters({ q: "", status: "OFFER" }),
    ).toBe(true);
  });
});

describe("Recruiter application search validation", () => {
  it("parses every bounded field and validates status", () => {
    expect(
      parseRecruiterApplicationSearch({
        q: "  Ana  ",
        status: "SUBMITTED",
        companyId: "cmp_1",
        jobId: "job_1",
      }),
    ).toEqual({
      q: "Ana",
      status: "SUBMITTED",
      companyId: "cmp_1",
      jobId: "job_1",
    });
    expect(parseRecruiterApplicationSearch({ status: "BAD" }).status).toBe("");
  });

  it("reports whether a filter is active", () => {
    expect(
      hasActiveRecruiterApplicationFilters({
        q: "",
        status: "",
        companyId: "",
        jobId: "",
      }),
    ).toBe(false);
    expect(
      hasActiveRecruiterApplicationFilters({
        q: "",
        status: "",
        companyId: "",
        jobId: "job_1",
      }),
    ).toBe(true);
  });
});
