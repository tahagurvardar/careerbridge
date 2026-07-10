/**
 * Presentation helpers for job data. Salary is stored as whole currency units,
 * so formatting only adds grouping separators — never floating-point math.
 */
export function formatSalaryRange(
  salaryMin: number | null,
  salaryMax: number | null,
  salaryCurrency: string | null,
): string | null {
  if (salaryMin === null && salaryMax === null) return null;

  const code = salaryCurrency ? `${salaryCurrency} ` : "";
  const amount = (value: number) => value.toLocaleString("en-US");

  if (salaryMin !== null && salaryMax !== null) {
    return `${code}${amount(salaryMin)}–${amount(salaryMax)}`;
  }
  if (salaryMin !== null) return `${code}From ${amount(salaryMin)}`;
  return `${code}Up to ${amount(salaryMax as number)}`;
}

/**
 * Formats a stored `@db.Date` / timestamp in UTC so a date-only value never
 * shifts a day because of the server timezone.
 */
export function formatJobDate(value: Date): string {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
