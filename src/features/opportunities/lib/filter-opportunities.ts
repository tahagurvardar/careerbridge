import { z } from "zod";

import type { Opportunity } from "@/types/opportunity";

export type WorkModeFilter = "" | "remote" | "hybrid" | "on-site";

export interface OpportunityFilters {
  query: string;
  location: string;
  workMode: WorkModeFilter;
}

type SearchParams = Record<string, string | string[] | undefined>;

const textFilterSchema = z.string().trim().max(100).catch("");
const workModeFilterSchema = z.enum(["remote", "hybrid", "on-site"]);

export const workModeOptions = [
  { value: "", label: "Any work arrangement" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
] as const;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseOpportunityFilters(
  searchParams: SearchParams,
): OpportunityFilters {
  const query = textFilterSchema.parse(firstValue(searchParams.query));
  const location = textFilterSchema.parse(firstValue(searchParams.location));
  const workModeResult = workModeFilterSchema.safeParse(
    firstValue(searchParams.workMode),
  );

  return {
    query,
    location,
    workMode: workModeResult.success ? workModeResult.data : "",
  };
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function terms(value: string) {
  return normalize(value).split(/\s+/).filter(Boolean);
}

export function filterOpportunities(
  opportunities: Opportunity[],
  filters: OpportunityFilters,
) {
  const queryTerms = terms(filters.query);
  const locationTerms = terms(filters.location);

  return opportunities.filter((opportunity) => {
    const queryHaystack = normalize(
      [
        opportunity.title,
        opportunity.company,
        opportunity.description,
        opportunity.employmentType,
        opportunity.workMode,
        ...opportunity.skills,
      ].join(" "),
    );
    const locationHaystack = normalize(
      [opportunity.location, opportunity.workMode].join(" "),
    );

    const matchesQuery = queryTerms.every((term) =>
      queryHaystack.includes(term),
    );
    const matchesLocation = locationTerms.every((term) =>
      locationHaystack.includes(term),
    );
    const matchesWorkMode =
      !filters.workMode || normalize(opportunity.workMode) === filters.workMode;

    return matchesQuery && matchesLocation && matchesWorkMode;
  });
}

export function hasOpportunityFilters(filters: OpportunityFilters) {
  return Boolean(filters.query || filters.location || filters.workMode);
}
