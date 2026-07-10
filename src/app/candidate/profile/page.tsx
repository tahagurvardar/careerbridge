import type { Metadata } from "next";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ExternalLink,
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
import { employmentTypeLabels } from "@/features/candidate-profile/schemas";
import {
  deleteEducationAction,
  deleteExperienceAction,
} from "@/features/candidate-profile/server/actions";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Candidate profile",
  description: "Manage your professional CareerBridge profile.",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const allowedFeedback = new Set([
  "Professional information saved.",
  "Education added.",
  "Education updated.",
  "Experience added.",
  "Experience updated.",
]);

function getFeedback(value: string | string[] | undefined) {
  return typeof value === "string" && allowedFeedback.has(value) ? value : null;
}

function formatExperienceDates(
  startDate: Date,
  endDate: Date | null,
  isCurrent: boolean,
) {
  return `${dateFormatter.format(startDate)} — ${
    isCurrent || !endDate ? "Present" : dateFormatter.format(endDate)
  }`;
}

export default async function CandidateProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string | string[] }>;
}) {
  const session = await requireRole("CANDIDATE", "/candidate/profile");
  const [profile, query] = await Promise.all([
    getCandidateProfile(getPrismaClient(), session.user.id),
    searchParams,
  ]);
  const completion = getCompletionFromProfile(profile);
  const feedback = getFeedback(query.updated);
  const professionalLinks = [
    { label: "Website", href: profile?.websiteUrl },
    { label: "LinkedIn", href: profile?.linkedinUrl },
    { label: "GitHub", href: profile?.githubUrl },
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
              <Badge variant="secondary">Candidate profile</Badge>
              <span className="text-muted-foreground text-sm">
                Private to your account
              </span>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
              {session.user.name}
            </h1>
            <p className="text-muted-foreground mt-3 text-lg">
              {profile?.headline ||
                "Add a headline that explains the value you bring."}
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
            <Link href="/candidate/profile/edit">
              <Pencil aria-hidden="true" />
              Edit profile
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
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                {profile?.bio ? (
                  <p className="leading-7 whitespace-pre-line">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground leading-6">
                    Your bio is empty. Add a short, specific introduction to
                    help future profile features represent you accurately.
                  </p>
                )}
                {professionalLinks.length ? (
                  <ul
                    className="flex flex-wrap gap-2"
                    aria-label="Professional links"
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
                <CardTitle className="text-lg">Skills</CardTitle>
                <CardDescription>
                  Add concise, searchable strengths without proficiency ratings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SkillManager
                  skills={(profile?.skills ?? []).map(({ skill }) => ({
                    id: skill.id,
                    name: skill.name,
                  }))}
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
                  Education
                </CardTitle>
                <CardAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/candidate/profile/education/new">
                      <Plus aria-hidden="true" />
                      Add
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
                                ? "Present"
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
                                href={`/candidate/profile/education/${education.id}/edit`}
                              >
                                <Pencil aria-hidden="true" />
                                Edit
                              </Link>
                            </Button>
                            <DeleteRecordButton
                              recordLabel="education"
                              action={deleteEducationAction.bind(
                                null,
                                education.id,
                              )}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-5">
                    <p className="font-medium">No education added</p>
                    <p className="text-muted-foreground mt-2 leading-6">
                      Add a school, degree, course of study, and relevant
                      context.
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
                  Experience
                </CardTitle>
                <CardAction>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/candidate/profile/experience/new">
                      <Plus aria-hidden="true" />
                      Add
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
                              {employmentTypeLabels[experience.employmentType]}
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                              {formatExperienceDates(
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
                                href={`/candidate/profile/experience/${experience.id}/edit`}
                              >
                                <Pencil aria-hidden="true" />
                                Edit
                              </Link>
                            </Button>
                            <DeleteRecordButton
                              recordLabel="experience"
                              action={deleteExperienceAction.bind(
                                null,
                                experience.id,
                              )}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="bg-muted/50 rounded-xl p-5">
                    <p className="font-medium">No experience added</p>
                    <p className="text-muted-foreground mt-2 leading-6">
                      Add roles that show what you worked on and the scope you
                      owned.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-24">
            <CompletionCard {...completion} />
          </div>
        </div>
      </div>
    </section>
  );
}
