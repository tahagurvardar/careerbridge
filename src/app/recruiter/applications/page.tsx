import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
  Paperclip,
  Search,
  UsersRound,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import {
  APPLICATION_STATUSES,
  applicationStatusLabels,
  hasActiveRecruiterApplicationFilters,
  parseRecruiterApplicationSearch,
} from "@/features/applications/schemas";
import {
  getRecruiterApplications,
  getRecruiterApplicationStatusCounts,
} from "@/features/applications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { getOwnedCompaniesForRecruiter } from "@/features/jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Applications",
  description: "Review applications for jobs at companies you own.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function RecruiterApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("RECRUITER", "/recruiter/applications");
  const filters = parseRecruiterApplicationSearch(await searchParams);
  const prisma = getPrismaClient();
  const [companies, { counts, total }, applications] = await Promise.all([
    getOwnedCompaniesForRecruiter(prisma, session.user.id),
    getRecruiterApplicationStatusCounts(prisma, session.user.id),
    getRecruiterApplications(prisma, session.user.id, filters),
  ]);
  const hasFilters = hasActiveRecruiterApplicationFilters(filters);

  const stats = [
    { label: "Total", value: total },
    { label: "New", value: counts.SUBMITTED },
    { label: "Under review", value: counts.UNDER_REVIEW },
    { label: "Interview", value: counts.INTERVIEW },
    { label: "Offer", value: counts.OFFER },
    { label: "Hired", value: counts.HIRED },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">Recruiter workspace</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Applications
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Every application across jobs at companies you own. Candidate
            details are visible only because they applied to your role.
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((item) => (
            <div key={item.label} className="bg-muted/60 rounded-xl p-4">
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr_auto] lg:items-end"
            >
              {filters.jobId ? (
                <input type="hidden" name="jobId" value={filters.jobId} />
              ) : null}
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-search"
              >
                Search candidate, job, or company
                <Input
                  id="app-search"
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder="Name, email, job, or company"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-status"
              >
                Status
                <select
                  id="app-status"
                  name="status"
                  defaultValue={filters.status}
                  className={selectClassName}
                >
                  <option value="">All statuses</option>
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {applicationStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-company"
              >
                Company
                <select
                  id="app-company"
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
                    <Link
                      href="/recruiter/applications"
                      aria-label="Clear application filters"
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
            {hasFilters ? "Filtered applications" : "All applications"}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {applications.length}{" "}
            {applications.length === 1 ? "result" : "results"}
            {hasFilters ? ` of ${total}` : ""}
          </p>
        </div>

        {applications.length ? (
          <ul className="mt-4 grid gap-4">
            {applications.map((application) => (
              <li key={application.id}>
                <Link
                  href={`/recruiter/applications/${application.id}`}
                  className="group/app focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="group-hover/app:ring-primary/30 transition">
                    <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ApplicationStatusBadge status={application.status} />
                          <span className="text-muted-foreground text-xs">
                            Applied {formatJobDate(application.submittedAt)}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-lg font-semibold">
                          {application.candidate.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                          {application.candidate.candidateProfile?.headline ??
                            "No headline yet"}
                        </p>
                        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {application.candidate.candidateProfile?.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin aria-hidden="true" className="size-3.5" />
                              {application.candidate.candidateProfile.location}
                            </span>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <BriefcaseBusiness
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {application.job.title} ·{" "}
                            {application.job.company.name}
                          </span>
                          {application.hasResume ? (
                            <span className="flex items-center gap-1">
                              <Paperclip
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              CV attached
                            </span>
                          ) : (
                            <span>No CV</span>
                          )}
                        </div>
                      </div>
                      <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
                        Review
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <UsersRound aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">
                {total === 0
                  ? "No applications yet"
                  : "No applications match these filters"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0
                  ? "When candidates apply to your published jobs, their applications appear here."
                  : "Try a different status, company, or search term."}
              </p>
              {total === 0 ? (
                <Button className="mt-6" asChild>
                  <Link href="/recruiter/jobs">Manage your jobs</Link>
                </Button>
              ) : (
                <Button variant="outline" className="mt-6" asChild>
                  <Link href="/recruiter/applications">Clear filters</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
