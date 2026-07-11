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
import {
  employmentTypeLabels,
  experienceLevelLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { classifySavedJobAvailability } from "@/features/saved-jobs/availability";
import { JobSaveButton } from "@/features/saved-jobs/components/job-save-button";
import {
  SAVED_JOB_AVAILABILITY_FILTERS,
  hasActiveSavedJobFilters,
  parseSavedJobSearch,
  savedJobAvailabilityLabels,
} from "@/features/saved-jobs/schemas";
import {
  countCandidateSavedJobs,
  getCandidateSavedJobs,
} from "@/features/saved-jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Saved jobs",
  description: "Review and manage jobs you have saved on CareerBridge.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function CandidateSavedJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
          <Badge variant="secondary">Candidate</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Saved jobs
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Keep promising opportunities together, then return when you are
            ready to apply.
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              role="search"
              aria-label="Search saved jobs"
              className="grid gap-4 sm:grid-cols-[1.6fr_1fr_auto] sm:items-end"
            >
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="saved-query"
              >
                Job, company, location, or skill
                <Input
                  id="saved-query"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder="e.g. React or Baku"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="saved-availability"
              >
                Availability
                <select
                  id="saved-availability"
                  name="availability"
                  defaultValue={search.availability}
                  className={selectClassName}
                >
                  {SAVED_JOB_AVAILABILITY_FILTERS.map((availability) => (
                    <option key={availability} value={availability}>
                      {savedJobAvailabilityLabels[availability]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  Filter
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href="/candidate/saved-jobs"
                      aria-label="Clear saved job filters"
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
            {hasFilters ? "Filtered saved jobs" : "All saved jobs"}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {savedJobs.length} {savedJobs.length === 1 ? "result" : "results"}
            {hasFilters ? ` of ${total}` : ""}
          </p>
        </div>

        {savedJobs.length ? (
          <ul className="mt-4 grid gap-5 md:grid-cols-2">
            {savedJobs.map((savedJob) => {
              const { job } = savedJob;
              const availability = classifySavedJobAvailability({
                status: job.status,
                companyIsPublished: job.company.isPublished,
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
                          {availability === "OPEN" ? "Open" : "Unavailable"}
                        </Badge>
                        <JobSaveButton slug={job.slug} initialSaved compact />
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
                            {employmentTypeLabels[job.employmentType]}
                          </p>
                        ) : null}
                        {job.workplaceType ? (
                          <p className="flex items-center gap-2">
                            <Laptop2 aria-hidden="true" className="size-4" />
                            {workplaceTypeLabels[job.workplaceType]}
                          </p>
                        ) : null}
                        {job.experienceLevel ? (
                          <p className="flex items-center gap-2">
                            <GraduationCap
                              aria-hidden="true"
                              className="size-4"
                            />
                            {experienceLevelLabels[job.experienceLevel]}
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
                          Saved {formatJobDate(savedJob.createdAt)}
                        </p>
                        {application ? (
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-sm">
                              Application
                            </span>
                            <ApplicationStatusBadge
                              status={application.status}
                            />
                          </div>
                        ) : null}
                        {availability === "OPEN" ? (
                          <Button className="mt-4 w-full" asChild>
                            <Link href={`/jobs/${job.slug}`}>
                              View public job{" "}
                              <ArrowUpRight aria-hidden="true" />
                            </Link>
                          </Button>
                        ) : (
                          <p className="text-muted-foreground bg-muted/60 mt-4 rounded-lg p-3 text-sm leading-6">
                            This Job is no longer accepting applications.
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
                {total === 0 ? "No saved jobs yet" : "No saved jobs match"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0
                  ? "Browse open jobs and save the opportunities you want to revisit."
                  : "Try a broader search or a different availability filter."}
              </p>
              <Button
                className="mt-6"
                variant={total === 0 ? "default" : "outline"}
                asChild
              >
                <Link href={total === 0 ? "/jobs" : "/candidate/saved-jobs"}>
                  {total === 0 ? "Browse jobs" : "Clear filters"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
