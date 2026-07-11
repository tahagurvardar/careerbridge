import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ExternalLink,
  Laptop2,
  MapPin,
} from "lucide-react";

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
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { StatusTimeline } from "@/features/applications/components/status-timeline";
import { WithdrawApplicationButton } from "@/features/applications/components/withdraw-application-button";
import { canCandidateWithdrawApplication } from "@/features/applications/lifecycle";
import { getCandidateApplication } from "@/features/applications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import {
  employmentTypeLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Application detail",
  description: "View one of your CareerBridge job applications.",
};

export default async function CandidateApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const session = await requireRole(
    "CANDIDATE",
    `/candidate/applications/${applicationId}`,
  );
  const application = await getCandidateApplication(
    getPrismaClient(),
    session.user.id,
    applicationId,
  );

  if (!application) notFound();

  const { job } = application;
  const jobIsPublic = job.status === "PUBLISHED" && job.company.isPublished;
  const canWithdraw = canCandidateWithdrawApplication(application.status);

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href="/candidate/applications">
            <ArrowLeft aria-hidden="true" />
            Back to applications
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={application.status} />
              <span className="text-muted-foreground text-sm">
                Applied {formatJobDate(application.submittedAt)}
                {application.withdrawnAt
                  ? ` · Withdrawn ${formatJobDate(application.withdrawnAt)}`
                  : ""}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {job.title}
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5">
              <Building2 aria-hidden="true" className="size-4" />
              {job.company.name}
            </p>
          </div>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                {job.summary ? (
                  <p className="leading-7">{job.summary}</p>
                ) : (
                  <p className="text-muted-foreground">
                    No summary was provided for this role.
                  </p>
                )}
                <Separator />
                <dl className="text-muted-foreground grid gap-4 text-sm sm:grid-cols-3">
                  <MetaItem
                    icon={<MapPin aria-hidden="true" className="size-4" />}
                    label="Location"
                    value={job.location}
                  />
                  <MetaItem
                    icon={
                      <BriefcaseBusiness
                        aria-hidden="true"
                        className="size-4"
                      />
                    }
                    label="Employment"
                    value={
                      job.employmentType
                        ? employmentTypeLabels[job.employmentType]
                        : null
                    }
                  />
                  <MetaItem
                    icon={<Laptop2 aria-hidden="true" className="size-4" />}
                    label="Workplace"
                    value={
                      job.workplaceType
                        ? workplaceTypeLabels[job.workplaceType]
                        : null
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your cover letter</CardTitle>
              </CardHeader>
              <CardContent>
                {application.coverLetter ? (
                  <p className="leading-7 whitespace-pre-line">
                    {application.coverLetter}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    You applied without a cover letter.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status history</CardTitle>
                <CardDescription>
                  Updates to your application over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusTimeline entries={application.history} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Application status</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm">Current</span>
                <ApplicationStatusBadge status={application.status} />
              </div>
              <Separator />
              {canWithdraw ? (
                <WithdrawApplicationButton applicationId={application.id} />
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  This application is in a final state and can no longer be
                  withdrawn.
                </p>
              )}
              {jobIsPublic ? (
                <Button variant="ghost" asChild>
                  <Link href={`/jobs/${job.slug}`}>
                    View public job listing
                    <ExternalLink aria-hidden="true" className="size-3" />
                  </Link>
                </Button>
              ) : (
                <p className="text-muted-foreground text-xs leading-5">
                  This job listing is no longer public.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd className="text-foreground mt-1 font-medium">
        {value || "Not specified"}
      </dd>
    </div>
  );
}
