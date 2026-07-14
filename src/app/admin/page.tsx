import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
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
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description: "CareerBridge platform trust and moderation dashboard.",
};

export default async function AdminPage() {
  await requireActiveAdmin("/admin");
  const { counts, recentAudit } = await getAdminDashboard(getPrismaClient());
  const metrics = [
    { label: "Total users", value: counts.totalUsers, icon: UsersRound },
    { label: "Active users", value: counts.activeUsers, icon: UserRoundCheck },
    {
      label: "Suspended users",
      value: counts.suspendedUsers,
      icon: UserRoundX,
    },
    { label: "Candidates", value: counts.candidates, icon: UsersRound },
    { label: "Recruiters", value: counts.recruiters, icon: UsersRound },
    {
      label: "Public companies",
      value: counts.publicCompanies,
      icon: Building2,
    },
    {
      label: "Hidden companies",
      value: counts.hiddenCompanies,
      icon: Building2,
    },
    {
      label: "Public jobs",
      value: counts.publicJobs,
      icon: BriefcaseBusiness,
    },
    {
      label: "Hidden jobs",
      value: counts.hiddenJobs,
      icon: BriefcaseBusiness,
    },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <AdminPageHeader
          title="Trust and moderation"
          description="A truthful platform overview with bounded counts and recent immutable moderation history."
        />

        <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div>
                  <dt className="text-muted-foreground text-sm">{label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums">
                    {value}
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
                Recent moderation
              </CardTitle>
              <CardDescription>
                The ten newest Admin actions. Internal notes stay in the audit
                log.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/audit">Full audit log</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <AuditTimeline events={recentAudit} showNotes={false} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
