import { describe, expect, it } from "vitest";

import {
  parseAdminAnalyticsSearch,
  parseCandidateAnalyticsSearch,
  parseRecruiterAnalyticsSearch,
} from "@/features/analytics/schemas";

describe("analytics URL schemas", () => {
  it("defaults Admin and Candidate analytics to 90D", () => {
    expect(parseAdminAnalyticsSearch({})).toEqual({ range: "90D" });
    expect(parseCandidateAnalyticsSearch({})).toEqual({ range: "90D" });
  });

  it.each(["30D", "90D", "180D", "365D", "ALL"] as const)(
    "accepts %s",
    (range) => {
      expect(parseAdminAnalyticsSearch({ range })).toEqual({ range });
    },
  );

  it("falls back safely for invalid ranges and array input", () => {
    expect(parseAdminAnalyticsSearch({ range: "7D" })).toEqual({
      range: "90D",
    });
    expect(parseCandidateAnalyticsSearch({ range: ["ALL", "30D"] })).toEqual({
      range: "ALL",
    });
  });

  it("normalizes Recruiter Company and Job filters", () => {
    expect(
      parseRecruiterAnalyticsSearch({
        range: "30D",
        companyId: " company-1 ",
        jobId: ["job-1", "job-2"],
      }),
    ).toEqual({ range: "30D", companyId: "company-1", jobId: "job-1" });
  });

  it("strips unknown fields from every role schema", () => {
    expect(
      parseAdminAnalyticsSearch({ range: "90D", candidateId: "forbidden" }),
    ).toEqual({ range: "90D" });
    expect(
      parseRecruiterAnalyticsSearch({
        range: "ALL",
        companyId: "company-1",
        jobId: "",
        isOwner: "true",
        startAt: "2000-01-01",
      }),
    ).toEqual({ range: "ALL", companyId: "company-1", jobId: "" });
    expect(
      parseCandidateAnalyticsSearch({ range: "365D", candidateId: "other" }),
    ).toEqual({ range: "365D" });
  });

  it("bounds invalid or oversized Recruiter identifiers", () => {
    expect(
      parseRecruiterAnalyticsSearch({
        companyId: "x".repeat(129),
        jobId: 12 as never,
      }),
    ).toEqual({ range: "90D", companyId: "", jobId: "" });
  });
});
