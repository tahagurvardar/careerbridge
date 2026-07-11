export type CandidateDashboardRecommendationInput = {
  profileComplete: boolean;
  savedJobCount: number;
  savedOpenUnappliedCount: number;
  activeApplicationCount: number;
};

export type CandidateDashboardRecommendation = {
  label: string;
  description: string;
  href: string;
};

export function getCandidateDashboardRecommendation({
  profileComplete,
  savedJobCount,
  savedOpenUnappliedCount,
  activeApplicationCount,
}: CandidateDashboardRecommendationInput): CandidateDashboardRecommendation {
  if (!profileComplete) {
    return {
      label: "Complete your profile",
      description:
        "Finish your candidate profile before your next application.",
      href: "/candidate/profile/edit",
    };
  }

  if (savedOpenUnappliedCount > 0) {
    return {
      label: "Review saved jobs",
      description: `You have ${savedOpenUnappliedCount} open saved ${savedOpenUnappliedCount === 1 ? "job" : "jobs"} you have not applied to yet.`,
      href: "/candidate/saved-jobs?availability=OPEN",
    };
  }

  if (activeApplicationCount > 0) {
    return {
      label: "Track active applications",
      description: "Check the latest status of your active applications.",
      href: "/candidate/applications",
    };
  }

  if (savedJobCount === 0) {
    return {
      label: "Find jobs to save",
      description:
        "Browse open roles and save promising opportunities for later.",
      href: "/jobs",
    };
  }

  return {
    label: "Find your next role",
    description: "Explore newly published jobs that match your goals.",
    href: "/jobs",
  };
}
