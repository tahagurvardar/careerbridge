import { describe, expect, it } from "vitest";

import {
  dbLocaleToRoute,
  getIntlLocale,
  localeDefinitions,
  routeLocaleToDb,
  ROUTE_LOCALES,
  toRouteLocale,
} from "@/i18n/config";
import { getLocaleCookieOptions, LOCALE_COOKIE_NAME } from "@/i18n/cookie";
import { canonicalizeInternalPath, localizeInternalPath } from "@/i18n/paths";
import {
  isLocaleExemptPath,
  localizePathname,
  parseAcceptLanguage,
  resolveLocaleForNeutralPath,
  stripLocalePrefix,
} from "@/i18n/routing";

describe("locale configuration and routing", () => {
  it("maps route, database, Intl, and html locale values bijectively", () => {
    expect(ROUTE_LOCALES).toEqual(["en", "tr", "az", "ru"]);
    expect(ROUTE_LOCALES.map(getIntlLocale)).toEqual([
      "en-US",
      "tr-TR",
      "az-AZ",
      "ru-RU",
    ]);
    for (const locale of ROUTE_LOCALES) {
      expect(dbLocaleToRoute(routeLocaleToDb(locale))).toBe(locale);
      expect(localeDefinitions[locale].htmlLang).toBe(locale);
    }
    expect(toRouteLocale("../../ru")).toBe("en");
  });

  it("detects locales by priority and bounded Accept-Language quality", () => {
    expect(parseAcceptLanguage("de-DE, tr-TR;q=0.8, ru;q=0.9")).toBe("ru");
    expect(parseAcceptLanguage("az-AZ;q=0, en-US;q=0.5")).toBe("en");
    expect(
      resolveLocaleForNeutralPath({
        preferredLocale: "tr",
        cookieLocale: "ru",
      }),
    ).toBe("tr");
    expect(
      resolveLocaleForNeutralPath({
        preferredLocale: "bad",
        cookieLocale: "az",
      }),
    ).toBe("az");
  });

  it("prefixes exactly once and preserves safe query/hash suffixes", () => {
    expect(localizePathname("/jobs", "tr")).toBe("/tr/jobs");
    expect(localizePathname("/ru/jobs", "az")).toBe("/az/jobs");
    expect(stripLocalePrefix("/tr")).toBe("/");
    expect(localizeInternalPath("/ru/jobs?q=c%2B%2B#results", "tr")).toBe(
      "/tr/jobs?q=c%2B%2B#results",
    );
    expect(canonicalizeInternalPath("/az/jobs?page=2")).toBe("/jobs?page=2");
    expect(localizeInternalPath("https://evil.example", "ru")).toBe("/ru");
  });

  it("exempts APIs, framework assets, and static/private file paths", () => {
    for (const path of [
      "/api/auth/session",
      "/api/internal/email/dispatch",
      "/_next/static/app.js",
      "/resume.pdf",
    ]) {
      expect(isLocaleExemptPath(path), path).toBe(true);
    }
    expect(isLocaleExemptPath("/jobs/software-engineer")).toBe(false);
  });

  it("uses a server-only, bounded locale cookie contract", () => {
    expect(LOCALE_COOKIE_NAME).toBe("cb_locale");
    expect(getLocaleCookieOptions()).toMatchObject({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
    });
  });
});
