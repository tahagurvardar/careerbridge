import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, ShieldCheck } from "lucide-react";
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
import { getAdminCompanyDetail } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatJobDate } from "@/features/jobs/format";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Company moderation",
  description: "Safe Admin Company moderation summary.",
};

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  await requireActiveAdmin(`/admin/companies/${companyId}`);
  const detail = await getAdminCompanyDetail(getPrismaClient(), companyId);
  if (!detail) notFound();
  const { company, audit } = detail;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/admin/companies">
            <ArrowLeft aria-hidden="true" />
            Back to companies
          </Link>
        </Button>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={company.isPublished ? "default" : "outline"}>
              {company.isPublished ? "Published" : "Private"}
            </Badge>
            <Badge
              variant={
                company.moderationStatus === "HIDDEN"
                  ? "destructive"
                  : "secondary"
              }
            >
              {contentModerationStatusLabels[company.moderationStatus]}
            </Badge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            {company.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Safe Company moderation summary
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 aria-hidden="true" className="size-5" />
                  Company summary
                </CardTitle>
                <CardDescription>
                  No member emails, applications, notes, CVs, or interview
                  details are included.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <Summary label="Name" value={company.name} />
                  <Summary
                    label="Publication"
                    value={company.isPublished ? "Published" : "Private"}
                  />
                  <Summary
                    label="Moderation"
                    value={
                      contentModerationStatusLabels[company.moderationStatus]
                    }
                  />
                  <Summary
                    label="Moderation version"
                    value={String(company.moderationVersion)}
                  />
                  <Summary label="Jobs" value={String(company._count.jobs)} />
                  <Summary
                    label="Members"
                    value={String(company._count.memberships)}
                  />
                  <Summary
                    label="Created"
                    value={formatJobDate(company.createdAt)}
                  />
                  <Summary
                    label="Industry"
                    value={company.industry ?? "Not specified"}
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
                  Immutable entries for this Company, newest first.
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
                Publication state is preserved. The optional note remains
                Admin-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationActionForm
                targetId={company.id}
                expectedVersion={company.moderationVersion}
                targetType="COMPANY"
                currentStatus={company.moderationStatus}
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
