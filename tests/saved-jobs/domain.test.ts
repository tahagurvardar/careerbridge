import { describe, expect, it } from "vitest";

import {
  classifySavedJobAvailability,
  isSavedJobOpen,
} from "@/features/saved-jobs/availability";
import { isJobSaveEligible } from "@/features/saved-jobs/eligibility";

describe("saved job domain rules", () => {
  it("classifies only public jobs under public companies as open", () => {
    expect(
      isSavedJobOpen({ status: "PUBLISHED", companyIsPublished: true }),
    ).toBe(true);

    for (const status of ["DRAFT", "CLOSED", "ARCHIVED"] as const) {
      expect(
        classifySavedJobAvailability({
          status,
          companyIsPublished: true,
        }),
      ).toBe("UNAVAILABLE");
    }
    expect(
      classifySavedJobAvailability({
        status: "PUBLISHED",
        companyIsPublished: false,
      }),
    ).toBe("UNAVAILABLE");
  });

  it("allows new saves only for candidates and public jobs", () => {
    expect(
      isJobSaveEligible({
        role: "CANDIDATE",
        jobStatus: "PUBLISHED",
        companyIsPublished: true,
      }),
    ).toBe(true);

    for (const role of ["RECRUITER", "ADMIN"] as const) {
      expect(
        isJobSaveEligible({
          role,
          jobStatus: "PUBLISHED",
          companyIsPublished: true,
        }),
      ).toBe(false);
    }
    for (const jobStatus of ["DRAFT", "CLOSED", "ARCHIVED"] as const) {
      expect(
        isJobSaveEligible({
          role: "CANDIDATE",
          jobStatus,
          companyIsPublished: true,
        }),
      ).toBe(false);
    }
    expect(
      isJobSaveEligible({
        role: "CANDIDATE",
        jobStatus: "PUBLISHED",
        companyIsPublished: false,
      }),
    ).toBe(false);
  });
});
