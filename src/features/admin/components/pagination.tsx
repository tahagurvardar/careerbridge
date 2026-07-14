import Link from "next/link";

import { Button } from "@/components/ui/button";

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
}: {
  pathname: string;
  page: number;
  totalPages: number;
  search: Record<string, string | number>;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-4"
    >
      <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? (
          <Link href={pageHref(pathname, page - 1, search)}>Previous</Link>
        ) : (
          <span>Previous</span>
        )}
      </Button>
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </p>
      <Button
        variant="outline"
        disabled={page >= totalPages}
        asChild={page < totalPages}
      >
        {page < totalPages ? (
          <Link href={pageHref(pathname, page + 1, search)}>Next</Link>
        ) : (
          <span>Next</span>
        )}
      </Button>
    </nav>
  );
}
