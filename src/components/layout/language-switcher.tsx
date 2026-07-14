"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";

import {
  getNativeLocaleName,
  ROUTE_LOCALES,
  type RouteLocale,
} from "@/i18n/config";
import { setLocalePreferenceAction } from "@/i18n/actions";
import { useLocale } from "@/i18n/client";
import { localizeInternalPath } from "@/i18n/paths";
import { cn } from "@/lib/utils";

export interface LanguageSwitcherLabels {
  label: string;
  ariaLabel: string;
  updating: string;
}

/**
 * Native-name language selector. Switching persists the choice through the
 * dedicated server action (cookie for guests, cookie + User.preferredLocale
 * for authenticated users), then replaces only the locale segment of the
 * current URL — the route, dynamic IDs, and query string (search, filters,
 * pagination, analytics ranges) are preserved. The target path is built from
 * the router's own pathname through the safe internal-path helper, so no
 * open redirect is possible.
 */
export function LanguageSwitcher({
  labels,
  className,
}: {
  labels: LanguageSwitcherLabels;
  className?: string;
}) {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function switchTo(nextLocale: RouteLocale) {
    if (nextLocale === activeLocale || pending) return;

    startTransition(async () => {
      await setLocalePreferenceAction({ locale: nextLocale });
      const query = searchParams.toString();
      const target = localizeInternalPath(
        query ? `${pathname}?${query}` : pathname,
        nextLocale,
      );
      // The locale layout owns the document's <html lang>. A document-level
      // replace makes that root-language transition explicit and prevents
      // client-only providers (notably next-themes' bootstrap script) from
      // being re-inserted during an RSC layout update.
      window.location.replace(target);
    });
  }

  return (
    <div className={cn("relative", className)}>
      <label className="sr-only" htmlFor="cb-language-switcher">
        {labels.label}
      </label>
      <Languages
        aria-hidden="true"
        className={cn(
          "text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2",
          pending && "animate-pulse",
        )}
      />
      <select
        id="cb-language-switcher"
        aria-label={labels.ariaLabel}
        aria-busy={pending}
        title={pending ? labels.updating : labels.label}
        disabled={pending}
        value={activeLocale}
        onChange={(event) => switchTo(event.target.value as RouteLocale)}
        className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-9 appearance-none rounded-lg border py-1 pr-3 pl-8 text-sm font-medium outline-none focus-visible:ring-3 disabled:opacity-60"
      >
        {ROUTE_LOCALES.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {getNativeLocaleName(locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
