import type { JobStatus } from "@/generated/prisma/client";

export type SavedJobAvailabilityInput = {
  status: JobStatus;
  companyIsPublished: boolean;
};

export function isSavedJobOpen({
  status,
  companyIsPublished,
}: SavedJobAvailabilityInput) {
  return status === "PUBLISHED" && companyIsPublished;
}

export function classifySavedJobAvailability(input: SavedJobAvailabilityInput) {
  return isSavedJobOpen(input) ? ("OPEN" as const) : ("UNAVAILABLE" as const);
}
