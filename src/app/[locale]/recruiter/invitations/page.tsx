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
import { getIncomingInvitations } from "@/features/company-team/server/data";
import { formatDateTimeUtc, formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/invitations">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.invitations.title,
    description: recruiter.invitations.description,
  };
}

export default async function RecruiterInvitationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.recruiter.invitations;
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
            <Badge variant="secondary">
              {dictionary.recruiter.shared.workspace}
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-7">
              {t.description}
            </p>
          </div>
          {pendingCount ? (
            <Badge>
              {formatMessage(t.pendingCount, {
                count: formatInteger(locale, pendingCount),
              })}
            </Badge>
          ) : null}
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
                      {dictionary.labels.invitationStatus[invitation.status]}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">
                    {invitation.companyName}
                  </CardTitle>
                  <CardDescription>
                    {invitation.companyTagline || t.workspaceInvitation}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="text-muted-foreground grid gap-1 text-sm">
                    <p>
                      {formatMessage(t.invitedBy, {
                        name:
                          invitation.invitedByName ??
                          dictionary.labels.fallbacks.removedUser,
                      })}
                    </p>
                    <p>
                      {formatMessage(t.sent, {
                        date: formatDateTimeUtc(locale, invitation.createdAt),
                      })}
                    </p>
                    <p>
                      {invitation.status === "PENDING"
                        ? formatMessage(t.expires, {
                            date: formatDateTimeUtc(
                              locale,
                              invitation.expiresAt,
                            ),
                          })
                        : invitation.respondedAt
                          ? formatMessage(t.resolved, {
                              date: formatDateTimeUtc(
                                locale,
                                invitation.respondedAt,
                              ),
                            })
                          : formatMessage(t.expired, {
                              date: formatDateTimeUtc(
                                locale,
                                invitation.expiresAt,
                              ),
                            })}
                    </p>
                  </div>
                  {invitation.status === "PENDING" ? (
                    <InvitationResponseControls
                      invitationId={invitation.id}
                      labels={{
                        invitation: t,
                        cancel: dictionary.common.actions.cancel,
                      }}
                    />
                  ) : invitation.status === "ACCEPTED" ? (
                    <Button variant="outline" asChild>
                      <Link
                        href={localizeInternalPath(
                          `/recruiter/companies/${invitation.companyId}`,
                          locale,
                        )}
                      >
                        <Building2 aria-hidden="true" />
                        {dictionary.recruiter.companies.openWorkspace}
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
              <h2 className="mt-5 text-xl font-semibold">{t.emptyTitle}</h2>
              <p className="text-muted-foreground mt-2 max-w-lg leading-7">
                {t.emptyDescription}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
