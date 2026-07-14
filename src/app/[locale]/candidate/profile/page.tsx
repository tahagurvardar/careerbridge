import type { Metadata } from "next";
import Link from "next/link";
import {
  BriefcaseBusiness,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  Pencil,
  Plus,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompletionCard } from "@/features/candidate-profile/components/completion-card";
import { DeleteRecordButton } from "@/features/candidate-profile/components/delete-record-button";
import { SkillManager } from "@/features/candidate-profile/components/skill-manager";
import { getCompletionFromProfile } from "@/features/candidate-profile/completion";
import {
  deleteEducationAction,
  deleteExperienceAction,
  type ProfileFeedbackCode,
} from "@/features/candidate-profile/server/actions";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { formatFileSize } from "@/features/candidate-documents/documents";
import { getCandidateCurrentResume } from "@/features/candidate-documents/server/data";
import type { CandidateDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatMonthYear } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/candidate/profile">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  const { profile } = (await getDictionary(locale)).candidate;
  return {
    title: profile.metaTitle,
    description: profile.metaDescription,
  };
}

function getFeedback(
  value: string | string[] | undefined,
  feedback: CandidateDictionary["profile"]["feedback"],
) {
  const messages: Record<ProfileFeedbackCode, string> = {
    "basic-saved": feedback.basicSaved,
    "education-added": feedback.educationAdded,
    "education-updated": feedback.educationUpdated,
    "experience-added": feedback.experienceAdded,
    "experience-updated": feedback.experienceUpdated,
  };
  return typeof value === "string" && value in messages
    ? messages[value as ProfileFeedbackCode]
    : null;
}

function formatExperienceDates(
  locale: RouteLocale,
  presentLabel: string,
  startDate: Date,
  endDate: Date | null,
  isCurrent: boolean,
) {
  return `${formatMonthYear(locale, startDate)} — ${
    isCurrent || !endDate ? presentLabel : formatMonthYear(locale, endDate)
  }`;
}

export default async function CandidateProfilePage({
  params,
  searchParams,
}: PageProps<"/[locale]/candidate/profile">) {
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.candidate.profile;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const session = await requireRole("CANDIDATE", "/candidate/profile");
  const prisma = getPrismaClient();
  const [profile, currentResume, query] = await Promise.all([
    getCandidateProfile(prisma, session.user.id),
    getCandidateCurrentResume(prisma, session.user.id),
    searchParams,
  ]);
  const completion = getCompletionFromProfile(profile);
  const feedback = getFeedback(query.updated, t.feedback);
  const professionalLinks = [
    { label: t.website, href: profile?.websiteUrl },
    { label: t.linkedIn, href: profile?.linkedinUrl },
    { label: t.gitHub, href: profile?.githubUrl },
  ].filter((item): item is { label: string; href: string } =>
    Boolean(item.href),
  );

  return (
    <section className="relative overflow-hidden py-10 sm:py-14">
      <div
        aria-hidden="true"
        className="hero-grid absolute inset-x-0 top-0 -z-10 h-96"
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {feedback ? (
          <div
            className="bg-primary/10 text-primary border-primary/20 mb-6 rounded-xl border px-4 py-3 text-sm"
            role="status"
          >
            {feedback}
          </div>
        ) : null}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t.badge}</Badge>
              <span className="text-muted-foreground text-sm">
                {t.privateLabel}
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {session.user.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {profile?.headline || t.headlineFallback}
            </p>
            <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <Mail aria-hidden="true" className="size-4" />
                {session.user.email}
              </span>
              {profile?.location ? (
                <span className="inline-flex items-center gap-2">
                  <MapPin aria-hidden="true" className="size-4" />
                  {profile.location}
                </span>
              ) : null}
            </div>
          </div>
          <Button size="lg" asChild>
            <Link href={localize("/candidate/profile/edit")}>
              <Pencil aria-hidden="true" />
              {t.editProfile}
            </Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="grid min-w-0 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserRound
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.aboutTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                {profile?.bio ? (
                  <p className="leading-7 whitespace-pre-line">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground leading-6">
                    {t.bioEmpty}
                  </p>
                )}
                {professionalLinks.length ? (
                  <ul
                    className="flex flex-wrap gap-2"
                    aria-label={t.professionalLinksAria}
                  >
                    {professionalLinks.map((link) => (
                      <li key={link.label}>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer noopener"
                          >
                            <Link2 aria-hidden="true" />
                            {link.label}
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3"
                            />
                          </a>
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>

            <Card id="skills" className="scroll-mt-24">
              <CardHeader>
                <CardTitle className="text-lg">{t.skillsTitle}</CardTitle>
                <CardDescription>{t.skillsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <SkillManager
                  skills={(profile?.skills ?? []).map(({ skill }) => ({
                    id: skill.id,
                    name: skill.name,
                  }))}
                  candidate={dictionary.candidate}
                  validation={dictionary.validation}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.educationTitle}
                </CardTitle>
                <CardAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={localize("/candidate/profile/education/new")}>
                      <Plus aria-hidden="true" />
                      {t.add}
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {profile?.education.length ? (
                  <ul className="divide-border divide-y">
                    {profile.education.map((education) => (
                      <li
                        key={education.id}
                        className="py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="font-medium">{education.school}</h2>
                            {education.degree || education.fieldOfStudy ? (
                              <p className="text-muted-foreground mt-1">
                                {[education.degree, education.fieldOfStudy]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                            <p className="text-muted-foreground mt-2 text-sm">
                              {education.startYear} —{" "}
                              {education.isCurrent
                                ? t.present
                                : education.endYear}
                            </p>
                            {education.description ? (
                              <p className="mt-3 leading-6 whitespace-pre-line">
                                {education.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                href={localize(
                                  `/candidate/profile/education/${education.id}/edit`,
                                )}
                              >
                                <Pencil aria-hidden="true" />
                                {t.edit}
                              </Link>
                            </Button>
                            <DeleteRecordButton
                              recordLabel="education"
                              action={deleteEducationAction.bind(
                                null,
                                education.id,
                              )}
                              t={t.deleteRecord}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-5">
                    <p className="font-medium">{t.noEducation}</p>
                    <p className="text-muted-foreground mt-2 leading-6">
                      {t.noEducationDescription}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BriefcaseBusiness
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.experienceTitle}
                </CardTitle>
                <CardAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={localize("/candidate/profile/experience/new")}>
                      <Plus aria-hidden="true" />
                      {t.add}
                    </Link>
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {profile?.experience.length ? (
                  <ul className="divide-border divide-y">
                    {profile.experience.map((experience) => (
                      <li
                        key={experience.id}
                        className="py-5 first:pt-0 last:pb-0"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="font-medium">
                              {experience.jobTitle}
                            </h2>
                            <p className="text-muted-foreground mt-1">
                              {experience.companyName} ·{" "}
                              {
                                dictionary.labels.employmentType[
                                  experience.employmentType
                                ]
                              }
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                              {formatExperienceDates(
                                locale,
                                t.present,
                                experience.startDate,
                                experience.endDate,
                                experience.isCurrent,
                              )}
                              {experience.location
                                ? ` · ${experience.location}`
                                : ""}
                            </p>
                            {experience.description ? (
                              <p className="mt-3 leading-6 whitespace-pre-line">
                                {experience.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link
                                href={localize(
                                  `/candidate/profile/experience/${experience.id}/edit`,
                                )}
                              >
                                <Pencil aria-hidden="true" />
                                {t.edit}
                              </Link>
                            </Button>
                            <DeleteRecordButton
                              recordLabel="experience"
                              action={deleteExperienceAction.bind(
                                null,
                                experience.id,
                              )}
                              t={t.deleteRecord}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-5">
                    <p className="font-medium">{t.noExperience}</p>
                    <p className="text-muted-foreground mt-2 leading-6">
                      {t.noExperienceDescription}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:sticky lg:top-24">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText
                    aria-hidden="true"
                    className="text-primary size-5"
                  />
                  {t.cvTitle}
                </CardTitle>
                <CardDescription>
                  {currentResume.hasResume
                    ? t.cvCurrentDescription
                    : t.cvEmptyDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {currentResume.hasResume ? (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <FileText
                        aria-hidden="true"
                        className="text-muted-foreground size-4 shrink-0"
                      />
                      <span className="truncate">{currentResume.filename}</span>
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {formatFileSize(currentResume.sizeBytes)}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {t.cvEmpty}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={localize("/candidate/documents")}>
                      {currentResume.hasResume ? t.manageCv : t.addCv}
                    </Link>
                  </Button>
                  {currentResume.hasResume ? (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/api/documents/${currentResume.documentId}/download`}
                      >
                        <Download aria-hidden="true" />
                        {t.download}
                      </a>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            <CompletionCard
              {...completion}
              locale={locale}
              t={dictionary.candidate.completion}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
