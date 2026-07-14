import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  ExternalLink,
  Mail,
  Pencil,
  Plus,
  UserRound,
} from "lucide-react";

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
import { safeHttpUrlSchema } from "@/features/recruiter-company/schemas";
import { getRecruiterProfileWorkspace } from "@/features/recruiter-company/server/data";
import { formatCount } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/profile">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.profile.badge,
    description: recruiter.profile.editDescription,
  };
}

function getFeedback(value: string | string[] | undefined) {
  return value === "1";
}

export default async function RecruiterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ updated?: string | string[] }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.profile;
  const session = await requireRole("RECRUITER", "/recruiter/profile");
  const [[profile, memberships], query] = await Promise.all([
    getRecruiterProfileWorkspace(getPrismaClient(), session.user.id),
    searchParams,
  ]);
  const feedback = getFeedback(query.updated);
  const linkedin = safeHttpUrlSchema.safeParse(profile?.linkedinUrl ?? "");

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      <div
        aria-hidden="true"
        className="hero-grid absolute inset-x-0 top-0 -z-10 h-96"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {feedback ? (
          <div
            className="bg-primary/10 text-primary border-primary/20 mb-6 rounded-xl border px-4 py-3 text-sm"
            role="status"
          >
            {t.saved}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t.badge}</Badge>
              <span className="text-muted-foreground text-sm">
                {t.privateLabel}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {session.user.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {profile?.jobTitle || t.fallbackTitle}
            </p>
            <p className="text-muted-foreground mt-4 inline-flex items-center gap-2 text-sm">
              <Mail aria-hidden="true" className="size-4" />
              {session.user.email}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link
              href={localizeInternalPath("/recruiter/profile/edit", locale)}
            >
              <Pencil aria-hidden="true" />
              {t.edit}
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                {t.informationTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p
                className={
                  profile?.bio
                    ? "leading-7 whitespace-pre-line"
                    : "text-muted-foreground leading-7"
                }
              >
                {profile?.bio || t.bioFallback}
              </p>
              {linkedin.success && linkedin.data ? (
                <Button variant="outline" size="sm" className="w-fit" asChild>
                  <a
                    href={linkedin.data}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    LinkedIn
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 aria-hidden="true" className="text-primary size-5" />
                {t.companiesTitle}
              </CardTitle>
              <CardDescription>
                {formatCount(locale, memberships.length, t.companiesCount)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {memberships.length ? (
                <ul className="grid gap-2">
                  {memberships.map(({ company, role }) => (
                    <li key={company.id}>
                      <Link
                        href={localizeInternalPath(
                          `/recruiter/companies/${company.id}`,
                          locale,
                        )}
                        className="hover:bg-muted focus-visible:ring-ring flex items-center justify-between rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="truncate font-medium">
                          {company.name}
                        </span>
                        <Badge variant="outline">
                          {dictionary.labels.companyRole[role]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  {t.noCompanies}
                </p>
              )}
              <div className="grid gap-2">
                <Button asChild>
                  <Link
                    href={localizeInternalPath("/recruiter/companies", locale)}
                  >
                    <Building2 aria-hidden="true" />
                    {t.manageCompanies}
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link
                    href={localizeInternalPath(
                      "/recruiter/companies/new",
                      locale,
                    )}
                  >
                    <Plus aria-hidden="true" />
                    {t.createCompany}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
