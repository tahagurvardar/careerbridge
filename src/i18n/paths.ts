// Safe locale-aware internal-path helper.
//
// Stored application destinations (Notification.href, EmailOutbox
// destinationPath, callbackPath values, navigation targets) stay canonical and
// locale-neutral. This module localizes them at render/navigation time only,
// after re-validating through the repository's safe-internal-path rules, so a
// hostile or malformed value can never become an open redirect or a
// double-prefixed URL.

import { getSafeInternalPath } from "@/features/auth/roles";
import type { RouteLocale } from "@/i18n/config";
import { localizePathname, stripLocalePrefix } from "@/i18n/routing";

/**
 * Validates a canonical internal path and prefixes it with exactly one locale
 * segment, preserving its query string and hash. Rejected values (external
 * URLs, protocol-relative URLs, `javascript:`/`data:` schemes, backslashes,
 * control characters, non-absolute paths) collapse to the localized fallback.
 * An existing supported-locale prefix is replaced, never stacked.
 */
export function localizeInternalPath(
  path: string,
  locale: RouteLocale,
  fallback = "/",
): string {
  const safeFallback = localizePathname(
    getSafeInternalPath(fallback, "/"),
    locale,
  );
  const safePath = getSafeInternalPath(path, "");
  if (!safePath) return safeFallback;

  const queryIndex = safePath.search(/[?#]/);
  const pathname = queryIndex === -1 ? safePath : safePath.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? "" : safePath.slice(queryIndex);

  return `${localizePathname(pathname, locale)}${suffix}`;
}

/**
 * Returns the canonical locale-neutral form of a safe internal path,
 * preserving query and hash. Unsafe values collapse to the fallback.
 */
export function canonicalizeInternalPath(path: string, fallback = "/"): string {
  const safePath = getSafeInternalPath(path, "");
  if (!safePath) return getSafeInternalPath(fallback, "/");

  const queryIndex = safePath.search(/[?#]/);
  const pathname = queryIndex === -1 ? safePath : safePath.slice(0, queryIndex);
  const suffix = queryIndex === -1 ? "" : safePath.slice(queryIndex);

  return `${stripLocalePrefix(pathname)}${suffix}`;
}
