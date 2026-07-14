/**
 * Presentation helpers for job data. Salary is stored as whole currency
 * units, so formatting only adds locale-aware grouping separators — never
 * floating-point math. Dates format the stored UTC instant; locale changes
 * presentation only.
 */
import type { PublicDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatInteger, formatShortDate } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

export function formatSalaryRange(
  locale: RouteLocale,
  t: PublicDictionary["jobCard"],
  salaryMin: number | null,
  salaryMax: number | null,
  salaryCurrency: string | null,
): string | null {
  if (salaryMin === null && salaryMax === null) return null;

  const code = salaryCurrency ? `${salaryCurrency} ` : "";
  const amount = (value: number) => formatInteger(locale, value);

  if (salaryMin !== null && salaryMax !== null) {
    return `${code}${amount(salaryMin)}–${amount(salaryMax)}`;
  }
  if (salaryMin !== null) {
    return `${code}${formatMessage(t.salaryFrom, { amount: amount(salaryMin) })}`;
  }
  return `${code}${formatMessage(t.salaryUpTo, {
    amount: amount(salaryMax as number),
  })}`;
}

/**
 * Formats a stored `@db.Date` / timestamp in UTC so a date-only value never
 * shifts a day because of the server timezone.
 */
export function formatJobDate(locale: RouteLocale, value: Date): string {
  return formatShortDate(locale, value);
}
