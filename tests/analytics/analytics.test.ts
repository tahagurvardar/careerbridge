import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import {
  FUNNEL_STAGES,
  MAX_TREND_POINTS,
  analyticsMetricSemantics,
  buildApplicationStatusDistribution,
  buildFunnelResult,
  calculateConversion,
  countActiveApplications,
  countTerminalApplications,
  countUniqueFunnelApplications,
  createTrendBuckets,
  formatAnalyticsPercentage,
  getAnalyticsRangeLabel,
  getTrendGranularity,
  isActiveApplicationStatus,
  isTerminalApplicationStatus,
  isWithinAnalyticsRange,
  resolveAnalyticsDateRange,
  zeroFillTrendBuckets,
} from "@/features/analytics/analytics";

const now = new Date("2026-07-14T18:25:30.000Z");

describe("analytics UTC date ranges", () => {
  it.each([
    ["30D", "2026-06-15T00:00:00.000Z", "DAY"],
    ["90D", "2026-04-16T00:00:00.000Z", "DAY"],
    ["180D", "2026-01-16T00:00:00.000Z", "WEEK"],
    ["365D", "2025-07-15T00:00:00.000Z", "WEEK"],
  ] as const)("resolves %s with a UTC start", (preset, start, granularity) => {
    const range = resolveAnalyticsDateRange(preset, now);
    expect(range.startAt?.toISOString()).toBe(start);
    expect(range.endAt.toISOString()).toBe(now.toISOString());
    expect(range.granularity).toBe(granularity);
  });

  it("keeps ALL unbounded at the start but server-bounded at the end", () => {
    const range = resolveAnalyticsDateRange("ALL", now);
    expect(range.startAt).toBeNull();
    expect(range.endAt).toEqual(now);
    expect(range.granularity).toBe("MONTH");
    expect(range.label).toBe("All time");
  });

  it("uses half-open interval membership", () => {
    const range = resolveAnalyticsDateRange("30D", now);
    expect(isWithinAnalyticsRange(range.startAt!, range)).toBe(true);
    expect(isWithinAnalyticsRange(new Date(now.getTime() - 1), range)).toBe(
      true,
    );
    expect(isWithinAnalyticsRange(now, range)).toBe(false);
  });

  it("exposes stable range labels and granularity", () => {
    expect(getAnalyticsRangeLabel("90D")).toBe("Last 90 days");
    expect(getTrendGranularity("180D")).toBe("WEEK");
    expect(getTrendGranularity("ALL")).toBe("MONTH");
  });
});

describe("analytics trend buckets", () => {
  it("builds daily buckets for 30D and 90D", () => {
    expect(
      createTrendBuckets(resolveAnalyticsDateRange("30D", now)),
    ).toHaveLength(30);
    expect(
      createTrendBuckets(resolveAnalyticsDateRange("90D", now)),
    ).toHaveLength(90);
  });

  it("builds weekly buckets in chronological order", () => {
    const range = resolveAnalyticsDateRange("365D", now);
    const buckets = createTrendBuckets(range);
    expect(buckets.length).toBeGreaterThan(50);
    expect(buckets.length).toBeLessThanOrEqual(54);
    expect(
      buckets.every(
        (bucket, index) =>
          index === 0 || bucket.startAt > buckets[index - 1].startAt,
      ),
    ).toBe(true);
    expect(buckets[0].startAt).toEqual(range.startAt);
  });

  it("builds monthly ALL buckets and compacts old history", () => {
    const buckets = createTrendBuckets(
      resolveAnalyticsDateRange("ALL", now),
      new Date("1900-01-01T00:00:00.000Z"),
    );
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.length).toBeLessThanOrEqual(MAX_TREND_POINTS);
    expect(buckets[0].startAt.toISOString()).toBe("1900-01-01T00:00:00.000Z");
    expect(buckets.at(-1)?.endAt).toEqual(now);
  });

  it("returns no buckets for an empty ALL scope", () => {
    expect(
      createTrendBuckets(resolveAnalyticsDateRange("ALL", now), null),
    ).toEqual([]);
  });

  it("zero-fills missing buckets with stable ordering", () => {
    const buckets = createTrendBuckets(resolveAnalyticsDateRange("30D", now));
    const points = zeroFillTrendBuckets(buckets, [
      { bucketStart: buckets[2].startAt, count: 4 },
      { bucketStart: buckets[0].startAt, count: 2 },
    ]);
    expect(points[0].value).toBe(2);
    expect(points[1].value).toBe(0);
    expect(points[2].value).toBe(4);
    expect(points.map((point) => point.key)).toEqual(
      buckets.map((bucket) => bucket.key),
    );
  });
});

describe("analytics metric semantics", () => {
  it("keeps semantic definitions explicit", () => {
    expect(analyticsMetricSemantics.CURRENT_STATE).toContain("Current state");
    expect(analyticsMetricSemantics.CREATED_IN_RANGE).toContain("half-open");
    expect(analyticsMetricSemantics.EVER_REACHED).toContain("once");
  });

  it("classifies active and terminal Application statuses", () => {
    expect(isActiveApplicationStatus("OFFER")).toBe(true);
    expect(isActiveApplicationStatus("HIRED")).toBe(false);
    expect(isTerminalApplicationStatus("HIRED")).toBe(true);
    expect(isTerminalApplicationStatus("WITHDRAWN")).toBe(true);
    expect(isTerminalApplicationStatus("INTERVIEW")).toBe(false);
    expect(
      countActiveApplications({ SUBMITTED: 2, UNDER_REVIEW: 3, OFFER: 1 }),
    ).toBe(6);
    expect(countTerminalApplications({ HIRED: 1, REJECTED: 2 })).toBe(3);
  });

  it("zero-fills current status presentation", () => {
    const distribution = buildApplicationStatusDistribution({ OFFER: 2 });
    expect(distribution.find((item) => item.status === "OFFER")?.count).toBe(2);
    expect(distribution.find((item) => item.status === "HIRED")?.count).toBe(0);
  });
});

describe("Application funnel", () => {
  it("uses the ordered funnel stages", () => {
    expect(FUNNEL_STAGES).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "INTERVIEW",
      "OFFER",
      "HIRED",
    ]);
  });

  it("counts unique Applications once per stage despite repeated events", () => {
    const funnel = countUniqueFunnelApplications([
      { applicationId: "a:1", status: "SUBMITTED" },
      { applicationId: "a:1", status: "UNDER_REVIEW" },
      { applicationId: "a:1", status: "INTERVIEW" },
      { applicationId: "a:1", status: "INTERVIEW" },
      { applicationId: "a:2", status: "SUBMITTED" },
      { applicationId: "a:2", status: "REJECTED" },
      { applicationId: "a:3", status: "SUBMITTED" },
      { applicationId: "a:3", status: "WITHDRAWN" },
    ]);
    expect(funnel.stages.map((stage) => stage.reached)).toEqual([
      3, 1, 1, 0, 0,
    ]);
    expect(funnel.exits).toEqual({ REJECTED: 1, WITHDRAWN: 1 });
  });

  it("calculates stage and overall conversions to one decimal", () => {
    const funnel = buildFunnelResult({
      SUBMITTED: 3,
      UNDER_REVIEW: 2,
      INTERVIEW: 1,
      OFFER: 1,
      HIRED: 1,
    });
    expect(funnel.stages[1].conversionFromPrevious).toBe(66.7);
    expect(funnel.stages[2].conversionFromPrevious).toBe(50);
    expect(funnel.overallHireConversion).toBe(33.3);
    expect(calculateConversion(1, 6)).toBe(16.7);
  });

  it("uses null for zero denominators and never presents NaN/Infinity", () => {
    expect(calculateConversion(1, 0)).toBeNull();
    expect(formatAnalyticsPercentage(null)).toBe("—");
    expect(formatAnalyticsPercentage(Number.NaN)).toBe("—");
    expect(formatAnalyticsPercentage(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatAnalyticsPercentage(25)).toBe("25.0%");
  });
});

describe("analytics presentation", () => {
  it("renders a descriptive empty state", () => {
    const html = renderToStaticMarkup(
      createElement(AnalyticsEmptyState, {
        title: "No matching Applications",
        description: "Try another range.",
      }),
    );
    expect(html).toContain("No matching Applications");
    expect(html).toContain("Try another range.");
  });
});
