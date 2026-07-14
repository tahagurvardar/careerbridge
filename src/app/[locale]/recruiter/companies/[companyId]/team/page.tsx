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
import { getOwnedCompanyTeam } from "@/features/company-team/server/data";
import {
  formatCount,
  formatDateTimeUtc,
  formatInteger,
} from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/companies/[companyId]/team">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.team.metaTitle,
    description: recruiter.team.metaDescription,
  };
}

export default async function CompanyTeamPage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale: localeParam, companyId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.team;
  const localize = (path: string) => localizeInternalPath(path, locale);
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
          <Link href={localize(`/recruiter/companies/${companyId}`)}>
            {t.back}
          </Link>
        </Button>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary">
              {dictionary.recruiter.shared.ownerAdministration}
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {formatMessage(t.title, { companyName: team.company.name })}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              {t.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {formatCount(locale, team.ownerCount, t.ownerCount)}
            </Badge>
            <Badge variant="outline">
              {formatCount(locale, team.memberCount, t.memberCount)}
            </Badge>
            <Badge variant="outline">
              {formatMessage(t.pendingCount, {
                count: formatInteger(locale, team.pendingInvitations.length),
              })}
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
                {t.roster}
              </CardTitle>
              <CardDescription>{t.rosterDescription}</CardDescription>
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
                          {dictionary.labels.companyRole[member.role]}
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
                        {formatMessage(t.joined, {
                          date: formatDateTimeUtc(locale, member.joinedAt),
                        })}
                      </p>
                    </div>
                    <MemberAdministrationControls
                      companyId={companyId}
                      membershipId={member.membershipId}
                      role={member.role}
                      isCurrentUser={member.userId === session.user.id}
                      ownerCount={team.ownerCount}
                      labels={t}
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
                {t.inviteTitle}
              </CardTitle>
              <CardDescription>{t.inviteDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteRecruiterForm companyId={companyId} labels={t} />
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="text-primary size-5" />
              {t.pendingTitle}
            </CardTitle>
            <CardDescription>{t.pendingDescription}</CardDescription>
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
                        <Badge variant="outline">
                          {dictionary.labels.invitationStatus.PENDING}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 truncate text-sm">
                        {invitation.inviteeEmail}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatMessage(t.invitationDetails, {
                          name:
                            invitation.invitedByName ??
                            dictionary.labels.fallbacks.removedUser,
                          date: formatDateTimeUtc(locale, invitation.expiresAt),
                        })}
                      </p>
                    </div>
                    <RevokeInvitationControl
                      companyId={companyId}
                      invitationId={invitation.id}
                      labels={t}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noPending}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History aria-hidden="true" className="text-primary size-5" />
              {t.auditTitle}
            </CardTitle>
            <CardDescription>{t.auditDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {team.auditEvents.length ? (
              <ol className="divide-y">
                {team.auditEvents.map((event) => (
                  <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {dictionary.labels.membershipEventType[event.type]}
                      </p>
                      <time className="text-muted-foreground text-xs">
                        {formatDateTimeUtc(locale, event.createdAt)}
                      </time>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatMessage(t.auditDetails, {
                        actor:
                          event.actorName?.trim() ||
                          dictionary.labels.fallbacks.removedUser,
                        subject:
                          event.subjectName?.trim() ||
                          dictionary.labels.fallbacks.removedUser,
                      })}
                      {event.fromRole || event.toRole
                        ? ` · ${formatMessage(t.roleChange, {
                            from: event.fromRole
                              ? dictionary.labels.companyRole[event.fromRole]
                              : dictionary.common.states.none,
                            to: event.toRole
                              ? dictionary.labels.companyRole[event.toRole]
                              : dictionary.common.states.none,
                          })}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                {t.noEvents}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
