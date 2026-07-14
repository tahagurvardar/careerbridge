import { z } from "zod";

import {
  ANALYTICS_RANGE_PRESETS,
  DEFAULT_ANALYTICS_RANGE,
} from "@/features/analytics/analytics";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

const rangeSchema = z.preprocess(
  firstValue,
  z.enum(ANALYTICS_RANGE_PRESETS).catch(DEFAULT_ANALYTICS_RANGE),
);

const scopedIdSchema = z.preprocess(
  firstValue,
  z.string().trim().max(128).catch(""),
);

export const adminAnalyticsSearchSchema = z
  .object({ range: rangeSchema.default(DEFAULT_ANALYTICS_RANGE) })
  .strip();

export const candidateAnalyticsSearchSchema = z
  .object({ range: rangeSchema.default(DEFAULT_ANALYTICS_RANGE) })
  .strip();

export const recruiterAnalyticsSearchSchema = z
  .object({
    range: rangeSchema.default(DEFAULT_ANALYTICS_RANGE),
    companyId: scopedIdSchema.default(""),
    jobId: scopedIdSchema.default(""),
  })
  .strip();

export type AdminAnalyticsSearch = z.infer<typeof adminAnalyticsSearchSchema>;
export type CandidateAnalyticsSearch = z.infer<
  typeof candidateAnalyticsSearchSchema
>;
export type RecruiterAnalyticsSearch = z.infer<
  typeof recruiterAnalyticsSearchSchema
>;

export function parseAdminAnalyticsSearch(
  input: SearchParams,
): AdminAnalyticsSearch {
  return adminAnalyticsSearchSchema.parse(input);
}

export function parseCandidateAnalyticsSearch(
  input: SearchParams,
): CandidateAnalyticsSearch {
  return candidateAnalyticsSearchSchema.parse(input);
}

export function parseRecruiterAnalyticsSearch(
  input: SearchParams,
): RecruiterAnalyticsSearch {
  return recruiterAnalyticsSearchSchema.parse(input);
}
