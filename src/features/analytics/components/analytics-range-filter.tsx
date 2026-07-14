import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  ANALYTICS_RANGE_PRESETS,
  type AnalyticsRangePreset,
} from "@/features/analytics/analytics";
import type {
  RecruiterAnalyticsCompanyOption,
  RecruiterAnalyticsJobOption,
} from "@/features/analytics/server/recruiter";
import type { RouteLocale } from "@/i18n/config";
import type { AnalyticsDictionary } from "@/i18n/dictionary";
import { localizeInternalPath } from "@/i18n/paths";

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
  locale,
  labels,
  preserve = {},
}: {
  basePath: string;
  currentRange: AnalyticsRangePreset;
  locale: RouteLocale;
  labels: AnalyticsDictionary["range"];
  preserve?: Record<string, string | undefined>;
}) {
  return (
    <nav aria-label={labels.navigation} className="flex flex-wrap gap-2">
      {ANALYTICS_RANGE_PRESETS.map((range) => (
        <FilterLink
          key={range}
          active={range === currentRange}
          href={localizeInternalPath(
            analyticsHref(basePath, { ...preserve, range }),
            locale,
          )}
        >
          {range}
          <span className="sr-only"> — {labels[range]}</span>
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
  locale,
  labels,
}: {
  range: AnalyticsRangePreset;
  companies: RecruiterAnalyticsCompanyOption[];
  selectedCompanyId: string;
  jobs: RecruiterAnalyticsJobOption[];
  selectedJobId: string | null;
  locale: RouteLocale;
  labels: Pick<AnalyticsDictionary, "range" | "filters">;
}) {
  const basePath = "/recruiter/analytics";
  const href = (values: Record<string, string | undefined>) =>
    localizeInternalPath(analyticsHref(basePath, values), locale);

  return (
    <div className="grid gap-5">
      <div>
        <p className="mb-2 text-sm font-medium">{labels.filters.dateRange}</p>
        <AnalyticsRangeFilter
          basePath={basePath}
          currentRange={range}
          locale={locale}
          labels={labels.range}
          preserve={{
            companyId: selectedCompanyId,
            jobId: selectedJobId ?? undefined,
          }}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{labels.filters.company}</p>
        <nav
          aria-label={labels.filters.companyAria}
          className="flex flex-wrap gap-2"
        >
          {companies.map((company) => (
            <FilterLink
              key={company.id}
              active={company.id === selectedCompanyId}
              href={href({ range, companyId: company.id })}
            >
              {company.name}
              {company.moderationStatus === "HIDDEN" ? (
                <Badge variant="outline" className="ml-2">
                  {labels.filters.hidden}
                </Badge>
              ) : null}
            </FilterLink>
          ))}
        </nav>
        <p className="text-muted-foreground mt-2 text-xs">
          {labels.filters.companyReset}
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{labels.filters.job}</p>
        <nav
          aria-label={labels.filters.jobAria}
          className="flex flex-wrap gap-2"
        >
          <FilterLink
            active={!selectedJobId}
            href={href({ range, companyId: selectedCompanyId })}
          >
            {labels.filters.allJobs}
          </FilterLink>
          {jobs.map((job) => (
            <FilterLink
              key={job.id}
              active={job.id === selectedJobId}
              href={href({
                range,
                companyId: selectedCompanyId,
                jobId: job.id,
              })}
            >
              {job.title}
              {job.moderationStatus === "HIDDEN" ? (
                <Badge variant="outline" className="ml-2">
                  {labels.filters.hidden}
                </Badge>
              ) : null}
            </FilterLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
