import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Laptop2,
  LockKeyhole,
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
import {
  getOpportunityBySlug,
  mockOpportunities,
} from "@/config/opportunities";

interface JobDetailPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return mockOpportunities.map((opportunity) => ({
    slug: opportunity.slug,
  }));
}

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const opportunity = getOpportunityBySlug(slug);

  if (!opportunity) {
    return {
      title: "Opportunity not found",
    };
  }

  return {
    title: opportunity.title,
    description:
      opportunity.title +
      " at " +
      opportunity.company +
      " — CareerBridge mock opportunity preview.",
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const { slug } = await params;
  const opportunity = getOpportunityBySlug(slug);

  if (!opportunity) {
    notFound();
  }

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
              {opportunity.companyInitials}
            </span>
            <div className="min-w-0 flex-1">
              <Badge variant="outline">Mock opportunity preview</Badge>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
                {opportunity.title}
              </h1>
              <p className="text-muted-foreground mt-3 text-lg font-medium">
                {opportunity.company}
              </p>
              <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <span className="flex items-center gap-2">
                  <MapPin aria-hidden="true" className="size-4" />
                  {opportunity.location}
                </span>
                <span className="flex items-center gap-2">
                  <Laptop2 aria-hidden="true" className="size-4" />
                  {opportunity.workMode}
                </span>
                <span className="flex items-center gap-2">
                  <BriefcaseBusiness aria-hidden="true" className="size-4" />
                  {opportunity.employmentType}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8 lg:py-16">
        <article className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">About this role</h2>
              <CardDescription>
                Sample content for the CareerBridge job-detail experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-base leading-7">
                {opportunity.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {opportunity.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Sample responsibilities</h2>
            </CardHeader>
            <CardContent>
              <DetailList items={opportunity.responsibilities} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Sample requirements</h2>
            </CardHeader>
            <CardContent>
              <DetailList items={opportunity.requirements} />
            </CardContent>
          </Card>
        </article>

        <aside aria-label="Opportunity summary">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <h2 className="text-base font-semibold">Opportunity summary</h2>
              <CardDescription>
                Mock listing details for interface validation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <SummaryItem
                label="Compensation"
                value={opportunity.compensation}
              />
              <Separator />
              <SummaryItem label="Posted" value={opportunity.postedAt} />
              <Separator />
              <SummaryItem
                label="Employment"
                value={opportunity.employmentType}
              />
              <Separator />
              <Button
                type="button"
                className="h-10 w-full"
                aria-describedby="application-availability"
                disabled
              >
                <LockKeyhole aria-hidden="true" data-icon="inline-start" />
                Applications unavailable
              </Button>
              <p
                id="application-availability"
                className="text-muted-foreground text-xs leading-5"
              >
                Applying will be enabled only after the applications phase adds
                authenticated profiles and real application records.
              </p>
            </CardContent>
          </Card>
        </aside>
      </section>
    </>
  );
}

function DetailList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <CheckCircle2
            aria-hidden="true"
            className="text-primary mt-0.5 size-5 shrink-0"
          />
          <span className="text-muted-foreground leading-6">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </p>
      <p className="mt-1.5 flex items-center gap-2 font-semibold">
        {label === "Posted" && (
          <Clock3 aria-hidden="true" className="text-muted-foreground size-4" />
        )}
        {value}
      </p>
    </div>
  );
}
