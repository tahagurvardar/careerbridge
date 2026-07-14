import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AdminDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";

function pageHref(
  pathname: string,
  page: number,
  search: Record<string, string | number>,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== "" && key !== "page") params.set(key, String(value));
  }
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AdminPagination({
  pathname,
  page,
  totalPages,
  search,
  locale,
  labels,
}: {
  pathname: string;
  page: number;
  totalPages: number;
  search: Record<string, string | number>;
  locale: RouteLocale;
  labels: AdminDictionary["shared"];
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label={labels.paginationAria}
      className="mt-8 flex items-center justify-between gap-4"
    >
      <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? (
          <Link
            href={localizeInternalPath(
              pageHref(pathname, page - 1, search),
              locale,
            )}
          >
            {labels.previous}
          </Link>
        ) : (
          <span>{labels.previous}</span>
        )}
      </Button>
      <p className="text-muted-foreground text-sm">
        {formatMessage(labels.pageOf, {
          page: formatInteger(locale, page),
          total: formatInteger(locale, totalPages),
        })}
      </p>
      <Button
        variant="outline"
        disabled={page >= totalPages}
        asChild={page < totalPages}
      >
        {page < totalPages ? (
          <Link
            href={localizeInternalPath(
              pageHref(pathname, page + 1, search),
              locale,
            )}
          >
            {labels.next}
          </Link>
        ) : (
          <span>{labels.next}</span>
        )}
      </Button>
    </nav>
  );
}
