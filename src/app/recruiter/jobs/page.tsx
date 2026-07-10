import type { Metadata } from "next";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Building2,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/features/auth/server/session";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatJobDate } from "@/features/jobs/format";
import {
  employmentTypeLabels,
  hasActiveRecruiterJobFilters,
  JOB_STATUSES,
  jobStatusLabels,
  parseRecruiterJobFilters,
} from "@/features/jobs/schemas";
import {
  getOwnedCompaniesForRecruiter,
  getRecruiterJobs,
  getRecruiterJobStatusCounts,
} from "@/features/jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiter jobs",
  description: "Manage jobs across the companies you own.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function RecruiterJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("RECRUITER", "/recruiter/jobs");
  const filters = parseRecruiterJobFilters(await searchParams);
  const prisma = getPrismaClient();
  const [companies, counts, jobs] = await Promise.all([
    getOwnedCompaniesForRecruiter(prisma, session.user.id),
    getRecruiterJobStatusCounts(prisma, session.user.id),
    getRecruiterJobs(prisma, session.user.id, filters),
  ]);
  const totalJobs =
    counts.DRAFT + counts.PUBLISHED + counts.CLOSED + counts.ARCHIVED;
  const hasFilters = hasActiveRecruiterJobFilters(filters);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">Recruiter workspace</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Your jobs
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Every job across companies you own. Drafts stay private until you
              publish a complete job.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/recruiter/jobs/new">
              <Plus aria-hidden="true" />
              Create job
            </Link>
          </Button>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {JOB_STATUSES.map((status) => (
            <div key={status} className="bg-muted/60 rounded-xl p-4">
              <dt className="text-muted-foreground text-sm">
                {jobStatusLabels[status]}
              </dt>
              <dd className="mt-1 text-2xl font-semibold">{counts[status]}</dd>
            </div>
          ))}
        </dl>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end"
            >
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="job-search"
              >
                Search by title
                <Input
                  id="job-search"
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder="e.g. Engineer"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="job-status"
              >
                Status
                <select
                  id="job-status"
                  name="status"
                  defaultValue={filters.status}
                  className={selectClassName}
                >
                  <option value="">All statuses</option>
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {jobStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="job-company"
              >
                Company
                <select
                  id="job-company"
                  name="companyId"
                  defaultValue={filters.companyId}
                  className={selectClassName}
                >
                  <option value="">All companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
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
                    <Link href="/recruiter/jobs" aria-label="Clear job filters">
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
            {hasFilters ? "Filtered jobs" : "All jobs"}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {jobs.length} {jobs.length === 1 ? "result" : "results"}
            {hasFilters ? ` of ${totalJobs}` : ""}
          </p>
        </div>

        {jobs.length ? (
          <ul className="mt-4 grid gap-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-lg">
                          <Link
                            href={`/recruiter/jobs/${job.id}`}
                            className="hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {job.title}
                          </Link>
                        </CardTitle>
                        <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                          <Building2 aria-hidden="true" className="size-4" />
                          {job.company.name}
                        </p>
                      </div>
                      <JobStatusBadge status={job.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      {job.location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin aria-hidden="true" className="size-4" />
                          {job.location}
                        </span>
                      ) : null}
                      {job.employmentType ? (
                        <span className="flex items-center gap-1.5">
                          <BriefcaseBusiness
                            aria-hidden="true"
                            className="size-4"
                          />
                          {employmentTypeLabels[job.employmentType]}
                        </span>
                      ) : null}
                      <span>
                        {job.status === "PUBLISHED" && job.publishedAt
                          ? `Published ${formatJobDate(job.publishedAt)}`
                          : `Created ${formatJobDate(job.createdAt)}`}
                      </span>
                      <span>
                        {job._count.skills}{" "}
                        {job._count.skills === 1 ? "skill" : "skills"}
                      </span>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/recruiter/jobs/${job.id}`}>Manage job</Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <BriefcaseBusiness aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">
                {totalJobs === 0
                  ? "No jobs yet"
                  : "No jobs match these filters"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {totalJobs === 0
                  ? "Create your first job. It stays a private draft until you publish it."
                  : "Try a different status, company, or search term."}
              </p>
              {totalJobs === 0 ? (
                <Button className="mt-6" asChild>
                  <Link href="/recruiter/jobs/new">Create your first job</Link>
                </Button>
              ) : (
                <Button variant="outline" className="mt-6" asChild>
                  <Link href="/recruiter/jobs">Clear filters</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
