import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, UserRound } from "lucide-react";
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
import { getAdminUserDetail } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatJobDate } from "@/features/jobs/format";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin/users/[userId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { admin } = await getDictionary(locale);
  return {
    title: admin.users.detailMetaTitle,
    description: admin.users.detailMetaDescription,
  };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale: localeParam, userId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.users;
  await requireActiveAdmin(`/admin/users/${userId}`);
  const detail = await getAdminUserDetail(getPrismaClient(), userId);
  if (!detail) notFound();
  const { user, audit } = detail;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href={localizeInternalPath("/admin/users", locale)}>
            <ArrowLeft aria-hidden="true" />
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {dictionary.labels.role[user.role]}
              </Badge>
              <Badge
                variant={
                  user.accountStatus === "SUSPENDED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {dictionary.labels.accountStatus[user.accountStatus]}
              </Badge>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {user.name}
            </h1>
            <p className="text-muted-foreground mt-2">{user.email}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound aria-hidden="true" className="size-5" />
                  {t.summary}
                </CardTitle>
                <CardDescription>{t.summaryDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <Summary label={t.name} value={user.name} />
                  <Summary label={t.email} value={user.email} />
                  <Summary
                    label={t.role}
                    value={dictionary.labels.role[user.role]}
                  />
                  <Summary
                    label={t.created}
                    value={formatJobDate(locale, user.createdAt)}
                  />
                  <Summary
                    label={t.accountStatus}
                    value={dictionary.labels.accountStatus[user.accountStatus]}
                  />
                  <Summary
                    label={t.moderationVersion}
                    value={formatInteger(locale, user.moderationVersion)}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck aria-hidden="true" className="size-5" />
                  {dictionary.admin.shared.moderationHistory}
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
              <CardTitle>{t.accountAction}</CardTitle>
              <CardDescription>{t.accountActionDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              {user.role === "ADMIN" ? (
                <p className="text-muted-foreground text-sm leading-6">
                  {t.adminProtected}
                </p>
              ) : (
                <ModerationActionForm
                  targetId={user.id}
                  expectedVersion={user.moderationVersion}
                  targetType="USER"
                  currentStatus={user.accountStatus}
                  labels={dictionary.admin.moderationForm}
                  reasonLabels={dictionary.labels.moderationReason}
                />
              )}
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
