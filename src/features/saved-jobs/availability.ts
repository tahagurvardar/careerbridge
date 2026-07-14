import type { JobStatus } from "@/generated/prisma/client";

export type SavedJobAvailabilityInput = {
  status: JobStatus;
  companyIsPublished: boolean;
  moderationStatus?: "VISIBLE" | "HIDDEN";
  companyModerationStatus?: "VISIBLE" | "HIDDEN";
};

export function isSavedJobOpen({
  status,
  companyIsPublished,
  moderationStatus = "VISIBLE",
  companyModerationStatus = "VISIBLE",
}: SavedJobAvailabilityInput) {
  return (
    status === "PUBLISHED" &&
    moderationStatus === "VISIBLE" &&
    companyIsPublished &&
    companyModerationStatus === "VISIBLE"
  );
}

export function classifySavedJobAvailability(input: SavedJobAvailabilityInput) {
  return isSavedJobOpen(input) ? ("OPEN" as const) : ("UNAVAILABLE" as const);
}
