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
import { userAccountStatusLabels } from "@/features/admin/moderation";
import { getAdminUserDetail } from "@/features/admin/server/data";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import { roleLabels } from "@/features/auth/roles";
import { formatJobDate } from "@/features/jobs/format";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "User moderation",
  description: "Safe Admin user moderation summary.",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  await requireActiveAdmin(`/admin/users/${userId}`);
  const detail = await getAdminUserDetail(getPrismaClient(), userId);
  if (!detail) notFound();
  const { user, audit } = detail;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-6 -ml-2">
          <Link href="/admin/users">
            <ArrowLeft aria-hidden="true" />
            Back to users
          </Link>
        </Button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{roleLabels[user.role]}</Badge>
              <Badge
                variant={
                  user.accountStatus === "SUSPENDED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {userAccountStatusLabels[user.accountStatus]}
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
                  Safe identity summary
                </CardTitle>
                <CardDescription>
                  No profile details, applications, documents, auth accounts, or
                  sessions are included.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-5 text-sm sm:grid-cols-2">
                  <Summary label="Name" value={user.name} />
                  <Summary label="Email" value={user.email} />
                  <Summary label="Role" value={roleLabels[user.role]} />
                  <Summary
                    label="Created"
                    value={formatJobDate(user.createdAt)}
                  />
                  <Summary
                    label="Account status"
                    value={userAccountStatusLabels[user.accountStatus]}
                  />
                  <Summary
                    label="Moderation version"
                    value={String(user.moderationVersion)}
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
                  Immutable entries for this account, newest first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditTimeline events={audit} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Account action</CardTitle>
              <CardDescription>
                A reason is required. The optional note remains Admin-only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user.role === "ADMIN" ? (
                <p className="text-muted-foreground text-sm leading-6">
                  Admin accounts cannot be suspended or restored in this phase.
                </p>
              ) : (
                <ModerationActionForm
                  targetId={user.id}
                  expectedVersion={user.moderationVersion}
                  targetType="USER"
                  currentStatus={user.accountStatus}
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
