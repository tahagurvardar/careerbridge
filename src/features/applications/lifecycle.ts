import type { ApplicationStatusValue } from "@/features/applications/schemas";

export const ACTIVE_APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
] as const;

export const TERMINAL_APPLICATION_STATUSES = [
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const;

/**
 * Recruiter-controlled forward transitions. This table is the single source of
 * truth; a status is never accepted from browser input. WITHDRAWN never appears
 * as a destination because only the Candidate may withdraw.
 */
const RECRUITER_TRANSITIONS: Record<
  ApplicationStatusValue,
  readonly ApplicationStatusValue[]
> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["INTERVIEW", "REJECTED"],
  INTERVIEW: ["OFFER", "REJECTED"],
  OFFER: ["HIRED", "REJECTED"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

const CANDIDATE_WITHDRAWABLE_STATUSES: readonly ApplicationStatusValue[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
];

export function getAllowedRecruiterTransitions(
  status: ApplicationStatusValue,
): readonly ApplicationStatusValue[] {
  return RECRUITER_TRANSITIONS[status];
}

export function canRecruiterTransitionApplication(
  from: ApplicationStatusValue,
  to: ApplicationStatusValue,
): boolean {
  // A recruiter may never set WITHDRAWN, even if some future table listed it.
  if (to === "WITHDRAWN") return false;
  return RECRUITER_TRANSITIONS[from].includes(to);
}

export function canCandidateWithdrawApplication(
  status: ApplicationStatusValue,
): boolean {
  return CANDIDATE_WITHDRAWABLE_STATUSES.includes(status);
}

export function isActiveApplicationStatus(
  status: ApplicationStatusValue,
): boolean {
  return (
    ACTIVE_APPLICATION_STATUSES as readonly ApplicationStatusValue[]
  ).includes(status);
}

export function isTerminalApplicationStatus(
  status: ApplicationStatusValue,
): boolean {
  return (
    TERMINAL_APPLICATION_STATUSES as readonly ApplicationStatusValue[]
  ).includes(status);
}
