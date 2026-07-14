// Central locale domain for CareerBridge internationalization.
//
// Everything locale-shaped flows through the explicit mappings in this module:
// lowercase route codes (URL prefixes), database enum values (AppLocale),
// BCP 47 Intl locales (formatting), and native display names. Locale values
// are never inferred from arbitrary strings — unknown input collapses to the
// English default through the validating helpers below. Locale is presentation
// state only and never carries authorization meaning.

import type { AppLocale } from "@/generated/prisma/enums";

export const ROUTE_LOCALES = ["en", "tr", "az", "ru"] as const;
export type RouteLocale = (typeof ROUTE_LOCALES)[number];

export const DEFAULT_LOCALE = "en" satisfies RouteLocale;

export interface LocaleDefinition {
  /** Lowercase URL route prefix, e.g. `tr` in `/tr/jobs`. */
  routeCode: RouteLocale;
  /** Database enum value stored on User/Notification/EmailOutbox rows. */
  dbValue: AppLocale;
  /** BCP 47 locale passed to every Intl formatter. */
  intlLocale: string;
  /** Native language name shown in the language switcher. */
  nativeName: string;
  /** `<html lang>` attribute for routes rendered in this locale. */
  htmlLang: string;
  /** Text direction. All four initial locales are left-to-right. */
  dir: "ltr";
}

export const localeDefinitions: Record<RouteLocale, LocaleDefinition> = {
  en: {
    routeCode: "en",
    dbValue: "EN",
    intlLocale: "en-US",
    nativeName: "English",
    htmlLang: "en",
    dir: "ltr",
  },
  tr: {
    routeCode: "tr",
    dbValue: "TR",
    intlLocale: "tr-TR",
    nativeName: "Türkçe",
    htmlLang: "tr",
    dir: "ltr",
  },
  az: {
    routeCode: "az",
    dbValue: "AZ",
    intlLocale: "az-AZ",
    nativeName: "Azərbaycanca",
    htmlLang: "az",
    dir: "ltr",
  },
  ru: {
    routeCode: "ru",
    dbValue: "RU",
    intlLocale: "ru-RU",
    nativeName: "Русский",
    htmlLang: "ru",
    dir: "ltr",
  },
};

export function isRouteLocale(value: unknown): value is RouteLocale {
  return (
    typeof value === "string" &&
    (ROUTE_LOCALES as readonly string[]).includes(value)
  );
}

/** Validates arbitrary input into a supported route locale, else the default. */
export function toRouteLocale(value: unknown): RouteLocale {
  return isRouteLocale(value) ? value : DEFAULT_LOCALE;
}

export function routeLocaleToDb(locale: RouteLocale): AppLocale {
  return localeDefinitions[locale].dbValue;
}

/**
 * Maps a stored database locale back to its route code. Unknown or missing
 * values fall back to English so historical rows and defensive reads always
 * resolve deterministically.
 */
export function dbLocaleToRoute(
  value: AppLocale | null | undefined,
): RouteLocale {
  switch (value) {
    case "TR":
      return "tr";
    case "AZ":
      return "az";
    case "RU":
      return "ru";
    case "EN":
    default:
      return "en";
  }
}

export function getIntlLocale(locale: RouteLocale): string {
  return localeDefinitions[locale].intlLocale;
}

export function getHtmlLang(locale: RouteLocale): string {
  return localeDefinitions[locale].htmlLang;
}

export function getNativeLocaleName(locale: RouteLocale): string {
  return localeDefinitions[locale].nativeName;
}
