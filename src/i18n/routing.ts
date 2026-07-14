// Pure, database-free locale routing helpers shared by the proxy, server
// components, and the language switcher. Nothing here reads cookies, headers,
// or the database directly — callers pass those values in, keeping every
// function deterministic and unit-testable.

import {
  DEFAULT_LOCALE,
  isRouteLocale,
  ROUTE_LOCALES,
  type RouteLocale,
} from "@/i18n/config";

/** Returns the leading locale segment of a pathname, or null when absent. */
export function getPathnameLocale(pathname: string): RouteLocale | null {
  const segment = pathname.split("/")[1] ?? "";
  return isRouteLocale(segment) ? segment : null;
}

export function pathnameHasLocale(pathname: string): boolean {
  return getPathnameLocale(pathname) !== null;
}

/**
 * Removes one leading supported-locale segment, returning the canonical
 * locale-neutral pathname. `/tr/jobs` becomes `/jobs`; `/tr` becomes `/`;
 * already-canonical paths pass through unchanged.
 */
export function stripLocalePrefix(pathname: string): string {
  const locale = getPathnameLocale(pathname);
  if (!locale) return pathname;
  const stripped = pathname.slice(locale.length + 1);
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

/**
 * Prefixes a canonical pathname with exactly one locale segment. An existing
 * supported-locale prefix is replaced rather than stacked, so the result is
 * never double-prefixed.
 */
export function localizePathname(
  pathname: string,
  locale: RouteLocale,
): string {
  const canonical = stripLocalePrefix(pathname);
  return canonical === "/" ? `/${locale}` : `/${locale}${canonical}`;
}

// Accept-Language matching. Only exact primary-subtag matches against the
// four supported locales count; anything else falls through so the caller can
// apply the English default. Parsing is bounded and deterministic — no
// external negotiation library and no fuzzy inference from arbitrary strings.
const ACCEPT_LANGUAGE_MAX_ENTRIES = 12;

export function parseAcceptLanguage(
  header: string | null | undefined,
): RouteLocale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .slice(0, ACCEPT_LANGUAGE_MAX_ENTRIES)
    .map((entry) => {
      const [tagPart, ...params] = entry.trim().split(";");
      const tag = (tagPart ?? "").trim().toLowerCase();
      let quality = 1;
      for (const param of params) {
        const [key, value] = param.trim().split("=");
        if (key === "q") {
          const parsed = Number.parseFloat(value ?? "");
          quality = Number.isFinite(parsed)
            ? Math.min(1, Math.max(0, parsed))
            : 0;
        }
      }
      return { tag, quality };
    })
    .filter((candidate) => candidate.tag.length > 0 && candidate.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const candidate of candidates) {
    const primary = candidate.tag.split("-")[0];
    if (isRouteLocale(primary)) return primary;
  }
  return null;
}

/**
 * Resolution for locale-neutral entry, in documented priority order:
 *
 * 1. the caller-provided preferred locale (an authenticated user's stored
 *    preference is mirrored into the locale cookie by the sign-in and
 *    locale-change actions, so the cookie tier already reflects it),
 * 2. a valid locale cookie value,
 * 3. the best supported Accept-Language match,
 * 4. the English default.
 *
 * Invalid values at any tier fall through safely instead of erroring.
 */
export function resolveLocaleForNeutralPath(input: {
  preferredLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguageHeader?: string | null;
}): RouteLocale {
  if (isRouteLocale(input.preferredLocale)) return input.preferredLocale;
  if (isRouteLocale(input.cookieLocale)) return input.cookieLocale;
  return parseAcceptLanguage(input.acceptLanguageHeader) ?? DEFAULT_LOCALE;
}

// Path classes the locale layer must never touch: API routes (including
// Better Auth and the internal email dispatcher), Next.js internals, and
// static files. The proxy matcher excludes most of these already; these
// checks keep the behavior explicit and unit-testable.
const EXCLUDED_PATH_PREFIXES = ["/api/", "/_next/"] as const;
const EXCLUDED_EXACT_PATHS = ["/api", "/_next"] as const;

export function isLocaleExemptPath(pathname: string): boolean {
  if (
    (EXCLUDED_EXACT_PATHS as readonly string[]).includes(pathname) ||
    EXCLUDED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return true;
  }
  // Static assets (anything with a file extension in its final segment).
  const finalSegment = pathname.split("/").pop() ?? "";
  return finalSegment.includes(".");
}

export const SUPPORTED_LOCALE_PREFIX_PATTERN = `/(${ROUTE_LOCALES.join("|")})`;
