import type { Metadata } from "next";
import Link from "next/link";
import Form from "next/form";
import {
  BriefcaseBusiness,
  MapPin,
  Search,
  SearchX,
  SlidersHorizontal,
} from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockOpportunities } from "@/config/opportunities";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";
import {
  filterOpportunities,
  hasOpportunityFilters,
  parseOpportunityFilters,
  workModeOptions,
} from "@/features/opportunities/lib/filter-opportunities";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Search CareerBridge mock opportunities by role, skill, and location.",
};

interface JobsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const filters = parseOpportunityFilters(await searchParams);
  const filteredOpportunities = filterOpportunities(mockOpportunities, filters);
  const hasFilters = hasOpportunityFilters(filters);
  const resultLabel =
    filteredOpportunities.length === 1
      ? "1 sample opportunity"
      : filteredOpportunities.length + " sample opportunities";

  return (
    <>
      <PageIntro
        eyebrow="Opportunity discovery"
        title="Find a role shaped around where you want to go."
        description="Search the typed CareerBridge mock data by role, company, skill, location, and work arrangement. Production search remains part of a later phase."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Search opportunities</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Filters update the URL and search the three sample listings.
              </p>
            </div>
            <Badge variant="outline">Mock data only</Badge>
          </div>

          <Form
            action="/jobs"
            role="search"
            aria-label="Search mock job opportunities"
            className="grid gap-4 lg:grid-cols-[1fr_0.8fr_0.7fr_auto] lg:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="job-query">Role, company, or skill</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-query"
                  name="query"
                  placeholder="e.g. React or Northstar"
                  defaultValue={filters.query}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-location">Location</Label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-location"
                  name="location"
                  placeholder="City or region"
                  defaultValue={filters.location}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-work-mode">Work arrangement</Label>
              <div className="relative">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <select
                  id="job-work-mode"
                  name="workMode"
                  defaultValue={filters.workMode}
                  className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full appearance-none rounded-lg border pr-8 pl-9 text-sm outline-none focus-visible:ring-3"
                >
                  {workModeOptions.map((option) => (
                    <option key={option.value || "all"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" className="h-10 px-4">
              <Search aria-hidden="true" data-icon="inline-start" />
              Search jobs
            </Button>
          </Form>

          {hasFilters && (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-5">
              <span className="text-muted-foreground text-sm">
                Active filters:
              </span>
              {filters.query && (
                <Badge variant="secondary">Query: {filters.query}</Badge>
              )}
              {filters.location && (
                <Badge variant="secondary">Location: {filters.location}</Badge>
              )}
              {filters.workMode && (
                <Badge variant="secondary">
                  Arrangement: {filters.workMode}
                </Badge>
              )}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs">Clear all</Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Sample listings
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Mock opportunities
            </h2>
          </div>
          <p
            aria-live="polite"
            className="text-muted-foreground flex items-center gap-2 text-sm"
          >
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            {resultLabel}
          </p>
        </div>

        {filteredOpportunities.length > 0 ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {filteredOpportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.slug}
                opportunity={opportunity}
              />
            ))}
          </div>
        ) : (
          <div
            role="status"
            className="bg-card mt-6 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center"
          >
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <SearchX aria-hidden="true" className="size-6" />
            </span>
            <h3 className="mt-5 text-xl font-semibold">
              No mock opportunities match
            </h3>
            <p className="text-muted-foreground mt-2 max-w-md leading-6">
              Try a broader keyword, another location, or a different work
              arrangement.
            </p>
            <Button variant="outline" className="mt-6" asChild>
              <Link href="/jobs">Clear search filters</Link>
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
