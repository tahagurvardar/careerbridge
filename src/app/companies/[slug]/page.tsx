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
import {
  companySizeLabels,
  safeHttpUrlSchema,
} from "@/features/recruiter-company/schemas";
import { getPublishedCompanyBySlug } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Company profile",
  description: "View a published Company profile on CareerBridge.",
};

export default async function PublicCompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await connection();
  const { slug } = await params;
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
          <Link href="/companies">
            <ArrowLeft aria-hidden="true" />
            All companies
          </Link>
        </Button>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span className="bg-primary text-primary-foreground flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold">
            {company.name.slice(0, 2).toLocaleUpperCase()}
          </span>
          <div>
            <Badge variant="secondary">Public company profile</Badge>
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
              <CardTitle>About {company.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-8 whitespace-pre-line">
                {company.description}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Company details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <p className="flex items-start gap-3">
                <Building2
                  aria-hidden="true"
                  className="text-muted-foreground mt-0.5 size-4"
                />
                <span>
                  <span className="text-muted-foreground block">Industry</span>
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
                    Headquarters
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
                      Company size
                    </span>
                    <span className="font-medium">
                      {companySizeLabels[company.companySize]}
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
                    <span className="text-muted-foreground block">Founded</span>
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
                    Visit website
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
            <h2 className="mt-4 text-xl font-semibold">
              Job listings coming next
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl leading-7">
              CareerBridge does not show placeholder roles. Real company job
              listings will arrive with the dedicated Job domain.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
