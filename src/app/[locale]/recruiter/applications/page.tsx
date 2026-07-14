import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
  Paperclip,
  Search,
  StickyNote,
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
  hasActiveRecruiterApplicationFilters,
  parseRecruiterApplicationSearch,
} from "@/features/applications/schemas";
import {
  getRecruiterApplications,
  getRecruiterApplicationStatusCounts,
} from "@/features/applications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { getOwnedCompaniesForRecruiter } from "@/features/jobs/server/data";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/applications">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.applications.title,
    description: recruiter.applications.description,
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function RecruiterApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.applications;
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
    { label: t.total, value: total },
    { label: t.new, value: counts.SUBMITTED },
    {
      label: labels.applicationStatus.UNDER_REVIEW,
      value: counts.UNDER_REVIEW,
    },
    { label: labels.applicationStatus.INTERVIEW, value: counts.INTERVIEW },
    { label: labels.applicationStatus.OFFER, value: counts.OFFER },
    { label: labels.applicationStatus.HIRED, value: counts.HIRED },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">
            {dictionary.recruiter.shared.workspace}
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            {t.description}
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
                {t.status}
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
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="app-company"
              >
                {t.company}
                <select
                  id="app-company"
                  name="companyId"
                  defaultValue={filters.companyId}
                  className={selectClassName}
                >
                  <option value="">{t.allCompanies}</option>
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
                  {dictionary.common.actions.search}
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href={localizeInternalPath(
                        "/recruiter/applications",
                        locale,
                      )}
                      aria-label={dictionary.common.actions.clearFilters}
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
            {hasFilters ? t.filtered : t.all}
          </h2>
          <p className="text-muted-foreground text-sm" role="status">
            {formatCount(
              locale,
              applications.length,
              dictionary.recruiter.shared.result,
            )}
            {hasFilters ? ` of ${total}` : ""}
          </p>
        </div>

        {applications.length ? (
          <ul className="mt-4 grid gap-4">
            {applications.map((application) => (
              <li key={application.id}>
                <Link
                  href={localizeInternalPath(
                    `/recruiter/applications/${application.id}`,
                    locale,
                  )}
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
                            {formatMessage(t.applied, {
                              date: formatJobDate(
                                locale,
                                application.submittedAt,
                              ),
                            })}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-lg font-semibold">
                          {application.candidate.name}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">
                          {application.candidate.candidateProfile?.headline ??
                            t.noHeadline}
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
                              {t.cvAttached}
                            </span>
                          ) : (
                            <span>{t.noCv}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <StickyNote
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            {formatCount(
                              locale,
                              application.activeNoteCount,
                              t.noteCount,
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
                        {t.review}
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
                {total === 0 ? t.emptyTitle : t.noMatchTitle}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {total === 0 ? t.emptyDescription : t.noMatchDescription}
              </p>
              {total === 0 ? (
                <Button className="mt-6" asChild>
                  <Link href={localizeInternalPath("/recruiter/jobs", locale)}>
                    {t.manageJobs}
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="mt-6" asChild>
                  <Link
                    href={localizeInternalPath(
                      "/recruiter/applications",
                      locale,
                    )}
                  >
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
