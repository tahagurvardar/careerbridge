import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, MapPin, Search, SearchX } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JobCard } from "@/features/jobs/components/job-card";
import { getCurrentSession } from "@/features/auth/server/session";
import {
  EMPLOYMENT_TYPES,
  EXPERIENCE_LEVELS,
  WORKPLACE_TYPES,
  employmentTypeLabels,
  experienceLevelLabels,
  hasActiveJobFilters,
  parsePublicJobSearch,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { getPublishedJobs } from "@/features/jobs/server/data";
import { getSavedJobSlugs } from "@/features/saved-jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Jobs",
  description:
    "Search published jobs on CareerBridge by role, company, skill, and location.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full appearance-none rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = parsePublicJobSearch(await searchParams);
  const prisma = getPrismaClient();
  const [jobs, session] = await Promise.all([
    getPublishedJobs(prisma, search),
    getCurrentSession(),
  ]);
  const savedSlugs =
    session?.user.role === "CANDIDATE"
      ? await getSavedJobSlugs(
          prisma,
          session.user.id,
          jobs.map(({ slug }) => slug),
        )
      : new Set<string>();
  const hasFilters = hasActiveJobFilters(search);
  const resultLabel =
    jobs.length === 1 ? "1 published job" : `${jobs.length} published jobs`;

  return (
    <>
      <PageIntro
        eyebrow="Opportunity discovery"
        title="Find a role shaped around where you want to go."
        description="Search live job listings published by companies on CareerBridge. Filter by role, company, skill, location, and how you want to work."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold">Search jobs</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Filters update the URL and query published listings only.
            </p>
          </div>

          <form
            method="get"
            role="search"
            aria-label="Search published jobs"
            className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-end"
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
                  name="q"
                  maxLength={100}
                  placeholder="e.g. React or Northstar"
                  defaultValue={search.q}
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
                  maxLength={100}
                  placeholder="City or region"
                  defaultValue={search.location}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="job-employment">Employment type</Label>
                <select
                  id="job-employment"
                  name="employmentType"
                  defaultValue={search.employmentType}
                  className={selectClassName}
                >
                  <option value="">Any type</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {employmentTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-workplace">Workplace</Label>
                <select
                  id="job-workplace"
                  name="workplaceType"
                  defaultValue={search.workplaceType}
                  className={selectClassName}
                >
                  <option value="">Any workplace</option>
                  {WORKPLACE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {workplaceTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-experience">Experience</Label>
                <select
                  id="job-experience"
                  name="experienceLevel"
                  defaultValue={search.experienceLevel}
                  className={selectClassName}
                >
                  <option value="">Any level</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {experienceLevelLabels[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 lg:col-span-2">
              <Button type="submit" className="h-10 px-4">
                <Search aria-hidden="true" data-icon="inline-start" />
                Search jobs
              </Button>
              {hasFilters ? (
                <Button variant="outline" className="h-10" asChild>
                  <Link href="/jobs">Clear filters</Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Published listings
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Open jobs
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

        {jobs.length > 0 ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard
                key={job.slug}
                job={job}
                saveState={
                  !session
                    ? "SIGNED_OUT"
                    : session.user.role === "CANDIDATE"
                      ? savedSlugs.has(job.slug)
                      : null
                }
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
              No published jobs match
            </h3>
            <p className="text-muted-foreground mt-2 max-w-md leading-6">
              {hasFilters
                ? "Try a broader keyword, another location, or fewer filters."
                : "There are no published jobs yet. Check back soon."}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="mt-6" asChild>
                <Link href="/jobs">Clear search filters</Link>
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
