import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  ANALYTICS_RANGE_PRESETS,
  getAnalyticsRangeLabel,
  type AnalyticsRangePreset,
} from "@/features/analytics/analytics";
import type {
  RecruiterAnalyticsCompanyOption,
  RecruiterAnalyticsJobOption,
} from "@/features/analytics/server/recruiter";

function analyticsHref(
  basePath: string,
  values: Record<string, string | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `${basePath}?${suffix}` : basePath;
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "bg-primary text-primary-foreground focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
          : "bg-muted/60 text-foreground hover:bg-muted focus-visible:ring-ring rounded-lg px-3 py-2 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
      }
    >
      {children}
    </Link>
  );
}

export function AnalyticsRangeFilter({
  basePath,
  currentRange,
  preserve = {},
}: {
  basePath: string;
  currentRange: AnalyticsRangePreset;
  preserve?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label="Analytics date range" className="flex flex-wrap gap-2">
      {ANALYTICS_RANGE_PRESETS.map((range) => (
        <FilterLink
          key={range}
          active={range === currentRange}
          href={analyticsHref(basePath, { ...preserve, range })}
        >
          {range}
          <span className="sr-only"> — {getAnalyticsRangeLabel(range)}</span>
        </FilterLink>
      ))}
    </nav>
  );
}

export function RecruiterAnalyticsFilters({
  range,
  companies,
  selectedCompanyId,
  jobs,
  selectedJobId,
}: {
  range: AnalyticsRangePreset;
  companies: RecruiterAnalyticsCompanyOption[];
  selectedCompanyId: string;
  jobs: RecruiterAnalyticsJobOption[];
  selectedJobId: string | null;
}) {
  const basePath = "/recruiter/analytics";
  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-sm font-medium">Date range</p>
        <AnalyticsRangeFilter
          basePath={basePath}
          currentRange={range}
          preserve={{
            companyId: selectedCompanyId,
            jobId: selectedJobId ?? undefined,
          }}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Company</p>
        <nav aria-label="Analytics Company" className="flex flex-wrap gap-2">
          {companies.map((company) => (
            <FilterLink
              key={company.id}
              active={company.id === selectedCompanyId}
              href={analyticsHref(basePath, {
                range,
                companyId: company.id,
              })}
            >
              {company.name}
              {company.moderationStatus === "HIDDEN" ? (
                <Badge variant="outline" className="ml-2">
                  Hidden
                </Badge>
              ) : null}
            </FilterLink>
          ))}
        </nav>
        <p className="text-muted-foreground mt-2 text-xs">
          Changing Company intentionally resets the Job filter.
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Job</p>
        <nav aria-label="Analytics Job" className="flex flex-wrap gap-2">
          <FilterLink
            active={!selectedJobId}
            href={analyticsHref(basePath, {
              range,
              companyId: selectedCompanyId,
            })}
          >
            All jobs
          </FilterLink>
          {jobs.map((job) => (
            <FilterLink
              key={job.id}
              active={job.id === selectedJobId}
              href={analyticsHref(basePath, {
                range,
                companyId: selectedCompanyId,
                jobId: job.id,
              })}
            >
              {job.title}
              {job.moderationStatus === "HIDDEN" ? (
                <Badge variant="outline" className="ml-2">
                  Hidden
                </Badge>
              ) : null}
            </FilterLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
