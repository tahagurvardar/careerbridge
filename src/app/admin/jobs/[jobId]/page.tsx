import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, ShieldCheck } from "lucide-react";
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
import { AuditTimeline } from "@/features/admin/components/audit-timeline";
import { ModerationActionForm } from "@/features/admin/components/moderation-action-form";
import { contentModerationStatusLabels } from "@/features/admin/moderation";
import { getAdminJobDetail } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatJobDate } from "@/features/jobs/format";
import { jobStatusLabels } from "@/features/jobs/schemas";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Job moderation",
  description: "Safe Admin Job moderation summary.",
};

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  await requireActiveAdmin(`/admin/jobs/${jobId}`);
  const detail = await getAdminJobDetail(getPrismaClient(), jobId);
  if (!detail) notFound();
  const { job, audit } = detail;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/admin/jobs">
            <ArrowLeft aria-hidden="true" />
            Back to jobs
          </Link>
        </Button>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{jobStatusLabels[job.status]}</Badge>
            <Badge
              variant={
                job.moderationStatus === "HIDDEN" ? "destructive" : "secondary"
              }
            >
              {contentModerationStatusLabels[job.moderationStatus]}
            </Badge>
            <Badge variant={job.isPubliclyAvailable ? "default" : "outline"}>
              {job.isPubliclyAvailable ? "Publicly available" : "Not public"}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {job.title}
          </h1>
          <p className="text-muted-foreground mt-2">{job.company.name}</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness aria-hidden="true" className="size-5" />
                  Job summary
                </CardTitle>
                <CardDescription>
                  No Candidate Applications, CVs, notes, or interview details
                  are included.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <Summary label="Title" value={job.title} />
                  <Summary label="Company" value={job.company.name} />
                  <Summary
                    label="Lifecycle"
                    value={jobStatusLabels[job.status]}
                  />
                  <Summary
                    label="Moderation"
                    value={contentModerationStatusLabels[job.moderationStatus]}
                  />
                  <Summary
                    label="Public availability"
                    value={job.isPubliclyAvailable ? "Available" : "Not public"}
                  />
                  <Summary
                    label="Moderation version"
                    value={String(job.moderationVersion)}
                  />
                  <Summary
                    label="Created"
                    value={formatJobDate(job.createdAt)}
                  />
                  <Summary
                    label="Company publication"
                    value={job.company.isPublished ? "Published" : "Private"}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                  Moderation history
                </CardTitle>
                <CardDescription>
                  Immutable entries for this Job, newest first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditTimeline events={audit} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Visibility action</CardTitle>
              <CardDescription>
                Job lifecycle is preserved. The optional note remains
                Admin-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationActionForm
                targetId={job.id}
                expectedVersion={job.moderationVersion}
                targetType="JOB"
                currentStatus={job.moderationStatus}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-words">{value}</dd>
    </div>
  );
}
