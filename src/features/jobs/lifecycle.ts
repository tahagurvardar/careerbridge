import type { JobStatusValue } from "@/features/jobs/schemas";

export const JOB_LIFECYCLE_ACTIONS = ["publish", "close", "archive"] as const;
export type JobLifecycleAction = (typeof JOB_LIFECYCLE_ACTIONS)[number];

/**
 * The single source of truth for allowed lifecycle transitions. Every mutation
 * validates against this table so a status can never be set from form input.
 */
const ALLOWED_ACTIONS: Record<JobStatusValue, readonly JobLifecycleAction[]> = {
  DRAFT: ["publish", "archive"],
  PUBLISHED: ["close", "archive"],
  CLOSED: ["archive"],
  ARCHIVED: [],
};

const EDITABLE_STATUSES: readonly JobStatusValue[] = ["DRAFT", "PUBLISHED"];

export function allowedJobActions(
  status: JobStatusValue,
): readonly JobLifecycleAction[] {
  return ALLOWED_ACTIONS[status];
}

export function canTransitionJob(
  status: JobStatusValue,
  action: JobLifecycleAction,
): boolean {
  return ALLOWED_ACTIONS[status].includes(action);
}

export function canEditJob(status: JobStatusValue): boolean {
  return EDITABLE_STATUSES.includes(status);
}

export function nextJobStatus(action: JobLifecycleAction): JobStatusValue {
  switch (action) {
    case "publish":
      return "PUBLISHED";
    case "close":
      return "CLOSED";
    case "archive":
      return "ARCHIVED";
  }
}
