import { describe, expect, it } from "vitest";

import {
  formatCount,
  formatDateTimeInZone,
  formatInteger,
  formatPercentFromRatio,
  formatRelativeTime,
} from "@/i18n/formatter";

describe("locale formatters", () => {
  it("formats the same numeric value with locale-specific grouping", () => {
    expect(formatInteger("en", 1_234_567)).toBe("1,234,567");
    expect(formatInteger("tr", 1_234_567)).toBe("1.234.567");
    expect(formatInteger("az", 1_234_567)).toBe("1.234.567");
    expect(formatInteger("ru", 1_234_567)).toMatch(/^1\D234\D567$/u);
  });

  it("never renders NaN/Infinity and localizes percentages", () => {
    for (const locale of ["en", "tr", "az", "ru"] as const) {
      expect(formatPercentFromRatio(locale, Number.NaN)).not.toMatch(
        /NaN|Infinity/,
      );
      expect(formatPercentFromRatio(locale, 0.125)).toContain("12");
    }
  });

  it("uses CLDR Russian plural categories", () => {
    const forms = {
      one: "{count} заявка",
      few: "{count} заявки",
      many: "{count} заявок",
      other: "{count} заявки",
    };
    expect(formatCount("ru", 1, forms)).toContain("заявка");
    expect(formatCount("ru", 2, forms)).toContain("заявки");
    expect(formatCount("ru", 5, forms)).toContain("заявок");
    expect(formatCount("ru", 21, forms)).toContain("заявка");
  });

  it("formats stored UTC instants in an explicit IANA timezone", () => {
    const instant = new Date("2026-07-14T12:00:00.000Z");
    expect(formatDateTimeInZone("en", instant, "Asia/Baku")).toMatch(
      /16:00|4:00/u,
    );
    expect(
      formatRelativeTime("tr", instant, new Date("2026-07-15T12:00:00.000Z")),
    ).not.toBe(
      formatRelativeTime("en", instant, new Date("2026-07-15T12:00:00.000Z")),
    );
  });
});
