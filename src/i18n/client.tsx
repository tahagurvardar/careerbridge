"use client";

// Client-side locale context. Client Components never receive whole
// dictionaries through this module — the server passes only the translated
// strings or namespace slices they need as props. The context carries just
// the active route locale so links and formatters stay consistent.

import Link from "next/link";
import { createContext, useContext, type ComponentProps } from "react";

import { DEFAULT_LOCALE, type RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";

const LocaleContext = createContext<RouteLocale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: RouteLocale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): RouteLocale {
  return useContext(LocaleContext);
}

type LocaleLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/**
 * Drop-in replacement for `next/link` that prefixes internal string hrefs
 * with the active locale through the safe path helper. External or malformed
 * values collapse to the localized home page rather than escaping the origin.
 */
export function LocaleLink({ href, ...props }: LocaleLinkProps) {
  const locale = useLocale();
  return <Link {...props} href={localizeInternalPath(href, locale)} />;
}
