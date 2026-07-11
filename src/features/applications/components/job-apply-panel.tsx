import Link from "next/link";
import { CircleAlert, Lock, LogIn, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSafeInternalPath } from "@/features/auth/roles";
import { getCurrentSession } from "@/features/auth/server/session";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import {
  getCandidateProfileReadiness,
  isApplicationDeadlinePassed,
} from "@/features/applications/eligibility";
import {
  getCandidateApplicationForJob,
  getCandidateApplyProfile,
  getJobForApplication,
} from "@/features/applications/server/data";
import { getPrismaClient } from "@/lib/prisma";

const privacyNote =
  "Applying shares your profile — name, headline, location, skills, education, and experience — with this company's hiring team.";

export async function JobApplyPanel({
  slug,
  applicationDeadline,
}: {
  slug: string;
  applicationDeadline: Date | null;
}) {
  const session = await getCurrentSession();
  const deadlinePassed = isApplicationDeadlinePassed(applicationDeadline);

  if (!session) {
    const callbackPath = getSafeInternalPath(`/jobs/${slug}`, "/jobs");
    return (
      <PanelShell note="Sign in as a candidate to apply for this role.">
        <Button asChild className="h-10 w-full">
          <Link
            href={`/login?callbackPath=${encodeURIComponent(callbackPath)}`}
          >
            <LogIn aria-hidden="true" data-icon="inline-start" />
            Sign in to apply
          </Link>
        </Button>
      </PanelShell>
    );
  }

  if (session.user.role !== "CANDIDATE") {
    return (
      <PanelShell
        note={
          session.user.role === "RECRUITER"
            ? "You are signed in as a recruiter. Recruiters manage jobs and cannot apply to them."
            : "You are signed in as an admin. Admin accounts cannot apply to jobs."
        }
      >
        <Button type="button" className="h-10 w-full" disabled>
          <Lock aria-hidden="true" data-icon="inline-start" />
          Applying is candidate-only
        </Button>
      </PanelShell>
    );
  }

  const prisma = getPrismaClient();
  const job = await getJobForApplication(prisma, slug);
  if (!job) {
    return (
      <PanelShell note="This job is no longer accepting applications.">
        <Button type="button" className="h-10 w-full" disabled>
          Applications closed
        </Button>
      </PanelShell>
    );
  }

  const [application, applyProfile] = await Promise.all([
    getCandidateApplicationForJob(prisma, session.user.id, job.id),
    getCandidateApplyProfile(prisma, session.user.id),
  ]);

  if (application) {
    return (
      <PanelShell note="You have already applied to this job.">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">Your status</span>
          <ApplicationStatusBadge status={application.status} />
        </div>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href={`/candidate/applications/${application.id}`}>
            View your application
          </Link>
        </Button>
      </PanelShell>
    );
  }

  if (deadlinePassed) {
    return (
      <PanelShell note="The application deadline for this job has passed.">
        <Button type="button" className="h-10 w-full" disabled>
          Applications closed
        </Button>
      </PanelShell>
    );
  }

  const readiness = getCandidateProfileReadiness({
    headline: applyProfile.headline,
    location: applyProfile.location,
    skillCount: applyProfile.skillCount,
  });

  if (!readiness.isReady) {
    return (
      <PanelShell note="Complete your profile before applying:">
        <ul className="text-muted-foreground -mt-2 list-disc space-y-1 pl-5 text-sm">
          {readiness.missingFields.map(({ field, label }) => (
            <li key={field}>{label}</li>
          ))}
        </ul>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href="/candidate/profile/edit">
            <CircleAlert aria-hidden="true" data-icon="inline-start" />
            Complete your profile
          </Link>
        </Button>
      </PanelShell>
    );
  }

  return (
    <PanelShell note={privacyNote}>
      <Button asChild className="h-10 w-full">
        <Link href={`/jobs/${slug}/apply`}>
          <Send aria-hidden="true" data-icon="inline-start" />
          Apply now
        </Link>
      </Button>
    </PanelShell>
  );
}

function PanelShell({
  children,
  note,
}: {
  children: React.ReactNode;
  note: string;
}) {
  return (
    <div className="grid gap-3">
      {children}
      <p className="text-muted-foreground text-xs leading-5">{note}</p>
    </div>
  );
}
