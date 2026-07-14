import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ExternalLink,
  MapPin,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { safeHttpUrlSchema } from "@/features/recruiter-company/schemas";
import { getPublishedCompanyBySlug } from "@/features/recruiter-company/server/data";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/companies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  const company = await getPublishedCompanyBySlug(getPrismaClient(), slug);
  if (!company) {
    return { title: metadata.companyDetail.title };
  }
  return {
    title: company.name,
    description:
      company.tagline ??
      company.description ??
      metadata.companyDetail.description,
    alternates: buildLocaleAlternates(`/companies/${slug}`, locale),
  };
}

export default async function PublicCompanyPage({
  params,
}: PageProps<"/[locale]/companies/[slug]">) {
  await connection();
  const { slug } = await params;
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.companyDetail;
  const company = await getPublishedCompanyBySlug(getPrismaClient(), slug);
  if (!company) notFound();
  const website = safeHttpUrlSchema.safeParse(company.websiteUrl ?? "");

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      <div
        aria-hidden="true"
        className="hero-grid absolute inset-x-0 top-0 -z-10 h-96"
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href={localizeInternalPath("/companies", locale)}>
            <ArrowLeft aria-hidden="true" />
            {t.allCompanies}
          </Link>
        </Button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold">
            {company.name.slice(0, 2).toLocaleUpperCase()}
          </span>
          <div>
            <Badge variant="secondary">{t.publicProfileBadge}</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {company.name}
            </h1>
            {company.tagline ? (
              <p className="text-muted-foreground mt-3 text-xl leading-8">
                {company.tagline}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>
                {formatMessage(t.about, { companyName: company.name })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-8 whitespace-pre-line">
                {company.description}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.details}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="flex items-start gap-3">
                <Building2
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 size-4"
                />
                <span>
                  <span className="text-muted-foreground block">
                    {t.industry}
                  </span>
                  <span className="font-medium">{company.industry}</span>
                </span>
              </p>
              <p className="flex items-start gap-3">
                <MapPin
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 size-4"
                />
                <span>
                  <span className="text-muted-foreground block">
                    {t.headquarters}
                  </span>
                  <span className="font-medium">{company.headquarters}</span>
                </span>
              </p>
              {company.companySize ? (
                <p className="flex items-start gap-3">
                  <UsersRound
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4"
                  />
                  <span>
                    <span className="text-muted-foreground block">
                      {t.companySize}
                    </span>
                    <span className="font-medium">
                      {dictionary.labels.companySize[company.companySize]}
                    </span>
                  </span>
                </p>
              ) : null}
              {company.foundedYear ? (
                <p className="flex items-start gap-3">
                  <CalendarDays
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4"
                  />
                  <span>
                    <span className="text-muted-foreground block">
                      {t.founded}
                    </span>
                    <span className="font-medium">{company.foundedYear}</span>
                  </span>
                </p>
              ) : null}
              {website.success && website.data ? (
                <Button variant="outline" className="mt-1" asChild>
                  <a
                    href={website.data}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {t.visitWebsite}
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 border-dashed">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <BriefcaseBusiness
              aria-hidden="true"
              className="text-muted-foreground size-9"
            />
            <h2 className="mt-4 text-xl font-semibold">{t.jobsComingTitle}</h2>
            <p className="text-muted-foreground mt-2 max-w-xl leading-7">
              {t.jobsComingDescription}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
