import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  Search,
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
  hasActiveCandidateApplicationFilters,
  parseCandidateApplicationSearch,
} from "@/features/applications/schemas";
import {
  getCandidateApplications,
  getCandidateApplicationStatusCounts,
} from "@/features/applications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Your applications",
  description: "Track every job you have applied to on CareerBridge.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function CandidateApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole("CANDIDATE", "/candidate/applications");
  const filters = parseCandidateApplicationSearch(await searchParams);
  const prisma = getPrismaClient();
  const [{ counts, total }, applications] = await Promise.all([
    getCandidateApplicationStatusCounts(prisma, session.user.id),
    getCandidateApplications(prisma, session.user.id, filters),
  ]);
  const active =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.INTERVIEW + counts.OFFER;
  const hasFilters = hasActiveCandidateApplicationFilters(filters);

  const summary = [
    { label: "Total", value: total },
    { label: "Active", value: active },
    { label: "Interviews", value: counts.INTERVIEW },
    { label: "Offers", value: counts.OFFER },
    { label: "Hired", value: counts.HIRED },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">Candidate</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Your applications
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Track the jobs you have applied to and follow each application
            through the hiring process.
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {summary.map((item) => (
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
              className="grid gap-4 sm:grid-cols-[1.6fr_1fr_auto] sm:items-end"
            >
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-search"
              >
                Search by job or company
                <Input
                  id="app-search"
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder="e.g. Engineer or Northstar"
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
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  Filter
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href="/candidate/applications"
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
                  href={`/candidate/applications/${application.id}`}
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
                          {application.job.title}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                          <Building2 aria-hidden="true" className="size-4" />
                          {application.job.company.name}
                        </p>
                      </div>
                      <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
                        View
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
                <ClipboardList aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">
                {total === 0
                  ? "No applications yet"
                  : "No applications match these filters"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0
                  ? "Browse published jobs and apply to the roles that fit you."
                  : "Try a different status or search term."}
              </p>
              {total === 0 ? (
                <Button className="mt-6" asChild>
                  <Link href="/jobs">Browse jobs</Link>
                </Button>
              ) : (
                <Button variant="outline" className="mt-6" asChild>
                  <Link href="/candidate/applications">Clear filters</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
