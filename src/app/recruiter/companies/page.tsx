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
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiter companies",
  description: "View the companies in your recruiter workspace.",
};

export default async function RecruiterCompaniesPage() {
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
            <Badge variant="secondary">Recruiter workspace</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Your companies
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Open a private company workspace or create a company you are
              authorized to own.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/recruiter/companies/new">
              <Plus aria-hidden="true" />
              Create company
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
                        {role === "OWNER" ? "Owner" : "Member"}
                      </Badge>
                      <Badge
                        variant={company.isPublished ? "default" : "secondary"}
                      >
                        {company.isPublished ? "Published" : "Private"}
                      </Badge>
                      {company.moderationStatus === "HIDDEN" ? (
                        <Badge variant="destructive">
                          Hidden by moderation
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <CardTitle className="mt-3">{company.name}</CardTitle>
                  <CardDescription>
                    {company.tagline ||
                      company.industry ||
                      "Company profile setup in progress"}
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
                    <Link href={`/recruiter/companies/${company.id}`}>
                      <Building2 aria-hidden="true" />
                      Open workspace
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
              <h2 className="mt-5 text-xl font-semibold">No companies yet</h2>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                Create a company profile. It will stay private until an owner
                explicitly publishes it.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/recruiter/companies/new">
                  Create your first company
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
