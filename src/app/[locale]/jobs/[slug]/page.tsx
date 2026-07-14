import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  GraduationCap,
  Laptop2,
  MapPin,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { JobApplyPanel } from "@/features/applications/components/job-apply-panel";
import { getSafeInternalPath } from "@/features/auth/roles";
import { getCurrentSession } from "@/features/auth/server/session";
import { formatJobDate, formatSalaryRange } from "@/features/jobs/format";
import { getPublishedJobBySlug } from "@/features/jobs/server/data";
import { JobSaveButton } from "@/features/saved-jobs/components/job-save-button";
import { isJobSavedByCandidate } from "@/features/saved-jobs/server/data";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/jobs/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = resolvePageLocale((await params).locale);
  const { metadata } = await getDictionary(locale);
  const job = await getPublishedJobBySlug(getPrismaClient(), slug);

  if (!job) {
    return { title: metadata.jobDetail.notFoundTitle };
  }

  return {
    title: job.title,
    description:
      job.summary ??
      formatMessage(metadata.jobDetail.descriptionFallback, {
        jobTitle: job.title,
        companyName: job.company.name,
      }),
    alternates: buildLocaleAlternates(`/jobs/${slug}`, locale),
  };
}

export default async function JobDetailPage({
  params,
}: PageProps<"/[locale]/jobs/[slug]">) {
  await connection();
  const { slug } = await params;
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.jobDetail;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const prisma = getPrismaClient();
  const [job, session] = await Promise.all([
    getPublishedJobBySlug(prisma, slug),
    getCurrentSession(),
  ]);

  if (!job) notFound();

  const isSaved =
    session?.user.role === "CANDIDATE"
      ? await isJobSavedByCandidate(prisma, session.user.id, slug)
      : false;

  const salary = formatSalaryRange(
    locale,
    dictionary.public.jobCard,
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Button variant="ghost" className="-ml-2" asChild>
            <Link href={localize("/jobs")}>
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              {t.backToJobs}
            </Link>
          </Button>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            <span className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl font-mono font-semibold shadow-sm">
              {job.company.name.slice(0, 2).toLocaleUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="secondary">{t.publishedRole}</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                {job.title}
              </h1>
              <p className="text-muted-foreground mt-3 text-lg font-medium">
                <Link
                  href={localize(`/companies/${job.company.slug}`)}
                  className="hover:text-foreground underline-offset-4 hover:underline"
                >
                  {job.company.name}
                </Link>
              </p>
              <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                {job.location ? (
                  <span className="flex items-center gap-2">
                    <MapPin aria-hidden="true" className="size-4" />
                    {job.location}
                  </span>
                ) : null}
                {job.workplaceType ? (
                  <span className="flex items-center gap-2">
                    <Laptop2 aria-hidden="true" className="size-4" />
                    {labels.workplaceType[job.workplaceType]}
                  </span>
                ) : null}
                {job.employmentType ? (
                  <span className="flex items-center gap-2">
                    <BriefcaseBusiness aria-hidden="true" className="size-4" />
                    {labels.employmentType[job.employmentType]}
                  </span>
                ) : null}
                {job.experienceLevel ? (
                  <span className="flex items-center gap-2">
                    <GraduationCap aria-hidden="true" className="size-4" />
                    {labels.experienceLevel[job.experienceLevel]}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8 lg:py-16">
        <article className="space-y-6">
          {job.summary ? (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{t.aboutRole}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-base leading-7">
                  {job.summary}
                </p>
                {job.skills.length ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {job.skills.map(({ skill }) => (
                      <Badge key={skill.name} variant="secondary">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {job.description ? (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{t.description}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                  {job.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {job.responsibilities ? (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{t.responsibilities}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                  {job.responsibilities}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {job.requirements ? (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-semibold">{t.requirements}</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                  {job.requirements}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </article>

        <aside aria-label={t.summaryAria}>
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <h2 className="text-base font-semibold">{t.roleSummary}</h2>
              <CardDescription>{t.roleSummaryDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SummaryItem
                label={t.compensation}
                value={salary ?? t.notDisclosed}
              />
              <Separator />
              {job.employmentType ? (
                <>
                  <SummaryItem
                    label={t.employment}
                    value={labels.employmentType[job.employmentType]}
                  />
                  <Separator />
                </>
              ) : null}
              {job.publishedAt ? (
                <>
                  <SummaryItem
                    label={t.published}
                    value={formatJobDate(locale, job.publishedAt)}
                  />
                  <Separator />
                </>
              ) : null}
              {job.applicationDeadline ? (
                <>
                  <SummaryItem
                    label={t.applyBy}
                    value={formatJobDate(locale, job.applicationDeadline)}
                    icon={
                      <CalendarClock aria-hidden="true" className="size-4" />
                    }
                  />
                  <Separator />
                </>
              ) : null}
              {!session ? (
                <Button variant="outline" className="w-full" asChild>
                  <Link
                    href={localize(
                      `/login?callbackPath=${encodeURIComponent(
                        getSafeInternalPath(`/jobs/${slug}`, "/jobs"),
                      )}`,
                    )}
                  >
                    {dictionary.public.jobCard.signInToSave}
                  </Link>
                </Button>
              ) : session.user.role === "CANDIDATE" ? (
                <JobSaveButton
                  slug={slug}
                  initialSaved={isSaved}
                  labels={dictionary.public.saveButton}
                  className="w-full"
                />
              ) : null}
              {session?.user.role === "CANDIDATE" || !session ? (
                <Separator />
              ) : null}
              <JobApplyPanel
                slug={job.slug}
                applicationDeadline={job.applicationDeadline}
                locale={locale}
                dictionary={dictionary}
              />
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}

function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1.5 flex items-center gap-2 font-semibold">
        {icon}
        {value}
      </p>
    </div>
  );
}
