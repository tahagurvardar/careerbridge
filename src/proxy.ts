// Locale routing proxy (Next.js 16 `proxy` convention — the renamed
// `middleware` file). Responsibilities, in order:
//
// 1. Locale-prefixed page requests pass through with the validated locale
//    stamped into the `x-cb-locale` request header so Server Actions and
//    shared server code can localize without route params.
// 2. Locale-neutral page requests (legacy URLs, stored notification hrefs,
//    email links, canonical redirects) 307-redirect to the equivalent
//    locale-prefixed URL, preserving the query string. The locale comes from
//    the validated `cb_locale` cookie, then the best supported
//    Accept-Language match, then English. The cookie mirrors an authenticated
//    user's stored preference (sign-in and the locale action keep it in
//    sync), so this stays deterministic and database-free.
//
// The matcher excludes API routes (Better Auth, document downloads, the email
// dispatcher), Next.js internals, and static files, so those are never
// redirected or rewritten. Redirect loops are impossible: prefixed paths never
// redirect, and every redirect target is prefixed. Locale is presentation
// only — authorization still happens in every route and Server Action.

import { NextResponse, type NextRequest } from "next/server";

import { LOCALE_COOKIE_NAME } from "@/i18n/cookie";
import {
  getPathnameLocale,
  isLocaleExemptPath,
  resolveLocaleForNeutralPath,
} from "@/i18n/routing";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Defense in depth alongside the matcher: never touch API or asset paths.
  if (isLocaleExemptPath(pathname)) {
    return NextResponse.next();
  }

  const urlLocale = getPathnameLocale(pathname);

  if (urlLocale) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-cb-locale", urlLocale);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const locale = resolveLocaleForNeutralPath({
    cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
    acceptLanguageHeader: request.headers.get("accept-language"),
  });

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname =
    pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  // 307 keeps the method and body (Server Function POSTs) and stays temporary
  // so the redirect target can follow the cookie when the user changes locale.
  return NextResponse.redirect(redirectUrl, 307);
}

export const config = {
  matcher: [
    /*
     * Run on every request except:
     * - /api/* (Better Auth, document downloads, internal email dispatcher)
     * - Next.js internals (_next/static, _next/image)
     * - files with an extension (favicon.ico, icon.svg, fonts, images)
     */
    "/((?!api|_next/static|_next/image|.*\\..*).*)",
  ],
};
