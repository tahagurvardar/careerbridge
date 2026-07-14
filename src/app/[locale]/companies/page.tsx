import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, Search, UsersRound, X } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { publicCompanySearchSchema } from "@/features/recruiter-company/schemas";
import { getPublishedCompanies } from "@/features/recruiter-company/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/companies">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  return {
    title: metadata.companies.title,
    description: metadata.companies.description,
    alternates: buildLocaleAlternates("/companies", locale),
  };
}

export default async function CompaniesPage({
  params,
  searchParams,
}: PageProps<"/[locale]/companies">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.companies;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);

  const raw = await searchParams;
  const parsed = publicCompanySearchSchema.safeParse(raw);
  const search = parsed.success
    ? parsed.data
    : { q: "", industry: "", headquarters: "" };
  const companies = await getPublishedCompanies(getPrismaClient(), search);
  const hasFilters = Boolean(
    search.q || search.industry || search.headquarters,
  );

  return (
    <>
      <PageIntro
        eyebrow={t.introEyebrow}
        title={t.introTitle}
        description={t.introDescription}
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>{t.searchTitle}</CardTitle>
            <CardDescription>{t.searchDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              method="get"
              className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end"
            >
              <label className="grid gap-2 text-sm font-medium" htmlFor="q">
                {t.nameLabel}
                <Input
                  id="q"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder={t.namePlaceholder}
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="industry"
              >
                {t.industryLabel}
                <Input
                  id="industry"
                  name="industry"
                  defaultValue={search.industry}
                  maxLength={100}
                  placeholder={t.industryPlaceholder}
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="headquarters"
              >
                {t.headquartersLabel}
                <Input
                  id="headquarters"
                  name="headquarters"
                  defaultValue={search.headquarters}
                  maxLength={100}
                  placeholder={t.headquartersPlaceholder}
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  {dictionary.common.actions.search}
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link
                      href={localize("/companies")}
                      aria-label={t.clearFiltersAria}
                    >
                      <X aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t.publishedCompanies}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm" role="status">
              {formatCount(locale, companies.length, t.resultCount)}
            </p>
          </div>
          {hasFilters ? (
            <Button variant="ghost" asChild>
              <Link href={localize("/companies")}>
                {dictionary.common.actions.clearFilters}
              </Link>
            </Button>
          ) : null}
        </div>

        {companies.length ? (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="h-full">
                <CardHeader>
                  <span className="bg-primary text-primary-foreground mb-3 flex size-12 items-center justify-center rounded-xl font-semibold">
                    {company.name.slice(0, 2).toLocaleUpperCase()}
                  </span>
                  <CardTitle className="text-lg">
                    <Link
                      href={localize(`/companies/${company.slug}`)}
                      className="hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {company.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {company.industry || t.industryNotSpecified}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  <p className="text-muted-foreground line-clamp-4 leading-6">
                    {company.tagline || company.description}
                  </p>
                  <div className="text-muted-foreground mt-auto grid gap-2 text-sm">
                    {company.headquarters ? (
                      <p className="flex items-center gap-2">
                        <MapPin aria-hidden="true" className="size-4" />
                        {company.headquarters}
                      </p>
                    ) : null}
                    {company.companySize ? (
                      <p className="flex items-center gap-2">
                        <UsersRound aria-hidden="true" className="size-4" />
                        {labels.companySize[company.companySize]}
                      </p>
                    ) : null}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={localize(`/companies/${company.slug}`)}>
                      <Building2 aria-hidden="true" />
                      {t.viewProfile}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-6 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <Building2
                aria-hidden="true"
                className="text-muted-foreground size-10"
              />
              <h2 className="mt-4 text-xl font-semibold">{t.emptyTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-xl leading-7">
                {hasFilters ? t.emptyFiltered : t.emptyNone}
              </p>
              {hasFilters ? (
                <Button variant="outline" className="mt-5" asChild>
                  <Link href={localize("/companies")}>
                    {dictionary.common.actions.clearFilters}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
