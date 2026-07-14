import {
  ACTIVE_APPLICATION_STATUSES,
  TERMINAL_APPLICATION_STATUSES,
  isActiveApplicationStatus,
  isTerminalApplicationStatus,
} from "@/features/applications/lifecycle";
import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  type ApplicationStatusValue,
} from "@/features/applications/schemas";
import { getIntlLocale, type RouteLocale } from "@/i18n/config";
import { formatPercentFromRatio } from "@/i18n/formatter";

export const ANALYTICS_RANGE_PRESETS = [
  "30D",
  "90D",
  "180D",
  "365D",
  "ALL",
] as const;
export type AnalyticsRangePreset = (typeof ANALYTICS_RANGE_PRESETS)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRangePreset = "90D";
export const MAX_TREND_POINTS = 120;

export type TrendGranularity = "DAY" | "WEEK" | "MONTH";

export interface AnalyticsDateRange {
  preset: AnalyticsRangePreset;
  label: string;
  startAt: Date | null;
  endAt: Date;
  granularity: TrendGranularity;
}

export interface TrendBucket {
  key: string;
  label: string;
  startAt: Date;
  endAt: Date;
}

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
}

export const FUNNEL_STAGES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "INTERVIEW",
  "OFFER",
  "HIRED",
] as const satisfies readonly ApplicationStatusValue[];

export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export const FUNNEL_EXIT_STATUSES = [
  "REJECTED",
  "WITHDRAWN",
] as const satisfies readonly ApplicationStatusValue[];

export type FunnelExitStatus = (typeof FUNNEL_EXIT_STATUSES)[number];

export interface FunnelStageResult {
  stage: FunnelStage;
  label: string;
  reached: number;
  conversionFromPrevious: number | null;
}

export interface FunnelResult {
  stages: FunnelStageResult[];
  exits: Record<FunnelExitStatus, number>;
  overallHireConversion: number | null;
}

export interface StatusDistributionItem<TStatus extends string = string> {
  status: TStatus;
  label: string;
  count: number;
}

export const analyticsMetricSemantics = {
  CURRENT_STATE:
    "Current state is evaluated now across the complete authorized scope.",
  CREATED_IN_RANGE:
    "Created in range uses a server-derived UTC half-open interval.",
  EVER_REACHED:
    "Ever reached counts each in-range cohort record once per lifetime stage.",
} as const;

const presetDays: Partial<Record<AnalyticsRangePreset, number>> = {
  "30D": 30,
  "90D": 90,
  "180D": 180,
  "365D": 365,
};

const rangeLabels: Record<AnalyticsRangePreset, string> = {
  "30D": "Last 30 days",
  "90D": "Last 90 days",
  "180D": "Last 180 days",
  "365D": "Last 365 days",
  ALL: "All time",
};

function startOfUtcDay(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function startOfUtcWeek(value: Date): Date {
  const start = startOfUtcDay(value);
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function getTrendGranularity(
  preset: AnalyticsRangePreset,
): TrendGranularity {
  if (preset === "30D" || preset === "90D") return "DAY";
  if (preset === "180D" || preset === "365D") return "WEEK";
  return "MONTH";
}

export function getAnalyticsRangeLabel(preset: AnalyticsRangePreset): string {
  return rangeLabels[preset];
}

/**
 * Presets describe UTC calendar windows including the current UTC day. The
 * end remains the exact server instant, so all database predicates use the
 * half-open interval `startAt <= timestamp < endAt`.
 */
export function resolveAnalyticsDateRange(
  preset: AnalyticsRangePreset,
  now = new Date(),
): AnalyticsDateRange {
  const endAt = new Date(now);
  const days = presetDays[preset];
  let startAt: Date | null = null;

  if (days) {
    startAt = startOfUtcDay(endAt);
    startAt.setUTCDate(startAt.getUTCDate() - (days - 1));
  }

  return {
    preset,
    label: getAnalyticsRangeLabel(preset),
    startAt,
    endAt,
    granularity: getTrendGranularity(preset),
  };
}

export function isWithinAnalyticsRange(
  timestamp: Date,
  range: Pick<AnalyticsDateRange, "startAt" | "endAt">,
): boolean {
  return (
    (!range.startAt || timestamp >= range.startAt) && timestamp < range.endAt
  );
}

function floorBucketStart(value: Date, granularity: TrendGranularity): Date {
  if (granularity === "DAY") return startOfUtcDay(value);
  if (granularity === "WEEK") return startOfUtcWeek(value);
  return startOfUtcMonth(value);
}

function monthDistance(start: Date, end: Date): number {
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth() +
    1
  );
}

function bucketStep(
  start: Date,
  end: Date,
  granularity: TrendGranularity,
): number {
  if (granularity !== "MONTH") return 1;
  return Math.max(1, Math.ceil(monthDistance(start, end) / MAX_TREND_POINTS));
}

function addBucket(
  value: Date,
  granularity: TrendGranularity,
  step: number,
): Date {
  const next = new Date(value);
  if (granularity === "DAY") next.setUTCDate(next.getUTCDate() + step);
  if (granularity === "WEEK") next.setUTCDate(next.getUTCDate() + 7 * step);
  if (granularity === "MONTH") next.setUTCMonth(next.getUTCMonth() + step);
  return next;
}

export function formatTrendBucketLabel(
  startAt: Date,
  granularity: TrendGranularity,
  step = 1,
  locale: RouteLocale = "en",
): string {
  const options: Intl.DateTimeFormatOptions =
    granularity === "DAY"
      ? { month: "short", day: "numeric", timeZone: "UTC" }
      : granularity === "WEEK"
        ? { month: "short", day: "numeric", timeZone: "UTC" }
        : {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          };
  const startLabel = new Intl.DateTimeFormat(
    getIntlLocale(locale),
    options,
  ).format(startAt);
  if (granularity !== "MONTH" || step === 1) return startLabel;

  const end = new Date(startAt);
  end.setUTCMonth(end.getUTCMonth() + step - 1);
  const endLabel = new Intl.DateTimeFormat(
    getIntlLocale(locale),
    options,
  ).format(end);
  return `${startLabel}–${endLabel}`;
}

/**
 * Builds complete UTC bucket windows before querying. Even a very old ALL
 * range is compacted into multi-month windows so no chart exceeds 120 points.
 */
export function createTrendBuckets(
  range: AnalyticsDateRange,
  earliestAt?: Date | null,
  locale: RouteLocale = "en",
): TrendBucket[] {
  const effectiveStart = range.startAt ?? earliestAt ?? null;
  if (!effectiveStart || effectiveStart >= range.endAt) return [];

  const first = floorBucketStart(effectiveStart, range.granularity);
  const step = bucketStep(first, range.endAt, range.granularity);
  const buckets: TrendBucket[] = [];
  let cursor = first;

  while (cursor < range.endAt && buckets.length < MAX_TREND_POINTS) {
    const next = addBucket(cursor, range.granularity, step);
    const startAt = cursor < effectiveStart ? effectiveStart : cursor;
    const endAt = next < range.endAt ? next : range.endAt;
    const key = startAt.toISOString();
    buckets.push({
      key,
      label: formatTrendBucketLabel(cursor, range.granularity, step, locale),
      startAt,
      endAt,
    });
    cursor = next;
  }

  return buckets;
}

export function zeroFillTrendBuckets(
  buckets: readonly TrendBucket[],
  rows: readonly { bucketStart: Date | string; count: number }[],
): TrendPoint[] {
  const counts = new Map(
    rows.map((row) => [new Date(row.bucketStart).toISOString(), row.count]),
  );
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: counts.get(bucket.key) ?? 0,
  }));
}

export function calculateConversion(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1_000) / 10;
}

export function formatAnalyticsPercentage(
  value: number | null,
  locale: RouteLocale = "en",
): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : formatPercentFromRatio(locale, value / 100);
}

export function buildFunnelResult(
  reachedCounts: Partial<Record<ApplicationStatusValue, number>>,
): FunnelResult {
  const stages = FUNNEL_STAGES.map((stage, index): FunnelStageResult => {
    const reached = reachedCounts[stage] ?? 0;
    const previous = index === 0 ? null : FUNNEL_STAGES[index - 1];
    return {
      stage,
      label: applicationStatusLabels[stage],
      reached,
      conversionFromPrevious: previous
        ? calculateConversion(reached, reachedCounts[previous] ?? 0)
        : null,
    };
  });

  return {
    stages,
    exits: {
      REJECTED: reachedCounts.REJECTED ?? 0,
      WITHDRAWN: reachedCounts.WITHDRAWN ?? 0,
    },
    overallHireConversion: calculateConversion(
      reachedCounts.HIRED ?? 0,
      reachedCounts.SUBMITTED ?? 0,
    ),
  };
}

export function countUniqueFunnelApplications(
  events: readonly {
    applicationId: string;
    status: ApplicationStatusValue;
  }[],
): FunnelResult {
  const unique = new Set(
    events.map((event) => `${event.applicationId}:${event.status}`),
  );
  const counts: Partial<Record<ApplicationStatusValue, number>> = {};
  for (const entry of unique) {
    const status = entry.slice(
      entry.lastIndexOf(":") + 1,
    ) as ApplicationStatusValue;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return buildFunnelResult(counts);
}

export function buildApplicationStatusDistribution(
  counts: Partial<Record<ApplicationStatusValue, number>>,
): StatusDistributionItem<ApplicationStatusValue>[] {
  return APPLICATION_STATUSES.map((status) => ({
    status,
    label: applicationStatusLabels[status],
    count: counts[status] ?? 0,
  }));
}

export function countActiveApplications(
  counts: Partial<Record<ApplicationStatusValue, number>>,
): number {
  return ACTIVE_APPLICATION_STATUSES.reduce(
    (total, status) => total + (counts[status] ?? 0),
    0,
  );
}

export function countTerminalApplications(
  counts: Partial<Record<ApplicationStatusValue, number>>,
): number {
  return TERMINAL_APPLICATION_STATUSES.reduce(
    (total, status) => total + (counts[status] ?? 0),
    0,
  );
}

export { isActiveApplicationStatus, isTerminalApplicationStatus };
