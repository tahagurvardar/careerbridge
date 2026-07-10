import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Plus,
  Sparkles,
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
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/features/auth/server/session";
import { getRecruiterProfileWorkspace } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiter dashboard",
  description: "Your protected CareerBridge recruiter workspace.",
};

const deferredItems = [
  {
    icon: BriefcaseBusiness,
    title: "Active jobs",
    description:
      "No job metrics are available because the Job domain is not implemented yet.",
  },
  {
    icon: ClipboardList,
    title: "Applicant pipeline",
    description:
      "Applicant stages will arrive after real jobs and applications exist.",
  },
  {
    icon: BarChart3,
    title: "Hiring analytics",
    description:
      "Analytics remain deferred until they can be based on real workspace activity.",
  },
];

export default async function RecruiterDashboardPage() {
  const session = await requireRole("RECRUITER", "/recruiter/dashboard");
  const [profile, memberships] = await getRecruiterProfileWorkspace(
    getPrismaClient(),
    session.user.id,
  );
  const profileSignals = [
    profile?.jobTitle,
    profile?.bio,
    profile?.linkedinUrl,
  ];
  const completedProfileFields = profileSignals.filter(Boolean).length;
  const profilePercentage = Math.round(
    (completedProfileFields / profileSignals.length) * 100,
  );
  const publishedCount = memberships.filter(
    ({ company }) => company.isPublished,
  ).length;
  const recommendation =
    !profile || profilePercentage < 100
      ? {
          label: "Complete your recruiter profile",
          href: "/recruiter/profile/edit",
        }
      : memberships.length === 0
        ? {
            label: "Create your first company",
            href: "/recruiter/companies/new",
          }
        : publishedCount === 0
          ? {
              label: "Complete and publish a company",
              href: `/recruiter/companies/${memberships[0].company.id}`,
            }
          : { label: "Manage your companies", href: "/recruiter/companies" };

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Recruiter</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              Company workspace
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Welcome, {session.user.name}.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            Manage your recruiter identity and company profiles. Hiring
            workflows remain clear placeholders until their dedicated phases.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                Recruiter profile
              </CardTitle>
              <CardDescription>
                {completedProfileFields} of 3 professional fields complete
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Progress
                value={profilePercentage}
                aria-label={`Recruiter profile ${profilePercentage}% complete`}
              />
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/recruiter/profile">View profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/recruiter/profile/edit">Edit profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-primary size-5" />
                Company setup
              </CardTitle>
              <CardDescription>
                Real workspace state, with no placeholder counts
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid grid-cols-2 gap-4">
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">Memberships</dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {memberships.length}
                  </dd>
                </div>
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">Published</dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {publishedCount}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
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

        <Card className="border-primary/20 bg-primary/5 mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Recommended next action</p>
              <p className="text-muted-foreground mt-1">
                Continue with the next meaningful workspace setup step.
              </p>
            </div>
            <Button asChild>
              <Link href={recommendation.href}>{recommendation.label}</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {deferredItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="h-full">
                <CardHeader>
                  <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-6">
                    {item.description}
                  </p>
                  <Badge variant="outline" className="mt-5">
                    Deferred
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
