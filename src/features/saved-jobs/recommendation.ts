export type CandidateDashboardRecommendationInput = {
  profileComplete: boolean;
  savedJobCount: number;
  savedOpenUnappliedCount: number;
  activeApplicationCount: number;
};

export type CandidateDashboardRecommendationKey =
  | "completeProfile"
  | "reviewSavedJobs"
  | "trackActiveApplications"
  | "findJobsToSave"
  | "findNextRole";

export type CandidateDashboardRecommendation = {
  key: CandidateDashboardRecommendationKey;
  /** Present for the reviewSavedJobs recommendation's plural copy. */
  count?: number;
  href: string;
};

// Copy is resolved from the candidate dictionary by key at render time, so the
// deterministic decision logic stays locale-free and unit-testable.
export function getCandidateDashboardRecommendation({
  profileComplete,
  savedJobCount,
  savedOpenUnappliedCount,
  activeApplicationCount,
}: CandidateDashboardRecommendationInput): CandidateDashboardRecommendation {
  if (!profileComplete) {
    return { key: "completeProfile", href: "/candidate/profile/edit" };
  }

  if (savedOpenUnappliedCount > 0) {
    return {
      key: "reviewSavedJobs",
      count: savedOpenUnappliedCount,
      href: "/candidate/saved-jobs?availability=OPEN",
    };
  }

  if (activeApplicationCount > 0) {
    return { key: "trackActiveApplications", href: "/candidate/applications" };
  }

  if (savedJobCount === 0) {
    return { key: "findJobsToSave", href: "/jobs" };
  }

  return { key: "findNextRole", href: "/jobs" };
}
