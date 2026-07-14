// Public-page SEO helpers: canonical localized URL plus hreflang alternates
// for the four supported locales. Paths are relative; Next.js resolves them
// against the deployment's metadata base. Only public routes use these — no
// private data ever flows through metadata.

import type { Metadata } from "next";

import { getHtmlLang, ROUTE_LOCALES, type RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";

export function buildLocaleAlternates(
  canonicalPath: string,
  locale: RouteLocale,
): Metadata["alternates"] {
  return {
    canonical: localizeInternalPath(canonicalPath, locale),
    languages: Object.fromEntries(
      ROUTE_LOCALES.map((routeLocale) => [
        getHtmlLang(routeLocale),
        localizeInternalPath(canonicalPath, routeLocale),
      ]),
    ),
  };
}
