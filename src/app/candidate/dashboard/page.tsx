import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Building2,
  ClipboardList,
  Pencil,
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
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import {
  getCandidateApplicationStatusCounts,
  getCandidateRecentApplications,
} from "@/features/applications/server/data";
import { requireRole } from "@/features/auth/server/session";
import { CompletionCard } from "@/features/candidate-profile/components/completion-card";
import { getCompletionFromProfile } from "@/features/candidate-profile/completion";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { classifySavedJobAvailability } from "@/features/saved-jobs/availability";
import { getCandidateDashboardRecommendation } from "@/features/saved-jobs/recommendation";
import { getCandidateSavedJobDashboard } from "@/features/saved-jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Candidate dashboard",
  description: "Your protected CareerBridge candidate workspace.",
};

const deferredItems = [
  {
    icon: Sparkles,
    title: "Job recommendations",
    description:
      "Personalized recommendations are deferred until the required matching foundations exist.",
  },
];

export default async function CandidateDashboardPage() {
  const session = await requireRole("CANDIDATE", "/candidate/dashboard");
  const prisma = getPrismaClient();
  const [profile, { counts, total }, recent, savedJobDashboard] =
    await Promise.all([
      getCandidateProfile(prisma, session.user.id),
      getCandidateApplicationStatusCounts(prisma, session.user.id),
      getCandidateRecentApplications(prisma, session.user.id),
      getCandidateSavedJobDashboard(prisma, session.user.id),
    ]);
  const completion = getCompletionFromProfile(profile);
  const active =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.INTERVIEW + counts.OFFER;

  const recommendation = getCandidateDashboardRecommendation({
    profileComplete: completion.percentage === 100,
    savedJobCount: savedJobDashboard.total,
    savedOpenUnappliedCount: savedJobDashboard.openUnapplied,
    activeApplicationCount: active,
  });

  const stats = [
    { label: "Total", value: total },
    { label: "Active", value: active },
    { label: "Interviews", value: counts.INTERVIEW },
    { label: "Offers", value: counts.OFFER },
    { label: "Hired", value: counts.HIRED },
  ];

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Candidate</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              Your job search
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Welcome, {session.user.name}.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            Keep your profile current, apply to roles that fit, and track every
            application in one place.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                Your candidate profile
              </CardTitle>
              <CardDescription>
                Keep your headline, background, skills, education, and
                experience current.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/candidate/profile">
                  <UserRound aria-hidden="true" />
                  View profile
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/candidate/profile/edit">
                  <Pencil aria-hidden="true" />
                  Edit profile
                </Link>
              </Button>
            </CardContent>
          </Card>
          <CompletionCard {...completion} compact />
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Applications
                </CardTitle>
                <CardDescription>
                  Real counts from your submitted applications
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/candidate/applications">
                  View all applications
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {stats.map((item) => (
                <div key={item.label} className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
                </div>
              ))}
            </dl>

            {recent.length ? (
              <ul className="divide-y">
                {recent.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={`/candidate/applications/${application.id}`}
                      className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {application.job.title}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building2 aria-hidden="true" className="size-3.5" />
                          {application.job.company.name} · Applied{" "}
                          {formatJobDate(application.submittedAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <ApplicationStatusBadge status={application.status} />
                        <ArrowUpRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="bg-muted/40 rounded-xl px-4 py-8 text-center">
                <p className="text-muted-foreground leading-6">
                  You have not applied to any jobs yet.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/jobs">Browse jobs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Saved jobs
                </CardTitle>
                <CardDescription>
                  {savedJobDashboard.total} saved{" "}
                  {savedJobDashboard.total === 1
                    ? "opportunity"
                    : "opportunities"}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/candidate/saved-jobs">View all saved jobs</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {savedJobDashboard.recent.length ? (
              <ul className="divide-y">
                {savedJobDashboard.recent.map(({ job, createdAt }) => {
                  const isOpen =
                    classifySavedJobAvailability({
                      status: job.status,
                      companyIsPublished: job.company.isPublished,
                    }) === "OPEN";
                  const content = (
                    <>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {job.title}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                          <Building2 aria-hidden="true" className="size-3.5" />
                          {job.company.name} · Saved {formatJobDate(createdAt)}
                        </span>
                      </span>
                      <Badge variant={isOpen ? "default" : "secondary"}>
                        {isOpen ? "Open" : "Unavailable"}
                      </Badge>
                    </>
                  );

                  return (
                    <li key={job.slug}>
                      {isOpen ? (
                        <Link
                          href={`/jobs/${job.slug}`}
                          className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="-mx-2 flex items-center justify-between gap-3 px-2 py-3">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="bg-muted/40 rounded-xl px-4 py-8 text-center">
                <p className="text-muted-foreground leading-6">
                  You have not saved any jobs yet.
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/jobs">Browse jobs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Recommended next action</p>
              <p className="text-muted-foreground mt-1">
                {recommendation.description}
              </p>
            </div>
            <Button asChild>
              <Link href={recommendation.href}>{recommendation.label}</Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                    Planned for a later phase
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
