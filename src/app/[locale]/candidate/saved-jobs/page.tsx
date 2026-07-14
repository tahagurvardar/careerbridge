import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Laptop2,
  MapPin,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { requireRole } from "@/features/auth/server/session";
import { formatJobDate } from "@/features/jobs/format";
import { classifySavedJobAvailability } from "@/features/saved-jobs/availability";
import { JobSaveButton } from "@/features/saved-jobs/components/job-save-button";
import {
  SAVED_JOB_AVAILABILITY_FILTERS,
  hasActiveSavedJobFilters,
  parseSavedJobSearch,
} from "@/features/saved-jobs/schemas";
import {
  countCandidateSavedJobs,
  getCandidateSavedJobs,
} from "@/features/saved-jobs/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/saved-jobs">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { savedJobs } = (await getDictionary(locale)).candidate;
  return {
    title: savedJobs.metaTitle,
    description: savedJobs.metaDescription,
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function CandidateSavedJobsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/saved-jobs">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.savedJobs;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("CANDIDATE", "/candidate/saved-jobs");
  const search = parseSavedJobSearch(await searchParams);
  const prisma = getPrismaClient();
  const [savedJobs, total] = await Promise.all([
    getCandidateSavedJobs(prisma, session.user.id, search),
    countCandidateSavedJobs(prisma, session.user.id),
  ]);
  const hasFilters = hasActiveSavedJobFilters(search);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">{t.badge}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t.description}
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              role="search"
              aria-label={t.searchAria}
              className="grid gap-4 sm:grid-cols-[1.6fr_1fr_auto] sm:items-end"
            >
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="saved-query"
              >
                {t.queryLabel}
                <Input
                  id="saved-query"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder={t.queryPlaceholder}
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="saved-availability"
              >
                {t.availabilityLabel}
                <select
                  id="saved-availability"
                  name="availability"
                  defaultValue={search.availability}
                  className={selectClassName}
                >
                  {SAVED_JOB_AVAILABILITY_FILTERS.map((availability) => (
                    <option key={availability} value={availability}>
                      {dictionary.labels.savedJobAvailability[availability]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  {t.filter}
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href={localize("/candidate/saved-jobs")}
                      aria-label={t.clearFiltersAria}
                    >
                      <X aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {hasFilters ? t.filteredTitle : t.allTitle}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {formatCount(locale, savedJobs.length, t.resultCount)}
            {hasFilters ? ` ${formatMessage(t.ofTotal, { total })}` : ""}
          </p>
        </div>

        {savedJobs.length ? (
          <ul className="mt-4 grid gap-5 md:grid-cols-2">
            {savedJobs.map((savedJob) => {
              const { job } = savedJob;
              const availability = classifySavedJobAvailability({
                status: job.status,
                companyIsPublished: job.company.isPublished,
                moderationStatus: job.moderationStatus,
                companyModerationStatus: job.company.moderationStatus,
              });
              const application = job.applications[0];

              return (
                <li key={job.slug}>
                  <Card className="h-full">
                    <CardHeader className="gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <Badge
                          variant={
                            availability === "OPEN" ? "default" : "secondary"
                          }
                        >
                          {dictionary.labels.savedJobAvailability[availability]}
                        </Badge>
                        <JobSaveButton
                          slug={job.slug}
                          initialSaved
                          labels={dictionary.public.saveButton}
                          compact
                        />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{job.title}</h3>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                          <Building2 aria-hidden="true" className="size-4" />
                          {job.company.name}
                        </p>
                      </div>
                    </CardHeader>
                    <CardContent className="flex h-full flex-col gap-5">
                      <div className="text-muted-foreground grid gap-2 text-sm sm:grid-cols-2">
                        {job.location ? (
                          <p className="flex items-center gap-2">
                            <MapPin aria-hidden="true" className="size-4" />
                            {job.location}
                          </p>
                        ) : null}
                        {job.employmentType ? (
                          <p className="flex items-center gap-2">
                            <BriefcaseBusiness
                              aria-hidden="true"
                              className="size-4"
                            />
                            {
                              dictionary.labels.employmentType[
                                job.employmentType
                              ]
                            }
                          </p>
                        ) : null}
                        {job.workplaceType ? (
                          <p className="flex items-center gap-2">
                            <Laptop2 aria-hidden="true" className="size-4" />
                            {dictionary.labels.workplaceType[job.workplaceType]}
                          </p>
                        ) : null}
                        {job.experienceLevel ? (
                          <p className="flex items-center gap-2">
                            <GraduationCap
                              aria-hidden="true"
                              className="size-4"
                            />
                            {
                              dictionary.labels.experienceLevel[
                                job.experienceLevel
                              ]
                            }
                          </p>
                        ) : null}
                      </div>

                      {job.skills.length ? (
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map(({ skill }) => (
                            <Badge key={skill.name} variant="outline">
                              {skill.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-auto border-t pt-4">
                        <p className="text-muted-foreground text-xs">
                          {formatMessage(t.savedOn, {
                            date: formatJobDate(locale, savedJob.createdAt),
                          })}
                        </p>
                        {application ? (
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-sm">
                              {t.application}
                            </span>
                            <ApplicationStatusBadge
                              status={application.status}
                              label={
                                dictionary.labels.applicationStatus[
                                  application.status
                                ]
                              }
                            />
                          </div>
                        ) : null}
                        {availability === "OPEN" ? (
                          <Button className="mt-4 w-full" asChild>
                            <Link href={localize(`/jobs/${job.slug}`)}>
                              {t.viewPublicJob}{" "}
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </Button>
                        ) : (
                          <p className="text-muted-foreground bg-muted/60 mt-4 rounded-lg p-3 text-sm leading-6">
                            {t.noLongerAccepting}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <Bookmark aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">
                {total === 0 ? t.emptyTitle : t.emptyFilteredTitle}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0 ? t.emptyDescription : t.emptyFilteredDescription}
              </p>
              <Button
                className="mt-6"
                variant={total === 0 ? "default" : "outline"}
                asChild
              >
                <Link
                  href={localize(
                    total === 0 ? "/jobs" : "/candidate/saved-jobs",
                  )}
                >
                  {total === 0 ? t.browseJobs : t.clearFilters}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
