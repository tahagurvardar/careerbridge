import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/features/auth/server/session";
import { getRecruiterCompanies } from "@/features/recruiter-company/server/data";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/companies">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.companies.title,
    description: recruiter.companies.description,
  };
}

export default async function RecruiterCompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.companies;
  const session = await requireRole("RECRUITER", "/recruiter/companies");
  const memberships = await getRecruiterCompanies(
    getPrismaClient(),
    session.user.id,
  );

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">
              {dictionary.recruiter.shared.workspace}
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              {t.description}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link
              href={localizeInternalPath("/recruiter/companies/new", locale)}
            >
              <Plus aria-hidden="true" />
              {dictionary.recruiter.profile.createCompany}
            </Link>
          </Button>
        </div>

        {memberships.length ? (
          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {memberships.map(({ company, role }) => (
              <Card key={company.id} className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl font-semibold">
                      {company.name.slice(0, 2).toLocaleUpperCase()}
                    </span>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Badge variant="outline">
                        {dictionary.labels.companyRole[role]}
                      </Badge>
                      <Badge
                        variant={company.isPublished ? "default" : "secondary"}
                      >
                        {company.isPublished
                          ? dictionary.recruiter.shared.published
                          : dictionary.recruiter.shared.private}
                      </Badge>
                      {company.moderationStatus === "HIDDEN" ? (
                        <Badge variant="destructive">
                          {dictionary.recruiter.shared.hiddenByModeration}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardTitle className="mt-3">{company.name}</CardTitle>
                  <CardDescription>
                    {company.tagline || company.industry || t.setupFallback}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-5">
                  {company.headquarters ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <MapPin aria-hidden="true" className="size-4" />
                      {company.headquarters}
                    </p>
                  ) : null}
                  <Button className="mt-auto" asChild>
                    <Link
                      href={localizeInternalPath(
                        `/recruiter/companies/${company.id}`,
                        locale,
                      )}
                    >
                      <Building2 aria-hidden="true" />
                      {t.openWorkspace}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-9 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <Building2 aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">{t.emptyTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {t.emptyDescription}
              </p>
              <Button className="mt-6" asChild>
                <Link
                  href={localizeInternalPath(
                    "/recruiter/companies/new",
                    locale,
                  )}
                >
                  {t.createFirst}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
