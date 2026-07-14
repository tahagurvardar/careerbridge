import { isPastCalendarDate } from "@/features/jobs/schemas";

/**
 * The explicit minimum Candidate profile required to apply. These are concrete
 * required fields, not an arbitrary completion percentage.
 */
export const CANDIDATE_APPLY_REQUIREMENTS = [
  ["headline", "Professional headline"],
  ["location", "Location"],
  ["skills", "At least one skill"],
] as const;

export type CandidateApplyRequirement =
  (typeof CANDIDATE_APPLY_REQUIREMENTS)[number][0];

export interface CandidateProfileEligibilityInput {
  headline: string | null;
  location: string | null;
  skillCount: number;
}

export interface CandidateProfileReadiness {
  isReady: boolean;
  missingFields: { field: CandidateApplyRequirement; label: string }[];
}

export function getCandidateProfileReadiness({
  headline,
  location,
  skillCount,
}: CandidateProfileEligibilityInput): CandidateProfileReadiness {
  const missingFields: CandidateProfileReadiness["missingFields"] = [];

  if (!headline || !headline.trim()) {
    missingFields.push({ field: "headline", label: "Professional headline" });
  }
  if (!location || !location.trim()) {
    missingFields.push({ field: "location", label: "Location" });
  }
  if (skillCount < 1) {
    missingFields.push({ field: "skills", label: "At least one skill" });
  }

  return { isReady: missingFields.length === 0, missingFields };
}

/**
 * A job with no deadline is always open. A dated deadline is compared in UTC so
 * timezone offsets never shift the day; the deadline day itself is still open.
 */
export function isApplicationDeadlinePassed(
  deadline: Date | null,
  now = new Date(),
): boolean {
  if (!deadline) return false;
  return isPastCalendarDate(deadline.toISOString().slice(0, 10), now);
}
