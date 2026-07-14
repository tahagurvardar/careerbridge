import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/pagination";
import { parseAdminJobSearch } from "@/features/admin/schemas";
import { getAdminJobs } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatJobDate } from "@/features/jobs/format";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { JOB_STATUSES } from "@/features/jobs/schemas";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/jobs">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { admin } = await getDictionary(locale);
  return {
    title: admin.jobs.metaTitle,
    description: admin.jobs.metaDescription,
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function AdminJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.jobs;
  const shared = dictionary.admin.shared;
  await requireActiveAdmin("/admin/jobs");
  const search = parseAdminJobSearch(await searchParams);
  const result = await getAdminJobs(getPrismaClient(), search);
  const hasFilters = Boolean(search.q || search.lifecycle || search.status);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          badge={shared.badge}
          title={t.title}
          description={t.description}
        />

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              role="search"
              className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end"
            >
              <label className="grid gap-2 text-sm font-medium" htmlFor="q">
                {t.jobTitle}
                <Input
                  id="q"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder={t.searchPlaceholder}
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="lifecycle"
              >
                {t.lifecycle}
                <select
                  id="lifecycle"
                  name="lifecycle"
                  defaultValue={search.lifecycle}
                  className={selectClassName}
                >
                  <option value="">{t.allLifecycle}</option>
                  {JOB_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {dictionary.labels.jobStatus[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="status"
              >
                {t.moderation}
                <select
                  id="status"
                  name="status"
                  defaultValue={search.status}
                  className={selectClassName}
                >
                  <option value="">{t.allModeration}</option>
                  <option value="VISIBLE">
                    {dictionary.labels.contentModeration.VISIBLE}
                  </option>
                  <option value="HIDDEN">
                    {dictionary.labels.contentModeration.HIDDEN}
                  </option>
                </select>
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  {shared.filter}
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href={localizeInternalPath("/admin/jobs", locale)}
                      aria-label={t.clearFilters}
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
          <h2 className="text-lg font-semibold">{t.directory}</h2>
          <p className="text-muted-foreground text-sm" role="status">
            {formatCount(locale, result.total, shared.resultCount)}
          </p>
        </div>

        {result.items.length ? (
          <ul className="mt-4 grid gap-4">
            {result.items.map((job) => (
              <li key={job.id}>
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">
                        {job.title}
                      </CardTitle>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {job.company.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.moderationStatus === "HIDDEN"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {
                        dictionary.labels.contentModeration[
                          job.moderationStatus
                        ]
                      }
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      <span>{dictionary.labels.jobStatus[job.status]}</span>
                      <span>
                        {formatMessage(shared.created, {
                          date: formatJobDate(locale, job.createdAt),
                        })}
                      </span>
                      {job.company.moderationStatus === "HIDDEN" ? (
                        <span className="text-destructive">
                          {t.parentHidden}
                        </span>
                      ) : null}
                    </div>
                    <Button variant="outline" asChild>
                      <Link
                        href={localizeInternalPath(
                          `/admin/jobs/${job.id}`,
                          locale,
                        )}
                      >
                        {t.review}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <BriefcaseBusiness
                aria-hidden="true"
                className="text-muted-foreground size-10"
              />
              <h2 className="mt-4 text-xl font-semibold">{t.empty}</h2>
              <p className="text-muted-foreground mt-2">
                {shared.emptyDescription}
              </p>
            </CardContent>
          </Card>
        )}

        <AdminPagination
          pathname="/admin/jobs"
          page={result.page}
          totalPages={result.totalPages}
          search={search}
          locale={locale}
          labels={shared}
        />
      </div>
    </section>
  );
}
