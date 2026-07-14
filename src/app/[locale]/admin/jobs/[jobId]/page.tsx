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
import { getAdminJobDetail } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatJobDate } from "@/features/jobs/format";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/jobs/[jobId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { admin } = await getDictionary(locale);
  return {
    title: admin.jobs.detailMetaTitle,
    description: admin.jobs.detailMetaDescription,
  };
}

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ locale: string; jobId: string }>;
}) {
  const { locale: localeParam, jobId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.jobs;
  const shared = dictionary.admin.shared;
  await requireActiveAdmin(`/admin/jobs/${jobId}`);
  const detail = await getAdminJobDetail(getPrismaClient(), jobId);
  if (!detail) notFound();
  const { job, audit } = detail;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href={localizeInternalPath("/admin/jobs", locale)}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {dictionary.labels.jobStatus[job.status]}
            </Badge>
            <Badge
              variant={
                job.moderationStatus === "HIDDEN" ? "destructive" : "secondary"
              }
            >
              {dictionary.labels.contentModeration[job.moderationStatus]}
            </Badge>
            <Badge variant={job.isPubliclyAvailable ? "default" : "outline"}>
              {job.isPubliclyAvailable ? t.publiclyAvailable : shared.notPublic}
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
                  {t.summary}
                </CardTitle>
                <CardDescription>{t.summaryDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <Summary label={t.jobTitle} value={job.title} />
                  <Summary label={t.company} value={job.company.name} />
                  <Summary
                    label={t.lifecycle}
                    value={dictionary.labels.jobStatus[job.status]}
                  />
                  <Summary
                    label={t.moderation}
                    value={
                      dictionary.labels.contentModeration[job.moderationStatus]
                    }
                  />
                  <Summary
                    label={t.publicAvailability}
                    value={
                      job.isPubliclyAvailable
                        ? shared.available
                        : shared.notPublic
                    }
                  />
                  <Summary
                    label={t.moderationVersion}
                    value={formatInteger(locale, job.moderationVersion)}
                  />
                  <Summary
                    label={t.created}
                    value={formatJobDate(locale, job.createdAt)}
                  />
                  <Summary
                    label={t.companyPublication}
                    value={
                      job.company.isPublished
                        ? shared.published
                        : shared.private
                    }
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                  {shared.moderationHistory}
                </CardTitle>
                <CardDescription>{t.historyDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <AuditTimeline
                  events={audit}
                  locale={locale}
                  labels={dictionary.admin.audit}
                  displayLabels={dictionary.labels}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{shared.visibilityAction}</CardTitle>
              <CardDescription>{t.actionDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ModerationActionForm
                targetId={job.id}
                expectedVersion={job.moderationVersion}
                targetType="JOB"
                currentStatus={job.moderationStatus}
                labels={dictionary.admin.moderationForm}
                reasonLabels={dictionary.labels.moderationReason}
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
