import { z } from "zod";

export const SAVED_JOB_AVAILABILITY_FILTERS = [
  "ALL",
  "OPEN",
  "UNAVAILABLE",
] as const;

export type SavedJobAvailabilityFilter =
  (typeof SAVED_JOB_AVAILABILITY_FILTERS)[number];

export const savedJobAvailabilityLabels: Record<
  SavedJobAvailabilityFilter,
  string
> = {
  ALL: "All saved jobs",
  OPEN: "Open",
  UNAVAILABLE: "Unavailable",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const savedJobSearchTextSchema = z.string().trim().max(100).catch("");
export const savedJobAvailabilitySchema = z.enum(
  SAVED_JOB_AVAILABILITY_FILTERS,
);
export const savedJobSlugSchema = z.string().trim().min(1).max(200);

export interface SavedJobSearch {
  q: string;
  availability: SavedJobAvailabilityFilter;
}

export function parseSavedJobSearch(
  searchParams: SearchParams,
): SavedJobSearch {
  const availability = savedJobAvailabilitySchema.safeParse(
    firstValue(searchParams.availability),
  );

  return {
    q: savedJobSearchTextSchema.parse(firstValue(searchParams.q)),
    availability: availability.success ? availability.data : "ALL",
  };
}

export function hasActiveSavedJobFilters(search: SavedJobSearch) {
  return Boolean(search.q || search.availability !== "ALL");
}
