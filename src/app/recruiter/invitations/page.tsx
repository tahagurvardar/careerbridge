import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Inbox, UserRoundPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/features/auth/server/session";
import { InvitationResponseControls } from "@/features/company-team/components/team-action-controls";
import { invitationStatusLabels } from "@/features/company-team/team";
import { getIncomingInvitations } from "@/features/company-team/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Company invitations",
  description: "Review company invitations sent to your Recruiter account.",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function RecruiterInvitationsPage() {
  const session = await requireRole("RECRUITER", "/recruiter/invitations");
  const invitations = await getIncomingInvitations(
    getPrismaClient(),
    session.user.id,
  );
  const pendingCount = invitations.filter(
    ({ status }) => status === "PENDING",
  ).length;

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">Recruiter workspace</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Company invitations
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Accept or decline invitations sent specifically to your Recruiter
              account. Accepting grants Member access, never ownership.
            </p>
          </div>
          {pendingCount ? <Badge>{pendingCount} pending</Badge> : null}
        </div>

        {invitations.length ? (
          <div className="mt-9 grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
                      <UserRoundPlus aria-hidden="true" className="size-5" />
                    </span>
                    <Badge
                      variant={
                        invitation.status === "PENDING" ? "default" : "outline"
                      }
                    >
                      {invitationStatusLabels[invitation.status]}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">
                    {invitation.companyName}
                  </CardTitle>
                  <CardDescription>
                    {invitation.companyTagline ||
                      "Company workspace invitation"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="text-muted-foreground grid gap-1 text-sm">
                    <p>
                      Invited by {invitation.invitedByName ?? "Removed user"}
                    </p>
                    <p>Sent {formatDate(invitation.createdAt)}</p>
                    <p>
                      {invitation.status === "PENDING"
                        ? `Expires ${formatDate(invitation.expiresAt)}`
                        : invitation.respondedAt
                          ? `Resolved ${formatDate(invitation.respondedAt)}`
                          : `Expired ${formatDate(invitation.expiresAt)}`}
                    </p>
                  </div>
                  {invitation.status === "PENDING" ? (
                    <InvitationResponseControls invitationId={invitation.id} />
                  ) : invitation.status === "ACCEPTED" ? (
                    <Button variant="outline" asChild>
                      <Link
                        href={`/recruiter/companies/${invitation.companyId}`}
                      >
                        <Building2 aria-hidden="true" />
                        Open workspace
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-9 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <Inbox aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold">No invitations</h2>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                Company invitations sent to your Recruiter account will appear
                here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
