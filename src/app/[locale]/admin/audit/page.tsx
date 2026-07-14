import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AuditTimeline } from "@/features/admin/components/audit-timeline";
import { AdminPagination } from "@/features/admin/components/pagination";
import {
  ADMIN_AUDIT_ACTIONS,
  MODERATION_REASON_CODES,
} from "@/features/admin/moderation";
import { parseAdminAuditSearch } from "@/features/admin/schemas";
import { getAdminAudit } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/audit">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { admin } = await getDictionary(locale);
  return {
    title: admin.audit.metaTitle,
    description: admin.audit.metaDescription,
  };
}

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function AdminAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.audit;
  const shared = dictionary.admin.shared;
  await requireActiveAdmin("/admin/audit");
  const search = parseAdminAuditSearch(await searchParams);
  const result = await getAdminAudit(getPrismaClient(), search);
  const hasFilters = Boolean(search.action || search.reason);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          badge={shared.badge}
          title={t.title}
          description={t.description}
        />

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form
              method="get"
              className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="action"
              >
                {t.action}
                <select
                  id="action"
                  name="action"
                  defaultValue={search.action}
                  className={selectClassName}
                >
                  <option value="">{t.allActions}</option>
                  {ADMIN_AUDIT_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {dictionary.labels.adminAuditAction[action]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="reason"
              >
                {t.reason}
                <select
                  id="reason"
                  name="reason"
                  defaultValue={search.reason}
                  className={selectClassName}
                >
                  <option value="">{t.allReasons}</option>
                  {MODERATION_REASON_CODES.map((reason) => (
                    <option key={reason} value={reason}>
                      {dictionary.labels.moderationReason[reason]}
                    </option>
                  ))}
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
                      href={localizeInternalPath("/admin/audit", locale)}
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
          <h2 className="text-lg font-semibold">{t.events}</h2>
          <p className="text-muted-foreground text-sm" role="status">
            {formatCount(locale, result.total, t.eventCount)}
          </p>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText aria-hidden="true" className="size-5" />
              {t.history}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline
              events={result.items}
              locale={locale}
              labels={t}
              displayLabels={dictionary.labels}
            />
          </CardContent>
        </Card>

        <AdminPagination
          pathname="/admin/audit"
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
