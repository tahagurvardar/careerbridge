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
  hasActiveJobFilters,
  parsePublicJobSearch,
} from "@/features/jobs/schemas";
import { getPublishedJobs } from "@/features/jobs/server/data";
import { getSavedJobSlugs } from "@/features/saved-jobs/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  return {
    title: metadata.jobs.title,
    description: metadata.jobs.description,
    alternates: buildLocaleAlternates("/jobs", locale),
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-10 w-full appearance-none rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function JobsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/jobs">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.jobs;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);

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
  const resultLabel = formatCount(locale, jobs.length, t.resultCount);

  return (
    <>
      <PageIntro
        eyebrow={t.introEyebrow}
        title={t.introTitle}
        description={t.introDescription}
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h2 className="font-semibold">{t.searchTitle}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t.searchDescription}
            </p>
          </div>

          <form
            method="get"
            role="search"
            aria-label={t.searchAria}
            className="grid gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="job-query">{t.queryLabel}</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-query"
                  name="q"
                  maxLength={100}
                  placeholder={t.queryPlaceholder}
                  defaultValue={search.q}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-location">{t.locationLabel}</Label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-location"
                  name="location"
                  maxLength={100}
                  placeholder={t.locationPlaceholder}
                  defaultValue={search.location}
                  className="h-10 pl-9"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="job-employment">{t.employmentTypeLabel}</Label>
                <select
                  id="job-employment"
                  name="employmentType"
                  defaultValue={search.employmentType}
                  className={selectClassName}
                >
                  <option value="">{t.anyType}</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labels.employmentType[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-workplace">{t.workplaceLabel}</Label>
                <select
                  id="job-workplace"
                  name="workplaceType"
                  defaultValue={search.workplaceType}
                  className={selectClassName}
                >
                  <option value="">{t.anyWorkplace}</option>
                  {WORKPLACE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labels.workplaceType[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-experience">{t.experienceLabel}</Label>
                <select
                  id="job-experience"
                  name="experienceLevel"
                  defaultValue={search.experienceLevel}
                  className={selectClassName}
                >
                  <option value="">{t.anyLevel}</option>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {labels.experienceLevel[level]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 lg:col-span-2">
              <Button type="submit" className="h-10 px-4">
                <Search aria-hidden="true" data-icon="inline-start" />
                {t.searchSubmit}
              </Button>
              {hasFilters ? (
                <Button variant="outline" className="h-10" asChild>
                  <Link href={localize("/jobs")}>
                    {dictionary.common.actions.clearFilters}
                  </Link>
                </Button>
              ) : null}
            </div>
          </form>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              {t.publishedListings}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {t.openJobs}
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
                locale={locale}
                dictionary={dictionary}
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
            <h3 className="mt-5 text-xl font-semibold">{t.emptyTitle}</h3>
            <p className="text-muted-foreground mt-2 max-w-md leading-6">
              {hasFilters ? t.emptyFiltered : t.emptyNone}
            </p>
            {hasFilters ? (
              <Button variant="outline" className="mt-6" asChild>
                <Link href={localize("/jobs")}>{t.clearSearchFilters}</Link>
              </Button>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
