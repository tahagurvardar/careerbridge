import type { MetadataRoute } from "next";

import {
  PUBLIC_COMPANY_VISIBILITY_WHERE,
  PUBLIC_JOB_VISIBILITY_WHERE,
} from "@/features/admin/moderation";
import { getHtmlLang, ROUTE_LOCALES } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { resolveApplicationOrigin } from "@/lib/env/server";
import { getPrismaClient } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_SITEMAP_RECORDS_PER_TYPE = 5_000;

function localizedEntries(
  origin: string,
  path: string,
  lastModified?: Date,
): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    ROUTE_LOCALES.map((locale) => [
      getHtmlLang(locale),
      new URL(localizeInternalPath(path, locale), origin).toString(),
    ]),
  );

  return ROUTE_LOCALES.map((locale) => ({
    url: new URL(localizeInternalPath(path, locale), origin).toString(),
    lastModified,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = resolveApplicationOrigin();
  const prisma = getPrismaClient();
  const [companies, jobs] = await Promise.all([
    prisma.company.findMany({
      where: PUBLIC_COMPANY_VISIBILITY_WHERE,
      select: { slug: true, updatedAt: true },
      orderBy: { id: "asc" },
      take: MAX_SITEMAP_RECORDS_PER_TYPE,
    }),
    prisma.job.findMany({
      where: PUBLIC_JOB_VISIBILITY_WHERE,
      select: { slug: true, updatedAt: true },
      orderBy: { id: "asc" },
      take: MAX_SITEMAP_RECORDS_PER_TYPE,
    }),
  ]);

  return [
    ...localizedEntries(origin, "/"),
    ...localizedEntries(origin, "/jobs"),
    ...localizedEntries(origin, "/companies"),
    ...companies.flatMap((company) =>
      localizedEntries(origin, `/companies/${company.slug}`, company.updatedAt),
    ),
    ...jobs.flatMap((job) =>
      localizedEntries(origin, `/jobs/${job.slug}`, job.updatedAt),
    ),
  ];
}
