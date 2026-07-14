import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { getHtmlLang, localeDefinitions, ROUTE_LOCALES } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/client";
import { getDictionary, resolvePageLocale } from "@/i18n/server";

import "../globals.css";

// Turkish and Azerbaijani need latin-ext glyphs (ə ı İ ş ç ğ ö ü) and Russian
// needs Cyrillic; Geist ships all three subsets.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export function generateStaticParams() {
  return ROUTE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);

  return {
    title: {
      default: metadata.root.defaultTitle,
      template: metadata.root.template,
    },
    description: metadata.root.description,
    keywords: [
      "jobs",
      "internships",
      "career platform",
      "recruiting",
      "CareerBridge",
    ],
    openGraph: {
      title: metadata.root.ogTitle,
      description: metadata.root.ogDescription,
      type: "website",
      locale: localeDefinitions[locale].intlLocale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  // Validates the URL segment before any dictionary import; unknown prefixes
  // render the not-found boundary instead of reaching a loader.
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);

  return (
    <html
      lang={getHtmlLang(locale)}
      dir={localeDefinitions[locale].dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col antialiased">
        <ThemeProvider>
          <LocaleProvider locale={locale}>
            <a
              href="#main-content"
              className="bg-background text-foreground focus-visible:ring-ring sr-only z-[100] rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus-visible:ring-2"
            >
              {dictionary.common.skipToContent}
            </a>
            <SiteHeader locale={locale} />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <SiteFooter locale={locale} />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
