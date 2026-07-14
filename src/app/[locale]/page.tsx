import Link from "next/link";
import Form from "next/form";
import { connection } from "next/server";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  FileUser,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JobCard } from "@/features/jobs/components/job-card";
import { getFeaturedPublishedJobs } from "@/features/jobs/server/data";
import { localizeInternalPath } from "@/i18n/paths";
import { getDictionary, resolvePageLocale } from "@/i18n/server";
import { buildLocaleAlternates } from "@/i18n/seo";
import { formatMessage } from "@/i18n/translate";
import { getPrismaClient } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = resolvePageLocale((await params).locale);
  return { alternates: buildLocaleAlternates("/", locale) };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  // Render at request time so featured jobs stay fresh and the build does not
  // read the database while prerendering.
  await connection();
  const locale = resolvePageLocale((await params).locale);
  const dictionary = await getDictionary(locale);
  const t = dictionary.public.landing;
  const { labels } = dictionary;
  const localize = (path: string) => localizeInternalPath(path, locale);
  const featuredJobs = await getFeaturedPublishedJobs(getPrismaClient(), 6);

  const benefits = [
    {
      icon: Target,
      title: t.benefits.discoveryTitle,
      description: t.benefits.discoveryDescription,
    },
    {
      icon: FileUser,
      title: t.benefits.storyTitle,
      description: t.benefits.storyDescription,
    },
    {
      icon: ShieldCheck,
      title: t.benefits.progressTitle,
      description: t.benefits.progressDescription,
    },
  ];

  return (
    <>
      <section className="relative isolate overflow-hidden border-b">
        <div
          aria-hidden="true"
          className="hero-grid pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-28">
          <div>
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles aria-hidden="true" data-icon="inline-start" />
              {t.heroBadge}
            </Badge>
            <h1 className="max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.055em] text-balance sm:text-6xl lg:text-7xl">
              {t.heroTitleLead}{" "}
              <span className="text-primary">{t.heroTitleAccent}</span>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
              {t.heroDescription}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-5" asChild>
                <Link href={localize("/jobs")}>
                  {t.exploreOpportunities}
                  <ArrowRight aria-hidden="true" data-icon="inline-end" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-11 px-5" asChild>
                <Link href={localize("/register")}>{t.startProfile}</Link>
              </Button>
            </div>
            <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {[
                t.heroPoints.candidateFirst,
                t.heroPoints.recruiterReady,
                t.heroPoints.builtForTrust,
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check aria-hidden="true" className="text-primary size-4" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <Card className="bg-card/95 ring-foreground/12 relative shadow-2xl shadow-black/8 dark:shadow-black/25">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{t.searchCardTitle}</CardTitle>
                  <CardDescription className="mt-1">
                    {t.searchCardDescription}
                  </CardDescription>
                </div>
                <Badge variant="outline">{t.searchCardBadge}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              <Form
                action={localize("/jobs")}
                role="search"
                aria-label={t.searchAria}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <label htmlFor="home-job-query" className="sr-only">
                      {t.queryLabel}
                    </label>
                    <Search
                      aria-hidden="true"
                      className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                      id="home-job-query"
                      name="q"
                      placeholder={t.queryPlaceholder}
                      className="h-11 pl-9"
                    />
                  </div>
                  <div className="relative">
                    <label htmlFor="home-job-location" className="sr-only">
                      {t.locationLabel}
                    </label>
                    <MapPin
                      aria-hidden="true"
                      className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                    />
                    <Input
                      id="home-job-location"
                      name="location"
                      placeholder={t.locationPlaceholder}
                      className="h-11 pl-9"
                    />
                  </div>
                  <Button type="submit" className="h-11">
                    {t.searchSubmit}
                  </Button>
                </div>
              </Form>
              <div className="border-t pt-5">
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                  {t.recentlyPublished}
                </p>
                {featuredJobs.length ? (
                  <div className="space-y-2">
                    {featuredJobs.slice(0, 2).map((job) => (
                      <Link
                        key={job.slug}
                        href={localize(`/jobs/${job.slug}`)}
                        aria-label={formatMessage(t.viewJobAria, {
                          jobTitle: job.title,
                          companyName: job.company.name,
                        })}
                        className="bg-muted/60 hover:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-xl p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <span className="bg-background flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold shadow-sm">
                          {job.company.name.slice(0, 2).toLocaleUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {job.title}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {job.company.name}
                            {job.workplaceType
                              ? ` · ${labels.workplaceType[job.workplaceType]}`
                              : ""}
                          </p>
                        </div>
                        {job.employmentType ? (
                          <Badge variant="secondary">
                            {labels.employmentType[job.employmentType]}
                          </Badge>
                        ) : null}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="text-muted-foreground size-4 shrink-0"
                        />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm leading-6">
                    {t.noPublishedJobsShort}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-label={t.statsAria} className="bg-card border-b">
        <div className="mx-auto grid max-w-7xl divide-y px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          <PlatformStat
            icon={UsersRound}
            value={t.stats.rolesValue}
            label={t.stats.rolesLabel}
          />
          <PlatformStat
            icon={BadgeCheck}
            value={t.stats.journeyValue}
            label={t.stats.journeyLabel}
          />
          <PlatformStat
            icon={Sparkles}
            value={t.stats.aiValue}
            label={t.stats.aiLabel}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading
          eyebrow={t.whyEyebrow}
          title={t.whyTitle}
          description={t.whyDescription}
          centered
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <Card key={benefit.title} className="h-full">
                <CardHeader>
                  <span className="bg-accent text-accent-foreground mb-4 flex size-11 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {benefit.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="bg-secondary/45 border-y">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
          <SectionHeading
            eyebrow={t.audienceEyebrow}
            title={t.audienceTitle}
            description={t.audienceDescription}
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <AudiencePanel
              icon={BriefcaseBusiness}
              eyebrow={t.candidatePanel.eyebrow}
              title={t.candidatePanel.title}
              points={[
                t.candidatePanel.point1,
                t.candidatePanel.point2,
                t.candidatePanel.point3,
              ]}
              action={t.candidatePanel.action}
              href={localize("/register")}
            />
            <AudiencePanel
              icon={Building2}
              eyebrow={t.recruiterPanel.eyebrow}
              title={t.recruiterPanel.title}
              points={[
                t.recruiterPanel.point1,
                t.recruiterPanel.point2,
                t.recruiterPanel.point3,
              ]}
              action={t.recruiterPanel.action}
              href={localize("/register")}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t.featuredEyebrow}
            title={t.featuredTitle}
            description={t.featuredDescription}
          />
          <Button variant="outline" asChild>
            <Link href={localize("/jobs")}>
              {t.browseAllJobs}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        {featuredJobs.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featuredJobs.map((job) => (
              <JobCard
                key={job.slug}
                job={job}
                locale={locale}
                dictionary={dictionary}
              />
            ))}
          </div>
        ) : (
          <div className="bg-card mt-10 flex flex-col items-center rounded-2xl border border-dashed px-6 py-14 text-center">
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
              <BriefcaseBusiness aria-hidden="true" className="size-6" />
            </span>
            <h3 className="mt-5 text-xl font-semibold">{t.emptyJobsTitle}</h3>
            <p className="text-muted-foreground mt-2 max-w-md leading-7">
              {t.emptyJobsDescription}
            </p>
          </div>
        )}
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="bg-foreground text-background mx-auto grid max-w-7xl gap-8 overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-background/70 text-sm font-semibold tracking-wide uppercase">
              {t.ctaEyebrow}
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              {t.ctaTitle}
            </h2>
          </div>
          <Button
            size="lg"
            className="bg-background text-foreground hover:bg-background/90 h-11 px-5"
            asChild
          >
            <Link href={localize("/register")}>
              {t.ctaAction}
              <ArrowRight aria-hidden="true" data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

interface PlatformStatProps {
  icon: LucideIcon;
  value: string;
  label: string;
}

function PlatformStat({ icon: Icon, value, label }: PlatformStatProps) {
  return (
    <div className="flex gap-3 px-2 py-6 sm:px-6">
      <Icon
        aria-hidden="true"
        className="text-primary mt-0.5 size-5 shrink-0"
      />
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-5">{label}</p>
      </div>
    </div>
  );
}

interface AudiencePanelProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  points: string[];
  action: string;
  href: string;
}

function AudiencePanel({
  icon: Icon,
  eyebrow,
  title,
  points,
  action,
  href,
}: AudiencePanelProps) {
  return (
    <div className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
      <span className="bg-primary text-primary-foreground flex size-11 items-center justify-center rounded-xl">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="text-primary mt-6 text-sm font-semibold">{eyebrow}</p>
      <h3 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-balance">
        {title}
      </h3>
      <ul className="text-muted-foreground mt-6 space-y-3 text-sm">
        {points.map((point) => (
          <li key={point} className="flex gap-3">
            <Check aria-hidden="true" className="text-primary mt-0.5 size-4" />
            {point}
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mt-7" asChild>
        <Link href={href}>
          {action}
          <ArrowRight aria-hidden="true" data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}
