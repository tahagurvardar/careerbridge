import "server-only";

import { revalidatePath } from "next/cache";

import { ROUTE_LOCALES } from "@/i18n/config";
import { stripLocalePrefix } from "@/i18n/routing";

/**
 * Revalidates a canonical (locale-neutral) application path across every
 * locale variant of the route. Server Actions keep passing the same concrete
 * canonical paths they always did; this fans the invalidation out to
 * `/en/...`, `/tr/...`, `/az/...`, and `/ru/...` so no locale serves a stale
 * router-cache entry after a mutation.
 */
export function revalidateLocalizedPath(canonicalPath: string) {
  const canonical = stripLocalePrefix(canonicalPath);
  for (const locale of ROUTE_LOCALES) {
    revalidatePath(canonical === "/" ? `/${locale}` : `/${locale}${canonical}`);
  }
}
