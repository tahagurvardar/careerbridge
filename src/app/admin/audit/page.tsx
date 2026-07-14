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
  adminAuditActionLabels,
  moderationReasonLabels,
} from "@/features/admin/moderation";
import { parseAdminAuditSearch } from "@/features/admin/schemas";
import { getAdminAudit } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin audit log",
  description: "Immutable CareerBridge Admin moderation history.",
};

const selectClassName =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireActiveAdmin("/admin/audit");
  const search = parseAdminAuditSearch(await searchParams);
  const result = await getAdminAudit(getPrismaClient(), search);
  const hasFilters = Boolean(search.action || search.reason);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Immutable audit log"
          description="Newest-first history of platform moderation decisions. Entries can be read and filtered, never edited or deleted."
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
                Action
                <select
                  id="action"
                  name="action"
                  defaultValue={search.action}
                  className={selectClassName}
                >
                  <option value="">All actions</option>
                  {ADMIN_AUDIT_ACTIONS.map((action) => (
                    <option key={action} value={action}>
                      {adminAuditActionLabels[action]}
                    </option>
                  ))}
                </select>
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="reason"
              >
                Reason
                <select
                  id="reason"
                  name="reason"
                  defaultValue={search.reason}
                  className={selectClassName}
                >
                  <option value="">All reasons</option>
                  {MODERATION_REASON_CODES.map((reason) => (
                    <option key={reason} value={reason}>
                      {moderationReasonLabels[reason]}
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
                    <Link href="/admin/audit" aria-label="Clear audit filters">
                      <X aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Moderation events</h2>
          <p className="text-muted-foreground text-sm" role="status">
            {result.total} {result.total === 1 ? "event" : "events"}
          </p>
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText aria-hidden="true" className="size-5" />
              Audit history
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline events={result.items} />
          </CardContent>
        </Card>

        <AdminPagination
          pathname="/admin/audit"
          page={result.page}
          totalPages={result.totalPages}
          search={search}
        />
      </div>
    </section>
  );
}
