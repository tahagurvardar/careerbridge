// Centralized locale-aware presentation formatters.
//
// Every date, time, number, percentage, relative-time, and plural rendering in
// the application flows through these helpers so no page hand-rolls month
// names or English grammar. Formatting is presentation only: stored UTC
// instants and stored IANA interview timezones are inputs and are never
// mutated, and values are numerically identical across locales.

import { getIntlLocale, type RouteLocale } from "@/i18n/config";

// Intl constructor instances are immutable and locale+option keyed, so a
// module-level cache is safe shared state (it holds no request data).
const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();
const numberFormatCache = new Map<string, Intl.NumberFormat>();
const relativeTimeFormatCache = new Map<string, Intl.RelativeTimeFormat>();
const pluralRulesCache = new Map<string, Intl.PluralRules>();

function getDateTimeFormat(
  locale: RouteLocale,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = dateTimeFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(getIntlLocale(locale), options);
    dateTimeFormatCache.set(key, formatter);
  }
  return formatter;
}

function getNumberFormat(
  locale: RouteLocale,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let formatter = numberFormatCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(getIntlLocale(locale), options);
    numberFormatCache.set(key, formatter);
  }
  return formatter;
}

function getRelativeTimeFormat(locale: RouteLocale): Intl.RelativeTimeFormat {
  let formatter = relativeTimeFormatCache.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(getIntlLocale(locale), {
      numeric: "auto",
    });
    relativeTimeFormatCache.set(locale, formatter);
  }
  return formatter;
}

export function getPluralRules(locale: RouteLocale): Intl.PluralRules {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(getIntlLocale(locale));
    pluralRulesCache.set(locale, rules);
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Dates and times (UTC instants in; presentation strings out)
// ---------------------------------------------------------------------------

/** e.g. en "Jul 14, 2026" / tr "14 Tem 2026" / ru "14 июл. 2026 г." */
export function formatShortDate(locale: RouteLocale, date: Date): string {
  return getDateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** e.g. en "July 14, 2026" / az "14 iyul 2026". */
export function formatLongDate(locale: RouteLocale, date: Date): string {
  return getDateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Month and year for education and experience ranges, rendered in UTC. */
export function formatMonthYear(locale: RouteLocale, date: Date): string {
  return getDateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Short date plus time, rendered in UTC (used for audit-style instants). */
export function formatDateTimeUtc(locale: RouteLocale, date: Date): string {
  return getDateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

/**
 * Full date and time in a stored IANA timezone, with the zone name shown.
 * The stored instant and zone are authoritative; locale changes only the
 * words and digit grouping around them.
 */
export function formatDateTimeInZone(
  locale: RouteLocale,
  date: Date,
  timeZone: string,
): string {
  return getDateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

export function formatDateInZone(
  locale: RouteLocale,
  date: Date,
  timeZone: string,
): string {
  return getDateTimeFormat(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

export function formatTimeInZone(
  locale: RouteLocale,
  date: Date,
  timeZone: string,
): string {
  return getDateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

// ---------------------------------------------------------------------------
// Relative time
// ---------------------------------------------------------------------------

const RELATIVE_STEPS: {
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
  max: number;
}[] = [
  { unit: "second", ms: 1_000, max: 60 },
  { unit: "minute", ms: 60_000, max: 60 },
  { unit: "hour", ms: 3_600_000, max: 24 },
  { unit: "day", ms: 86_400_000, max: 30 },
  { unit: "month", ms: 2_592_000_000, max: 12 },
  { unit: "year", ms: 31_536_000_000, max: Number.POSITIVE_INFINITY },
];

/**
 * Locale-aware relative time, e.g. en "3 days ago" / tr "3 gün önce" /
 * az "3 gün əvvəl" / ru "3 дня назад". Grammar comes from
 * Intl.RelativeTimeFormat — never from string concatenation.
 */
export function formatRelativeTime(
  locale: RouteLocale,
  date: Date,
  now: Date = new Date(),
): string {
  const deltaMs = date.getTime() - now.getTime();
  const magnitude = Math.abs(deltaMs);
  const formatter = getRelativeTimeFormat(locale);

  for (const step of RELATIVE_STEPS) {
    if (magnitude < step.ms * step.max) {
      const value = Math.round(deltaMs / step.ms);
      // "0 seconds ago" reads poorly; numeric:auto renders "now" wording.
      return formatter.format(value, step.unit);
    }
  }
  return formatter.format(Math.round(deltaMs / 31_536_000_000), "year");
}

// ---------------------------------------------------------------------------
// Numbers and percentages (never NaN, never Infinity)
// ---------------------------------------------------------------------------

function safeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function formatInteger(locale: RouteLocale, value: number): string {
  return getNumberFormat(locale, { maximumFractionDigits: 0 }).format(
    safeNumber(value),
  );
}

export function formatDecimal(
  locale: RouteLocale,
  value: number,
  fractionDigits = 1,
): string {
  return getNumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeNumber(value));
}

/**
 * Formats a 0–1 ratio as a locale-aware percentage. Non-finite input (a 0/0
 * conversion, for example) renders as zero rather than NaN or Infinity.
 */
export function formatPercentFromRatio(
  locale: RouteLocale,
  ratio: number,
  fractionDigits = 1,
): string {
  return getNumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(safeNumber(ratio));
}

// ---------------------------------------------------------------------------
// Plural-sensitive copy
// ---------------------------------------------------------------------------

/**
 * Plural forms for one message. `other` is always required; the remaining CLDR
 * categories are provided per locale as its grammar needs (Russian requires
 * one/few/many, English/Turkish/Azerbaijani only one/other).
 */
export type PluralForms = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

/**
 * Selects the CLDR plural form for a count via Intl.PluralRules (never a
 * simplistic English rule) and substitutes the locale-formatted count for
 * `{count}`. An explicit `zero` form wins at exactly zero when provided.
 */
export function formatCount(
  locale: RouteLocale,
  count: number,
  forms: PluralForms,
): string {
  const value = safeNumber(count);
  const template =
    value === 0 && forms.zero !== undefined
      ? forms.zero
      : (forms[getPluralRules(locale).select(value)] ?? forms.other);
  return template.replaceAll("{count}", formatInteger(locale, value));
}
