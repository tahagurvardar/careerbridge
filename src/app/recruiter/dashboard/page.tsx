import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Plus,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { getRecruiterApplicationDashboard } from "@/features/applications/server/data";
import { getPendingIncomingInvitationCount } from "@/features/company-team/server/data";
import { InterviewStatusBadge } from "@/features/interviews/components/interview-status-badge";
import { formatInterviewRange } from "@/features/interviews/interviews";
import { getRecruiterUpcomingInterviews } from "@/features/interviews/server/data";
import { NotificationSummaryList } from "@/features/notifications/components/notification-summary-list";
import { formatUnreadBadge } from "@/features/notifications/notifications";
import { getNotificationSummary } from "@/features/notifications/server/data";
import { formatJobDate } from "@/features/jobs/format";
import { getRecruiterJobStatusCounts } from "@/features/jobs/server/data";
import { getRecruiterProfileWorkspace } from "@/features/recruiter-company/server/data";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Recruiter dashboard",
  description: "Your protected CareerBridge recruiter workspace.",
};

export default async function RecruiterDashboardPage() {
  const session = await requireRole("RECRUITER", "/recruiter/dashboard");
  const prisma = getPrismaClient();
  const [
    [profile, memberships],
    jobCounts,
    applicationDashboard,
    notifications,
    incomingInvitationCount,
    interviewSummary,
  ] = await Promise.all([
    getRecruiterProfileWorkspace(prisma, session.user.id),
    getRecruiterJobStatusCounts(prisma, session.user.id),
    getRecruiterApplicationDashboard(prisma, session.user.id),
    getNotificationSummary(prisma, session.user.id),
    getPendingIncomingInvitationCount(prisma, session.user.id),
    getRecruiterUpcomingInterviews(prisma, session.user.id, new Date()),
  ]);
  const nextInterview = interviewSummary.next[0] ?? null;
  const appCounts = applicationDashboard.statusCounts;
  const activeApplications =
    appCounts.SUBMITTED +
    appCounts.UNDER_REVIEW +
    appCounts.INTERVIEW +
    appCounts.OFFER;
  const profileSignals = [
    profile?.jobTitle,
    profile?.bio,
    profile?.linkedinUrl,
  ];
  const completedProfileFields = profileSignals.filter(Boolean).length;
  const profilePercentage = Math.round(
    (completedProfileFields / profileSignals.length) * 100,
  );
  const ownedCount = memberships.filter(({ role }) => role === "OWNER").length;
  const publishedCount = memberships.filter(
    ({ company }) => company.isPublished,
  ).length;
  const totalJobs =
    jobCounts.DRAFT +
    jobCounts.PUBLISHED +
    jobCounts.CLOSED +
    jobCounts.ARCHIVED;
  const recommendation =
    incomingInvitationCount > 0
      ? {
          label: "Review company invitations",
          href: "/recruiter/invitations",
        }
      : !profile || profilePercentage < 100
        ? {
            label: "Complete your recruiter profile",
            href: "/recruiter/profile/edit",
          }
        : memberships.length === 0
          ? {
              label: "Create your first company",
              href: "/recruiter/companies/new",
            }
          : publishedCount === 0
            ? {
                label: "Complete and publish a company",
                href: `/recruiter/companies/${memberships[0].company.id}`,
              }
            : totalJobs === 0
              ? { label: "Create your first job", href: "/recruiter/jobs/new" }
              : jobCounts.PUBLISHED === 0
                ? {
                    label: "Publish a complete job",
                    href: "/recruiter/jobs?status=DRAFT",
                  }
                : appCounts.SUBMITTED > 0
                  ? {
                      label: "Review new applications",
                      href: "/recruiter/applications?status=SUBMITTED",
                    }
                  : { label: "Manage your jobs", href: "/recruiter/jobs" };

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Recruiter</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              Company workspace
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Welcome, {session.user.name}.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            Manage your recruiter identity and company profiles. Hiring
            workflows remain clear placeholders until their dedicated phases.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                Recruiter profile
              </CardTitle>
              <CardDescription>
                {completedProfileFields} of 3 professional fields complete
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Progress
                value={profilePercentage}
                aria-label={`Recruiter profile ${profilePercentage}% complete`}
              />
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/recruiter/profile">View profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/recruiter/profile/edit">Edit profile</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-primary size-5" />
                Company setup
              </CardTitle>
              <CardDescription>
                Real workspace state, with no placeholder counts
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <dl className="grid grid-cols-2 gap-4">
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">
                    Companies owned
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold">{ownedCount}</dd>
                </div>
                <div className="bg-muted/60 rounded-xl p-4">
                  <dt className="text-muted-foreground text-sm">Published</dt>
                  <dd className="mt-1 text-2xl font-semibold">
                    {publishedCount}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/recruiter/companies">
                    <Building2 aria-hidden="true" />
                    Manage companies
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/recruiter/companies/new">
                    <Plus aria-hidden="true" />
                    Create company
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Company invitations
                  {incomingInvitationCount > 0 ? (
                    <Badge>{incomingInvitationCount} pending</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  Invitations sent to your Recruiter account
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/recruiter/invitations">Review invitations</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm leading-6">
              {incomingInvitationCount > 0
                ? `You have ${incomingInvitationCount} active ${incomingInvitationCount === 1 ? "invitation" : "invitations"} awaiting a response.`
                : "You have no active company invitations."}
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Jobs
                </CardTitle>
                <CardDescription>
                  Real counts across every company you own
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" asChild>
                  <Link href="/recruiter/jobs/new">
                    <Plus aria-hidden="true" />
                    Create job
                  </Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/recruiter/jobs">Manage jobs</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">Draft</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {jobCounts.DRAFT}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">Published</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {jobCounts.PUBLISHED}
                </dd>
              </div>
              <div className="bg-muted/60 rounded-xl p-4">
                <dt className="text-muted-foreground text-sm">Closed</dt>
                <dd className="mt-1 text-2xl font-semibold">
                  {jobCounts.CLOSED}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UsersRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Applications
                </CardTitle>
                <CardDescription>
                  Applicants across every company you own
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/recruiter/applications">View applications</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/recruiter/analytics">Recruiting analytics</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile label="Total" value={applicationDashboard.total} />
              <StatTile label="Active" value={activeApplications} />
              <StatTile label="New" value={appCounts.SUBMITTED} />
              <StatTile label="Review" value={appCounts.UNDER_REVIEW} />
              <StatTile label="Interview" value={appCounts.INTERVIEW} />
              <StatTile label="Offer" value={appCounts.OFFER} />
            </dl>
            {applicationDashboard.recent.length ? (
              <ul className="divide-y">
                {applicationDashboard.recent.map((application) => (
                  <li key={application.id}>
                    <Link
                      href={`/recruiter/applications/${application.id}`}
                      className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {application.candidate.name}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {application.job.title} ·{" "}
                          {application.job.company.name} · Applied{" "}
                          {formatJobDate(application.submittedAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <ApplicationStatusBadge status={application.status} />
                        <ArrowUpRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4"
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                No applications yet. Publish jobs to start receiving applicants.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  Interviews
                  {interviewSummary.pendingResponseCount > 0 ? (
                    <Badge>
                      {interviewSummary.pendingResponseCount} awaiting response
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  The next interview across companies you own
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/recruiter/interviews">Open interview agenda</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {nextInterview ? (
              <Link
                href={`/recruiter/interviews/${nextInterview.id}`}
                className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {nextInterview.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {nextInterview.application.candidate.name} ·{" "}
                    {nextInterview.application.job.title} ·{" "}
                    {nextInterview.application.job.company.name}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {formatInterviewRange(
                      nextInterview.startAt,
                      nextInterview.endAt,
                      nextInterview.timeZone,
                    )}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <InterviewStatusBadge status={nextInterview.status} />
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                  />
                </span>
              </Link>
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                No upcoming interviews. Schedule one from an application you
                own.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell aria-hidden="true" className="text-primary size-5" />
                  Notifications
                  {notifications.unreadCount > 0 ? (
                    <Badge>
                      {formatUnreadBadge(notifications.unreadCount)} unread
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>
                  New applications and withdrawals across companies you own
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/notifications">Open notifications</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.recent.length ? (
              <NotificationSummaryList notifications={notifications.recent} />
            ) : (
              <p className="text-muted-foreground text-sm leading-6">
                No notifications yet. New applications and withdrawals will
                appear here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5 mt-6">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Recommended next action</p>
              <p className="text-muted-foreground mt-1">
                Continue with the next meaningful workspace step.
              </p>
            </div>
            <Button asChild>
              <Link href={recommendation.href}>{recommendation.label}</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
              <BarChart3 aria-hidden="true" className="size-5" />
            </span>
            <CardTitle className="mt-3 text-lg">Hiring analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-6">
              OWNER-only Company metrics, Application funnels, conversion rates,
              and bounded Job performance comparisons from real workflow data.
            </p>
            <Button variant="outline" className="mt-5" asChild>
              <Link href="/recruiter/analytics">View analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/60 rounded-xl p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}
