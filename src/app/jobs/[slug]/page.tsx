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
  Lock,
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
import { formatJobDate, formatSalaryRange } from "@/features/jobs/format";
import {
  employmentTypeLabels,
  experienceLevelLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import { getPublishedJobBySlug } from "@/features/jobs/server/data";
import { getPrismaClient } from "@/lib/prisma";

interface JobDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(getPrismaClient(), slug);

  if (!job) {
    return { title: "Job not found" };
  }

  return {
    title: job.title,
    description:
      job.summary ??
      `${job.title} at ${job.company.name} — published on CareerBridge.`,
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  await connection();
  const { slug } = await params;
  const job = await getPublishedJobBySlug(getPrismaClient(), slug);

  if (!job) notFound();

  const salary = formatSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Button variant="ghost" className="-ml-2" asChild>
            <Link href="/jobs">
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              Back to jobs
            </Link>
          </Button>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start">
            <span className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-2xl font-mono font-semibold shadow-sm">
              {job.company.name.slice(0, 2).toLocaleUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="secondary">Published role</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                {job.title}
              </h1>
              <p className="text-muted-foreground mt-3 text-lg font-medium">
                <Link
                  href={`/companies/${job.company.slug}`}
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
                    {workplaceTypeLabels[job.workplaceType]}
                  </span>
                ) : null}
                {job.employmentType ? (
                  <span className="flex items-center gap-2">
                    <BriefcaseBusiness aria-hidden="true" className="size-4" />
                    {employmentTypeLabels[job.employmentType]}
                  </span>
                ) : null}
                {job.experienceLevel ? (
                  <span className="flex items-center gap-2">
                    <GraduationCap aria-hidden="true" className="size-4" />
                    {experienceLevelLabels[job.experienceLevel]}
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
                <h2 className="text-xl font-semibold">About this role</h2>
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
                <h2 className="text-xl font-semibold">Description</h2>
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
                <h2 className="text-xl font-semibold">Responsibilities</h2>
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
                <h2 className="text-xl font-semibold">Requirements</h2>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-7 whitespace-pre-line">
                  {job.requirements}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </article>

        <aside aria-label="Job summary">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <h2 className="text-base font-semibold">Role summary</h2>
              <CardDescription>Published job details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SummaryItem
                label="Compensation"
                value={salary ?? "Not disclosed"}
              />
              <Separator />
              {job.employmentType ? (
                <>
                  <SummaryItem
                    label="Employment"
                    value={employmentTypeLabels[job.employmentType]}
                  />
                  <Separator />
                </>
              ) : null}
              {job.publishedAt ? (
                <>
                  <SummaryItem
                    label="Published"
                    value={formatJobDate(job.publishedAt)}
                  />
                  <Separator />
                </>
              ) : null}
              {job.applicationDeadline ? (
                <>
                  <SummaryItem
                    label="Apply by"
                    value={formatJobDate(job.applicationDeadline)}
                    icon={
                      <CalendarClock aria-hidden="true" className="size-4" />
                    }
                  />
                  <Separator />
                </>
              ) : null}
              <Button
                type="button"
                className="h-10 w-full"
                aria-describedby="application-availability"
                disabled
              >
                <Lock aria-hidden="true" data-icon="inline-start" />
                Applications open next phase
              </Button>
              <p
                id="application-availability"
                className="text-muted-foreground text-xs leading-5"
              >
                Applications will be available in the next phase, once
                authenticated candidate applications are added.
              </p>
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
