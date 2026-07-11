import { describe, expect, it } from "vitest";

import { getCandidateDashboardRecommendation } from "@/features/saved-jobs/recommendation";

describe("candidate dashboard saved-job recommendation", () => {
  it("prioritizes completing an incomplete profile", () => {
    expect(
      getCandidateDashboardRecommendation({
        profileComplete: false,
        savedJobCount: 2,
        savedOpenUnappliedCount: 2,
        activeApplicationCount: 1,
      }).href,
    ).toBe("/candidate/profile/edit");
  });

  it("prioritizes open saved jobs that have not been applied to", () => {
    expect(
      getCandidateDashboardRecommendation({
        profileComplete: true,
        savedJobCount: 2,
        savedOpenUnappliedCount: 1,
        activeApplicationCount: 3,
      }).href,
    ).toBe("/candidate/saved-jobs?availability=OPEN");
  });

  it("then considers active applications and an empty saved list", () => {
    expect(
      getCandidateDashboardRecommendation({
        profileComplete: true,
        savedJobCount: 2,
        savedOpenUnappliedCount: 0,
        activeApplicationCount: 1,
      }).href,
    ).toBe("/candidate/applications");

    expect(
      getCandidateDashboardRecommendation({
        profileComplete: true,
        savedJobCount: 0,
        savedOpenUnappliedCount: 0,
        activeApplicationCount: 0,
      }).href,
    ).toBe("/jobs");
  });
});
