import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  BarChart3,
  BriefcaseBusiness,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  UsersRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AuditTimeline } from "@/features/admin/components/audit-timeline";
import { getAdminDashboard } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { admin } = await getDictionary(locale);
  return {
    title: admin.dashboard.metaTitle,
    description: admin.dashboard.metaDescription,
  };
}

export default async function AdminPage({
  params,
}: PageProps<"/[locale]/admin">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.admin.dashboard;
  const localize = (path: string) => localizeInternalPath(path, locale);
  await requireActiveAdmin("/admin");
  const { counts, recentAudit } = await getAdminDashboard(getPrismaClient());
  const metrics = [
    { label: t.totalUsers, value: counts.totalUsers, icon: UsersRound },
    { label: t.activeUsers, value: counts.activeUsers, icon: UserRoundCheck },
    {
      label: t.suspendedUsers,
      value: counts.suspendedUsers,
      icon: UserRoundX,
    },
    { label: t.candidates, value: counts.candidates, icon: UsersRound },
    { label: t.recruiters, value: counts.recruiters, icon: UsersRound },
    {
      label: t.publicCompanies,
      value: counts.publicCompanies,
      icon: Building2,
    },
    {
      label: t.hiddenCompanies,
      value: counts.hiddenCompanies,
      icon: Building2,
    },
    {
      label: t.publicJobs,
      value: counts.publicJobs,
      icon: BriefcaseBusiness,
    },
    {
      label: t.hiddenJobs,
      value: counts.hiddenJobs,
      icon: BriefcaseBusiness,
    },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          title={t.title}
          description={t.description}
          badge={dictionary.admin.shared.badge}
        />
        <div className="mt-5">
          <Button asChild>
            <Link href={localize("/admin/analytics")}>
              <BarChart3 aria-hidden="true" />
              {t.analytics}
            </Link>
          </Button>
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div>
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums">
                    {formatInteger(locale, value)}
                  </dd>
                </div>
                <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              </CardContent>
            </Card>
          ))}
        </dl>

        <Card className="mt-8">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck aria-hidden="true" className="size-5" />
                {t.recent}
              </CardTitle>
              <CardDescription>{t.recentDescription}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={localize("/admin/audit")}>{t.fullAudit}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AuditTimeline
              events={recentAudit}
              showNotes={false}
              locale={locale}
              labels={dictionary.admin.audit}
              displayLabels={dictionary.labels}
            />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
