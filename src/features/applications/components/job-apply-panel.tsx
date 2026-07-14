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
import type { AppDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { getPrismaClient } from "@/lib/prisma";

export async function JobApplyPanel({
  slug,
  applicationDeadline,
  locale,
  dictionary,
}: {
  slug: string;
  applicationDeadline: Date | null;
  locale: RouteLocale;
  dictionary: AppDictionary;
}) {
  const t = dictionary.public.applyPanel;
  const session = await getCurrentSession();
  const deadlinePassed = isApplicationDeadlinePassed(applicationDeadline);
  const localize = (path: string) => localizeInternalPath(path, locale);

  if (!session) {
    const callbackPath = getSafeInternalPath(`/jobs/${slug}`, "/jobs");
    return (
      <PanelShell note={t.signInNote}>
        <Button asChild className="h-10 w-full">
          <Link
            href={localize(
              `/login?callbackPath=${encodeURIComponent(callbackPath)}`,
            )}
          >
            <LogIn aria-hidden="true" data-icon="inline-start" />
            {t.signInToApply}
          </Link>
        </Button>
      </PanelShell>
    );
  }

  if (session.user.role !== "CANDIDATE") {
    return (
      <PanelShell
        note={session.user.role === "RECRUITER" ? t.recruiterNote : t.adminNote}
      >
        <Button type="button" className="h-10 w-full" disabled>
          <Lock aria-hidden="true" data-icon="inline-start" />
          {t.candidateOnly}
        </Button>
      </PanelShell>
    );
  }

  const prisma = getPrismaClient();
  const job = await getJobForApplication(prisma, slug);
  if (!job) {
    return (
      <PanelShell note={t.closedNote}>
        <Button type="button" className="h-10 w-full" disabled>
          {t.applicationsClosed}
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
      <PanelShell note={t.alreadyAppliedNote}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-sm">{t.yourStatus}</span>
          <ApplicationStatusBadge
            status={application.status}
            label={dictionary.labels.applicationStatus[application.status]}
          />
        </div>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href={localize(`/candidate/applications/${application.id}`)}>
            {t.viewYourApplication}
          </Link>
        </Button>
      </PanelShell>
    );
  }

  if (deadlinePassed) {
    return (
      <PanelShell note={t.deadlinePassedNote}>
        <Button type="button" className="h-10 w-full" disabled>
          {t.applicationsClosed}
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
      <PanelShell note={t.completeProfileNote}>
        <ul className="text-muted-foreground -mt-2 list-disc space-y-1 pl-5 text-sm">
          {readiness.missingFields.map(({ field }) => (
            <li key={field}>{dictionary.candidate.profileReadiness[field]}</li>
          ))}
        </ul>
        <Button asChild variant="outline" className="h-10 w-full">
          <Link href={localize("/candidate/profile/edit")}>
            <CircleAlert aria-hidden="true" data-icon="inline-start" />
            {t.completeProfile}
          </Link>
        </Button>
      </PanelShell>
    );
  }

  return (
    <PanelShell note={t.privacyNote}>
      <Button asChild className="h-10 w-full">
        <Link href={localize(`/jobs/${slug}/apply`)}>
          <Send aria-hidden="true" data-icon="inline-start" />
          {t.applyNow}
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
