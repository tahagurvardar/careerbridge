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
import {
  companySizeLabels,
  publicCompanySearchSchema,
} from "@/features/recruiter-company/schemas";
import { getPublishedCompanies } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Companies",
  description: "Discover published company profiles on CareerBridge.",
};

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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
        eyebrow="Company discovery"
        title="Learn how teams work before you apply."
        description="Browse public company profiles shared by authorized workspace owners. Publication means the profile is visible; it is not a CareerBridge verification claim."
      />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Search companies</CardTitle>
            <CardDescription>
              Filter published profiles by name, industry, or headquarters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              method="get"
              className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-end"
            >
              <label className="grid gap-2 text-sm font-medium" htmlFor="q">
                Company name
                <Input
                  id="q"
                  name="q"
                  defaultValue={search.q}
                  maxLength={100}
                  placeholder="Search by name"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="industry"
              >
                Industry
                <Input
                  id="industry"
                  name="industry"
                  defaultValue={search.industry}
                  maxLength={100}
                  placeholder="e.g. Fintech"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="headquarters"
              >
                Headquarters
                <Input
                  id="headquarters"
                  name="headquarters"
                  defaultValue={search.headquarters}
                  maxLength={100}
                  placeholder="e.g. Baku"
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit">
                  <Search aria-hidden="true" />
                  Search
                </Button>
                {hasFilters ? (
                  <Button variant="outline" size="icon" asChild>
                    <Link href="/companies" aria-label="Clear company filters">
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
              Published companies
            </h2>
            <p className="text-muted-foreground mt-1 text-sm" role="status">
              {companies.length} {companies.length === 1 ? "result" : "results"}
            </p>
          </div>
          {hasFilters ? (
            <Button variant="ghost" asChild>
              <Link href="/companies">Clear filters</Link>
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
                      href={`/companies/${company.slug}`}
                      className="hover:text-primary focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {company.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {company.industry || "Industry not specified"}
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
                        {companySizeLabels[company.companySize]}
                      </p>
                    ) : null}
                  </div>
                  <Button variant="outline" asChild>
                    <Link href={`/companies/${company.slug}`}>
                      <Building2 aria-hidden="true" />
                      View profile
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
              <h2 className="mt-4 text-xl font-semibold">
                No published companies found
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl leading-7">
                {hasFilters
                  ? "Try broader search terms or clear the filters."
                  : "Company profiles will appear here after an owner publishes a complete profile."}
              </p>
              {hasFilters ? (
                <Button variant="outline" className="mt-5" asChild>
                  <Link href="/companies">Clear filters</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </section>
    </>
  );
}
