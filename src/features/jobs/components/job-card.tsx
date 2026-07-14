import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJobDate, formatSalaryRange } from "@/features/jobs/format";
import type { PublicJobCard as PublicJobCardData } from "@/features/jobs/server/data";
import { JobSaveButton } from "@/features/saved-jobs/components/job-save-button";
import type { AppDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";

export function JobCard({
  job,
  locale,
  dictionary,
  saveState = null,
}: {
  job: PublicJobCardData;
  locale: RouteLocale;
  dictionary: AppDictionary;
  saveState?: boolean | "SIGNED_OUT" | null;
}) {
  const t = dictionary.public.jobCard;
  const { labels } = dictionary;
  const initials = job.company.name.slice(0, 2).toLocaleUpperCase();
  const salary = formatSalaryRange(
    locale,
    t,
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );
  const locationLabel = [
    job.location,
    job.workplaceType ? labels.workplaceType[job.workplaceType] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="hover:ring-primary/30 h-full transition duration-200 hover:-translate-y-1">
      <CardHeader>
        <div className="bg-secondary text-secondary-foreground mb-4 flex size-11 items-center justify-center rounded-xl font-mono text-sm font-semibold">
          {initials}
        </div>
        <CardTitle className="text-lg">{job.title}</CardTitle>
        <p className="text-muted-foreground text-sm font-medium">
          {job.company.name}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="text-muted-foreground grid gap-2.5 text-sm">
          {locationLabel ? (
            <p className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {locationLabel}
            </p>
          ) : null}
          {job.employmentType ? (
            <p className="flex items-center gap-2">
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
              {labels.employmentType[job.employmentType]}
            </p>
          ) : null}
          {job.publishedAt ? (
            <p className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />
              {formatJobDate(locale, job.publishedAt)}
            </p>
          ) : null}
        </div>
        {job.skills.length ? (
          <div className="flex flex-wrap gap-2">
            {job.skills.map(({ skill }) => (
              <Badge key={skill.name} variant="secondary">
                {skill.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3">
        <p className="text-sm font-semibold">
          {salary ?? t.salaryNotDisclosed}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {saveState === "SIGNED_OUT" ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={localizeInternalPath(
                  `/login?callbackPath=${encodeURIComponent(`/jobs/${job.slug}`)}`,
                  locale,
                )}
              >
                {t.signInToSave}
              </Link>
            </Button>
          ) : typeof saveState === "boolean" ? (
            <JobSaveButton
              slug={job.slug}
              initialSaved={saveState}
              labels={dictionary.public.saveButton}
              compact
            />
          ) : null}
          <Button size="sm" asChild>
            <Link
              href={localizeInternalPath(`/jobs/${job.slug}`, locale)}
              aria-label={formatMessage(t.viewJobAria, {
                jobTitle: job.title,
                companyName: job.company.name,
              })}
            >
              {t.viewDetails} <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
