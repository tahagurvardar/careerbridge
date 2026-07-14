import type { MetadataRoute } from "next";

import { ROUTE_LOCALES } from "@/i18n/config";
import { resolveApplicationOrigin } from "@/lib/env/server";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ROUTE_LOCALES.flatMap((locale) => [
    `/${locale}/admin/`,
    `/${locale}/candidate/`,
    `/${locale}/recruiter/`,
    `/${locale}/notifications`,
    `/${locale}/settings/`,
    `/${locale}/login`,
    `/${locale}/register`,
  ]);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...privatePaths],
    },
    sitemap: new URL("/sitemap.xml", resolveApplicationOrigin()).toString(),
  };
}
