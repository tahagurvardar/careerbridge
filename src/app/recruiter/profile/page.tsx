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
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiter profile",
  description: "Manage your professional recruiter profile and companies.",
};

function getFeedback(value: string | string[] | undefined) {
  return value === "Recruiter profile saved." ? value : null;
}

export default async function RecruiterProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string | string[] }>;
}) {
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
            {feedback}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Recruiter profile</Badge>
              <span className="text-muted-foreground text-sm">
                Private workspace profile
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {session.user.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {profile?.jobTitle || "Add your professional recruiting role."}
            </p>
            <p className="text-muted-foreground mt-4 inline-flex items-center gap-2 text-sm">
              <Mail aria-hidden="true" className="size-4" />
              {session.user.email}
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/recruiter/profile/edit">
              <Pencil aria-hidden="true" />
              Edit profile
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                Professional information
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
                {profile?.bio ||
                  "Add a concise professional bio describing your recruiting focus and experience."}
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
                Companies
              </CardTitle>
              <CardDescription>
                {memberships.length}{" "}
                {memberships.length === 1 ? "company" : "companies"} in your
                workspace
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {memberships.length ? (
                <ul className="grid gap-2">
                  {memberships.map(({ company, role }) => (
                    <li key={company.id}>
                      <Link
                        href={`/recruiter/companies/${company.id}`}
                        className="hover:bg-muted focus-visible:ring-ring flex items-center justify-between rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="truncate font-medium">
                          {company.name}
                        </span>
                        <Badge variant="outline">
                          {role === "OWNER" ? "Owner" : "Member"}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  You do not belong to a company yet.
                </p>
              )}
              <div className="grid gap-2">
                <Button asChild>
                  <Link href="/recruiter/companies">
                    <Building2 aria-hidden="true" />
                    Manage companies
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/recruiter/companies/new">
                    <Plus aria-hidden="true" />
                    Create company
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
