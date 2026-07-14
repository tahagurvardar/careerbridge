import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import type { AppDictionary } from "@/i18n/dictionary";
import { DEFAULT_LOCALE, isRouteLocale, type RouteLocale } from "@/i18n/config";
import { LOCALE_COOKIE_NAME } from "@/i18n/cookie";

// Strict allow-list of dictionary loaders. Locale values are validated before
// ever reaching this map, and the map itself is the only place dictionaries
// are imported — no user value can construct an import path. Dynamic imports
// keep each request loading only its active locale.
const dictionaryLoaders: Record<RouteLocale, () => Promise<AppDictionary>> = {
  en: () => import("./dictionaries/en").then((module) => module.dictionary),
  tr: () => import("./dictionaries/tr").then((module) => module.dictionary),
  az: () => import("./dictionaries/az").then((module) => module.dictionary),
  ru: () => import("./dictionaries/ru").then((module) => module.dictionary),
};

// Loaded-dictionary promises are static content (no request or user data), so
// module-level memoization is safe shared state across requests.
const loadedDictionaries = new Map<RouteLocale, Promise<AppDictionary>>();

export function getDictionary(locale: RouteLocale): Promise<AppDictionary> {
  const safeLocale = isRouteLocale(locale) ? locale : DEFAULT_LOCALE;
  let dictionary = loadedDictionaries.get(safeLocale);
  if (!dictionary) {
    dictionary = dictionaryLoaders[safeLocale]();
    loadedDictionaries.set(safeLocale, dictionary);
  }
  return dictionary;
}

/**
 * Validates a `[locale]` route parameter. Pages and layouts call this before
 * loading any dictionary, so an arbitrary value never reaches an import and an
 * unknown prefix renders the safe not-found boundary.
 */
export function resolvePageLocale(value: string): RouteLocale {
  if (!isRouteLocale(value)) notFound();
  return value;
}

/**
 * Per-request display locale for code without route params (Server Actions,
 * shared server helpers). Reads the `x-cb-locale` request header stamped by
 * the proxy from the validated URL locale, then the locale cookie, then the
 * English default. React `cache` keeps the value request-isolated — never a
 * module-global.
 */
export const getRequestLocale = cache(async (): Promise<RouteLocale> => {
  const headerStore = await headers();
  const fromProxy = headerStore.get("x-cb-locale");
  if (isRouteLocale(fromProxy)) return fromProxy;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (isRouteLocale(fromCookie)) return fromCookie;

  return DEFAULT_LOCALE;
});

/** Dictionary for the current request locale (Server Actions and helpers). */
export async function getRequestDictionary(): Promise<{
  locale: RouteLocale;
  dictionary: AppDictionary;
}> {
  const locale = await getRequestLocale();
  return { locale, dictionary: await getDictionary(locale) };
}
