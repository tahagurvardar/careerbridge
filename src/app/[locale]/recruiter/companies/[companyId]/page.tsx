import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  ExternalLink,
  Pencil,
  Plus,
  ShieldAlert,
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
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { getCompanyApplicationOverview } from "@/features/applications/server/data";
import { LeaveCompanyControl } from "@/features/company-team/components/team-action-controls";
import {
  getOwnerTeamSummary,
  getOwnMembershipSummary,
} from "@/features/company-team/server/data";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { formatJobDate } from "@/features/jobs/format";
import { formatInteger } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { getCompanyJobsOverview } from "@/features/jobs/server/data";
import { PublicationControl } from "@/features/recruiter-company/components/publication-control";
import { getCompanyPublicationReadiness } from "@/features/recruiter-company/publication";
import { safeHttpUrlSchema } from "@/features/recruiter-company/schemas";
import { getCompanyWorkspace } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/recruiter/companies/[companyId]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { recruiter } = await getDictionary(locale);
  return {
    title: recruiter.companyWorkspace.metaTitle,
    description: recruiter.companyWorkspace.metaDescription,
  };
}

export default async function CompanyWorkspacePage({
  params,
}: {
  params: Promise<{ locale: string; companyId: string }>;
}) {
  const { locale: localeParam, companyId } = await params;
  const locale = resolvePageLocale(localeParam);
  const dictionary = await getDictionary(locale);
  const labels = dictionary.labels;
  const t = dictionary.recruiter.companyWorkspace;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole(
    "RECRUITER",
    `/recruiter/companies/${companyId}`,
  );
  const prisma = getPrismaClient();
  const membership = await getCompanyWorkspace(
    prisma,
    session.user.id,
    companyId,
  );

  if (!membership) notFound();

  const { company, role } = membership;
  const isOwner = role === "OWNER";
  const [jobsOverview, applicationOverview, teamSummary, ownMembership] =
    await Promise.all([
      isOwner
        ? getCompanyJobsOverview(prisma, session.user.id, company.id)
        : Promise.resolve(null),
      isOwner
        ? getCompanyApplicationOverview(prisma, session.user.id, company.id)
        : Promise.resolve(null),
      isOwner
        ? getOwnerTeamSummary(prisma, session.user.id, company.id)
        : Promise.resolve(null),
      getOwnMembershipSummary(prisma, session.user.id, company.id),
    ]);
  const readiness = getCompanyPublicationReadiness(company);
  const website = safeHttpUrlSchema.safeParse(company.websiteUrl ?? "");
  const publicationLabels: Record<string, string> = {
    name: dictionary.recruiter.companyForm.name,
    description: dictionary.recruiter.companyForm.description,
    industry: t.industry,
    headquarters: t.headquarters,
    websiteUrl: t.website,
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" asChild className="mb-5 -ml-2">
          <Link href={localize("/recruiter/companies")}>{t.back}</Link>
        </Button>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{labels.companyRole[role]}</Badge>
              <Badge variant={company.isPublished ? "default" : "secondary"}>
                {company.isPublished
                  ? dictionary.recruiter.shared.published
                  : dictionary.recruiter.shared.private}
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {company.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {company.tagline || t.fallbackTagline}
            </p>
          </div>
          {isOwner ? (
            <Button size="lg" variant="outline" asChild>
              <Link href={localize(`/recruiter/companies/${company.id}/edit`)}>
                <Pencil aria-hidden="true" />
                {t.edit}
              </Link>
            </Button>
          ) : null}
        </div>

        {company.moderationStatus === "HIDDEN" ? (
          <div
            role="status"
            className="border-destructive/40 bg-destructive/5 mt-7 flex gap-3 rounded-xl border p-4"
          >
            <ShieldAlert
              aria-hidden="true"
              className="text-destructive mt-0.5 size-5 shrink-0"
            />
            <div>
              <p className="font-medium">
                {dictionary.recruiter.shared.moderationNotice}
              </p>
              <p className="text-muted-foreground mt-1 text-sm leading-6">
                {t.hiddenDescription}
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-9 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle>{t.information}</CardTitle>
              <CardDescription>{t.informationDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p
                className={
                  company.description
                    ? "leading-7 whitespace-pre-line"
                    : "text-muted-foreground leading-7"
                }
              >
                {company.description || t.noDescription}
              </p>
              <Separator />
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t.industry}</dt>
                  <dd className="mt-1 font-medium">
                    {company.industry || dictionary.common.states.notProvided}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.headquarters}</dt>
                  <dd className="mt-1 font-medium">
                    {company.headquarters ||
                      dictionary.common.states.notProvided}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.companySize}</dt>
                  <dd className="mt-1 font-medium">
                    {company.companySize
                      ? labels.companySize[company.companySize]
                      : dictionary.common.states.notProvided}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.founded}</dt>
                  <dd className="mt-1 font-medium">
                    {company.foundedYear
                      ? formatInteger(locale, company.foundedYear)
                      : dictionary.common.states.notProvided}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">{t.website}</dt>
                  <dd className="mt-1 font-medium">
                    {website.success && website.data ? (
                      <a
                        href={website.data}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary inline-flex items-center gap-1.5 hover:underline"
                      >
                        {t.visitWebsite}{" "}
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    ) : (
                      dictionary.common.states.notProvided
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.publication}</CardTitle>
              <CardDescription>
                {company.moderationStatus === "HIDDEN"
                  ? t.moderationBlocksPublication
                  : company.isPublished
                    ? t.publicDescription
                    : t.privateDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!readiness.isReady ? (
                <div className="bg-muted/60 rounded-xl p-4">
                  <p className="text-sm font-medium">
                    {t.completeBeforePublishing}
                  </p>
                  <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                    {readiness.missingFields.map(({ field }) => (
                      <li key={field}>
                        {publicationLabels[field] ??
                          dictionary.recruiter.actions.invalid}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm leading-6">
                  {t.requirementsComplete}
                </p>
              )}
              {isOwner ? (
                <PublicationControl
                  companyId={company.id}
                  isPublished={company.isPublished}
                  labels={dictionary.recruiter.publication}
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  {t.ownerOnlyPublication}
                </p>
              )}
              {company.isPublished && company.moderationStatus === "VISIBLE" ? (
                <Button variant="ghost" asChild>
                  <Link href={localize(`/companies/${company.slug}`)}>
                    {t.viewPublic}
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {isOwner && jobsOverview ? (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BriefcaseBusiness
                      aria-hidden="true"
                      className="text-primary size-5"
                    />
                    {t.jobs}
                  </CardTitle>
                  <CardDescription>
                    {jobsOverview.total === 0
                      ? t.noJobs
                      : formatMessage(t.jobSummary, {
                          total: formatInteger(locale, jobsOverview.total),
                          published: `${formatInteger(locale, jobsOverview.statusCounts.PUBLISHED)} ${labels.jobStatus.PUBLISHED}`,
                          draft: `${formatInteger(locale, jobsOverview.statusCounts.DRAFT)} ${labels.jobStatus.DRAFT}`,
                        })}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" asChild>
                    <Link
                      href={localize(
                        `/recruiter/jobs/new?companyId=${company.id}`,
                      )}
                    >
                      <Plus aria-hidden="true" />
                      {t.createJob}
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={localize(`/recruiter/jobs?companyId=${company.id}`)}
                    >
                      {t.manageJobs}
                    </Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            {jobsOverview.recentJobs.length ? (
              <CardContent>
                <ul className="divide-y">
                  {jobsOverview.recentJobs.map((job) => (
                    <li key={job.id}>
                      <Link
                        href={localize(`/recruiter/jobs/${job.id}`)}
                        className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {job.title}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {job.status === "PUBLISHED" && job.publishedAt
                              ? formatMessage(
                                  dictionary.recruiter.jobs.list.published,
                                  {
                                    date: formatJobDate(
                                      locale,
                                      job.publishedAt,
                                    ),
                                  },
                                )
                              : formatMessage(
                                  dictionary.recruiter.jobs.list.created,
                                  {
                                    date: formatJobDate(locale, job.createdAt),
                                  },
                                )}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <JobStatusBadge
                            status={job.status}
                            label={labels.jobStatus[job.status]}
                          />
                          <ArrowUpRight
                            aria-hidden="true"
                            className="text-muted-foreground size-4"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        {isOwner && applicationOverview ? (
          <Card className="mt-6">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UsersRound
                      aria-hidden="true"
                      className="text-primary size-5"
                    />
                    {t.applications}
                  </CardTitle>
                  <CardDescription>
                    {applicationOverview.total === 0
                      ? t.noApplications
                      : formatMessage(t.applicationSummary, {
                          total: formatInteger(
                            locale,
                            applicationOverview.total,
                          ),
                          active: formatInteger(
                            locale,
                            applicationOverview.active,
                          ),
                        })}
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={localize(
                      `/recruiter/applications?companyId=${company.id}`,
                    )}
                  >
                    {t.viewApplications}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            {applicationOverview.recent.length ? (
              <CardContent>
                <ul className="divide-y">
                  {applicationOverview.recent.map((application) => (
                    <li key={application.id}>
                      <Link
                        href={localize(
                          `/recruiter/applications/${application.id}`,
                        )}
                        className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {application.candidate.name}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {application.job.title} ·{" "}
                            {formatMessage(t.applied, {
                              date: formatJobDate(
                                locale,
                                application.submittedAt,
                              ),
                            })}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <ApplicationStatusBadge
                            status={application.status}
                            label={labels.applicationStatus[application.status]}
                          />
                          <ArrowUpRight
                            aria-hidden="true"
                            className="text-muted-foreground size-4"
                          />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
          </Card>
        ) : null}

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {isOwner ? t.teamAdministration : t.companyMembership}
                </CardTitle>
                <CardDescription>
                  {isOwner ? t.teamOwnerDescription : t.teamMemberDescription}
                </CardDescription>
              </div>
              {isOwner ? (
                <Button size="sm" variant="outline" asChild>
                  <Link
                    href={localize(`/recruiter/companies/${company.id}/team`)}
                  >
                    {t.manageTeam}
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            {teamSummary ? (
              <dl className="grid grid-cols-3 gap-3">
                <div className="bg-muted/60 rounded-xl p-3">
                  <dt className="text-muted-foreground text-xs">{t.owners}</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {formatInteger(locale, teamSummary.ownerCount)}
                  </dd>
                </div>
                <div className="bg-muted/60 rounded-xl p-3">
                  <dt className="text-muted-foreground text-xs">{t.members}</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {formatInteger(locale, teamSummary.memberCount)}
                  </dd>
                </div>
                <div className="bg-muted/60 rounded-xl p-3">
                  <dt className="text-muted-foreground text-xs">{t.pending}</dt>
                  <dd className="mt-1 text-xl font-semibold">
                    {formatInteger(locale, teamSummary.pendingInvitationCount)}
                  </dd>
                </div>
              </dl>
            ) : (
              <div>
                <Badge variant="outline">{labels.companyRole.MEMBER}</Badge>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {t.memberPrivacy}
                </p>
              </div>
            )}
            {ownMembership ? (
              <LeaveCompanyControl
                companyId={company.id}
                isFinalOwner={
                  ownMembership.role === "OWNER" &&
                  ownMembership.ownerCount === 1
                }
                labels={dictionary.recruiter.team}
              />
            ) : null}
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                <BarChart3 aria-hidden="true" className="size-5" />
              </span>
              <CardTitle className="mt-3 text-lg">{t.analytics}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-6">
                {t.analyticsDescription}
              </p>
              <Badge variant="outline" className="mt-4">
                {t.comingLater}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
