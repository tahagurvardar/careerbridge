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
  hasActiveCandidateApplicationFilters,
  parseCandidateApplicationSearch,
} from "@/features/applications/schemas";
import {
  getCandidateApplications,
  getCandidateApplicationStatusCounts,
} from "@/features/applications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/applications">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { candidate } = await getDictionary(locale);
  return {
    title: candidate.applications.metaTitle,
    description: candidate.applications.metaDescription,
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function CandidateApplicationsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/applications">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.applications;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);

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
    { label: t.stats.total, value: total },
    { label: t.stats.active, value: active },
    { label: t.stats.interviews, value: counts.INTERVIEW },
    { label: t.stats.offers, value: counts.OFFER },
    { label: t.stats.hired, value: counts.HIRED },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">{labels.role.CANDIDATE}</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t.description}
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
                {t.searchLabel}
                <Input
                  id="app-search"
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder={t.searchPlaceholder}
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-status"
              >
                {t.statusLabel}
                <select
                  id="app-status"
                  name="status"
                  defaultValue={filters.status}
                  className={selectClassName}
                >
                  <option value="">{t.allStatuses}</option>
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {labels.applicationStatus[status]}
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
                      href={localize("/candidate/applications")}
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
            {hasFilters ? t.filteredApplications : t.allApplications}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {formatCount(locale, applications.length, t.resultCount)}
            {hasFilters ? ` ${formatMessage(t.ofTotal, { total })}` : ""}
          </p>
        </div>

        {applications.length ? (
          <ul className="mt-4 grid gap-4">
            {applications.map((application) => (
              <li key={application.id}>
                <Link
                  href={localize(`/candidate/applications/${application.id}`)}
                  className="group/app focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Card className="group-hover/app:ring-primary/30 transition">
                    <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ApplicationStatusBadge
                            status={application.status}
                            label={labels.applicationStatus[application.status]}
                          />
                          <span className="text-muted-foreground text-xs">
                            {formatMessage(t.appliedOn, {
                              date: formatJobDate(
                                locale,
                                application.submittedAt,
                              ),
                            })}
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
                        {dictionary.common.actions.view}
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
                {total === 0 ? t.emptyTitle : t.emptyFilteredTitle}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0 ? t.emptyDescription : t.emptyFilteredDescription}
              </p>
              {total === 0 ? (
                <Button className="mt-6" asChild>
                  <Link href={localize("/jobs")}>{t.browseJobs}</Link>
                </Button>
              ) : (
                <Button variant="outline" className="mt-6" asChild>
                  <Link href={localize("/candidate/applications")}>
                    {dictionary.common.actions.clearFilters}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
