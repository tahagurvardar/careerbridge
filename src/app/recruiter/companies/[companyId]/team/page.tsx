import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock3,
  Crown,
  History,
  Mail,
  ShieldCheck,
  UserPlus,
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
import { requireRole } from "@/features/auth/server/session";
import { InviteRecruiterForm } from "@/features/company-team/components/invite-recruiter-form";
import {
  MemberAdministrationControls,
  RevokeInvitationControl,
} from "@/features/company-team/components/team-action-controls";
import {
  membershipEventTypeLabels,
  resolveTeamUserDisplayName,
} from "@/features/company-team/team";
import { getOwnedCompanyTeam } from "@/features/company-team/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Company team",
  description: "Manage company membership and recruiter invitations.",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CompanyTeamPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/companies/${companyId}/team`,
  );
  const team = await getOwnedCompanyTeam(
    getPrismaClient(),
    session.user.id,
    companyId,
  );
  if (!team) notFound();

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={`/recruiter/companies/${companyId}`}>
            Back to company workspace
          </Link>
        </Button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">Owner administration</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {team.company.name} team
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              Invite Recruiters, manage membership roles, and review the latest
              membership history. This page is available only to company owners.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{team.ownerCount} owners</Badge>
            <Badge variant="outline">{team.memberCount} members</Badge>
            <Badge variant="outline">
              {team.pendingInvitations.length} pending
            </Badge>
          </div>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound
                  aria-hidden="true"
                  className="text-primary size-5"
                />
                Team roster
              </CardTitle>
              <CardDescription>
                Owners can see member emails and administer every current
                membership.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {team.members.map((member) => (
                  <li
                    key={member.membershipId}
                    className="grid gap-4 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{member.name}</p>
                        <Badge
                          variant={
                            member.role === "OWNER" ? "default" : "secondary"
                          }
                        >
                          {member.role === "OWNER" ? (
                            <Crown aria-hidden="true" />
                          ) : (
                            <ShieldCheck aria-hidden="true" />
                          )}
                          {member.role === "OWNER" ? "Owner" : "Member"}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5 text-sm">
                        <Mail
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">{member.email}</span>
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Joined {formatDate(member.joinedAt)}
                      </p>
                    </div>
                    <MemberAdministrationControls
                      companyId={companyId}
                      membershipId={member.membershipId}
                      role={member.role}
                      isCurrentUser={member.userId === session.user.id}
                      ownerCount={team.ownerCount}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus aria-hidden="true" className="text-primary size-5" />
                Invite Recruiter
              </CardTitle>
              <CardDescription>
                Invitations expire after 14 days and always grant the Member
                role.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteRecruiterForm companyId={companyId} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="text-primary size-5" />
              Pending invitations
            </CardTitle>
            <CardDescription>
              Only active, unexpired invitations appear here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.pendingInvitations.length ? (
              <ul className="divide-y">
                {team.pendingInvitations.map((invitation) => (
                  <li
                    key={invitation.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">
                          {invitation.inviteeName}
                        </p>
                        <Badge variant="outline">Pending</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {invitation.inviteeEmail}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Invited by {invitation.invitedByName ?? "Removed user"}{" "}
                        · Expires {formatDate(invitation.expiresAt)}
                      </p>
                    </div>
                    <RevokeInvitationControl
                      companyId={companyId}
                      invitationId={invitation.id}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                No pending invitations.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History aria-hidden="true" className="text-primary size-5" />
              Membership audit history
            </CardTitle>
            <CardDescription>
              The 20 most recent invitation and membership events. Audit records
              are append-only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.auditEvents.length ? (
              <ol className="divide-y">
                {team.auditEvents.map((event) => (
                  <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {membershipEventTypeLabels[event.type]}
                      </p>
                      <time className="text-muted-foreground text-xs">
                        {formatDate(event.createdAt)}
                      </time>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Actor: {resolveTeamUserDisplayName(event.actorName)} ·
                      Subject: {resolveTeamUserDisplayName(event.subjectName)}
                      {event.fromRole || event.toRole
                        ? ` · ${event.fromRole ?? "None"} → ${event.toRole ?? "None"}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                No membership events yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
