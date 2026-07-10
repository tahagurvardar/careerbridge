import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  ExternalLink,
  Pencil,
  Plus,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/features/auth/server/session";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatJobDate } from "@/features/jobs/format";
import { getCompanyJobsOverview } from "@/features/jobs/server/data";
import { PublicationControl } from "@/features/recruiter-company/components/publication-control";
import { getCompanyPublicationReadiness } from "@/features/recruiter-company/publication";
import {
  companySizeLabels,
  safeHttpUrlSchema,
} from "@/features/recruiter-company/schemas";
import { getCompanyWorkspace } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Company workspace",
  description: "Manage a private CareerBridge company workspace.",
};

const deferredSections = [
  {
    icon: UsersRound,
    title: "Applicants",
    description:
      "Applicant pipelines will become available after jobs and applications exist.",
  },
  {
    icon: ShieldCheck,
    title: "Team members",
    description:
      "Membership invitations and team administration are intentionally deferred.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Hiring analytics will be added when real hiring activity can support them.",
  },
];

export default async function CompanyWorkspacePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/companies/${companyId}`,
  );
  const prisma = getPrismaClient();
  const membership = await getCompanyWorkspace(
    prisma,
    session.user.id,
    companyId,
  );

  if (!membership) notFound();

  const { company, role } = membership;
  const isOwner = role === "OWNER";
  const jobsOverview = isOwner
    ? await getCompanyJobsOverview(prisma, session.user.id, company.id)
    : null;
  const readiness = getCompanyPublicationReadiness(company);
  const website = safeHttpUrlSchema.safeParse(company.websiteUrl ?? "");

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href="/recruiter/companies">Back to companies</Link>
        </Button>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{isOwner ? "Owner" : "Member"}</Badge>
              <Badge variant={company.isPublished ? "default" : "secondary"}>
                {company.isPublished ? "Published" : "Private"}
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {company.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {company.tagline || "Company workspace"}
            </p>
          </div>
          {isOwner ? (
            <Button size="lg" variant="outline" asChild>
              <Link href={`/recruiter/companies/${company.id}/edit`}>
                <Pencil aria-hidden="true" />
                Edit company
              </Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Company information</CardTitle>
              <CardDescription>
                Private workspace details available to current members.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p
                className={
                  company.description
                    ? "leading-7 whitespace-pre-line"
                    : "text-muted-foreground leading-7"
                }
              >
                {company.description ||
                  "No company description has been added."}
              </p>
              <Separator />
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="mt-1 font-medium">
                    {company.industry || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Headquarters</dt>
                  <dd className="mt-1 font-medium">
                    {company.headquarters || "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Company size</dt>
                  <dd className="mt-1 font-medium">
                    {company.companySize
                      ? companySizeLabels[company.companySize]
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Founded</dt>
                  <dd className="mt-1 font-medium">
                    {company.foundedYear ?? "Not specified"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Website</dt>
                  <dd className="mt-1 font-medium">
                    {website.success && website.data ? (
                      <a
                        href={website.data}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary inline-flex items-center gap-1.5 hover:underline"
                      >
                        Visit website{" "}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    ) : (
                      "Not specified"
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Publication</CardTitle>
              <CardDescription>
                {company.isPublished
                  ? "This profile is visible in public company discovery."
                  : "This profile is private and absent from public discovery."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!readiness.isReady ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">
                    Complete before publishing
                  </p>
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                    {readiness.missingFields.map(({ field, label }) => (
                      <li key={field}>{label}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  The minimum public profile requirements are complete.
                </p>
              )}
              {isOwner ? (
                <PublicationControl
                  companyId={company.id}
                  isPublished={company.isPublished}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Only an owner can change publication state.
                </p>
              )}
              {company.isPublished ? (
                <Button variant="ghost" asChild>
                  <Link href={`/companies/${company.slug}`}>
                    View public profile
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {isOwner && jobsOverview ? (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BriefcaseBusiness
                      aria-hidden="true"
                      className="text-primary size-5"
                    />
                    Jobs
                  </CardTitle>
                  <CardDescription>
                    {jobsOverview.total === 0
                      ? "No jobs yet for this company."
                      : `${jobsOverview.total} ${
                          jobsOverview.total === 1 ? "job" : "jobs"
                        } · ${jobsOverview.statusCounts.PUBLISHED} published, ${jobsOverview.statusCounts.DRAFT} draft`}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/recruiter/jobs/new?companyId=${company.id}`}>
                      <Plus aria-hidden="true" />
                      Create job
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/recruiter/jobs?companyId=${company.id}`}>
                      Manage jobs
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            {jobsOverview.recentJobs.length ? (
              <CardContent>
                <ul className="divide-y">
                  {jobsOverview.recentJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={`/recruiter/jobs/${job.id}`}
                        className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {job.title}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {job.status === "PUBLISHED" && job.publishedAt
                              ? `Published ${formatJobDate(job.publishedAt)}`
                              : `Created ${formatJobDate(job.createdAt)}`}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <JobStatusBadge status={job.status} />
                          <ArrowUpRight
                            aria-hidden="true"
                            className="text-muted-foreground size-4"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deferredSections.map((item) => {
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
                  <p className="text-muted-foreground text-sm leading-6">
                    {item.description}
                  </p>
                  <Badge variant="outline" className="mt-4">
                    Coming later
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
