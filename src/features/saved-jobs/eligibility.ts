import type { JobStatus } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

export function isJobSaveEligible(input: {
  role: PlatformRole;
  jobStatus: JobStatus;
  companyIsPublished: boolean;
}) {
  return (
    input.role === "CANDIDATE" &&
    input.jobStatus === "PUBLISHED" &&
    input.companyIsPublished
  );
}
