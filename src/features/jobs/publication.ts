export const JOB_PUBLICATION_FIELDS = [
  ["title", "Job title"],
  ["summary", "Summary"],
  ["description", "Description"],
  ["responsibilities", "Responsibilities"],
  ["requirements", "Requirements"],
  ["location", "Location"],
  ["employmentType", "Employment type"],
  ["workplaceType", "Workplace type"],
  ["experienceLevel", "Experience level"],
] as const;

type PublicationJobField = (typeof JOB_PUBLICATION_FIELDS)[number][0];

export type PublicationJob = Record<PublicationJobField, string | null>;

export interface JobPublicationInput {
  companyIsPublished: boolean;
  skillCount: number;
  job: PublicationJob;
}

export interface JobPublicationReadiness {
  isReady: boolean;
  missingFields: { field: string; label: string }[];
}

/**
 * Publication readiness is intentionally database-free so it can be unit tested
 * and reused by the UI. The authorized mutation always evaluates it against
 * freshly read database rows, never against browser-supplied values.
 */
export function getJobPublicationReadiness({
  companyIsPublished,
  skillCount,
  job,
}: JobPublicationInput): JobPublicationReadiness {
  const missingFields: { field: string; label: string }[] = [];

  if (!companyIsPublished) {
    missingFields.push({
      field: "company",
      label: "Publish the company first",
    });
  }

  for (const [field, label] of JOB_PUBLICATION_FIELDS) {
    const value = job[field];
    if (!value || !value.trim()) {
      missingFields.push({ field, label });
    }
  }

  if (skillCount < 1) {
    missingFields.push({
      field: "skills",
      label: "At least one required skill",
    });
  }

  return { isReady: missingFields.length === 0, missingFields };
}
