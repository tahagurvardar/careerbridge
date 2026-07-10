import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatJobDate, formatSalaryRange } from "@/features/jobs/format";
import {
  employmentTypeLabels,
  workplaceTypeLabels,
} from "@/features/jobs/schemas";
import type { PublicJobCard as PublicJobCardData } from "@/features/jobs/server/data";

export function JobCard({ job }: { job: PublicJobCardData }) {
  const initials = job.company.name.slice(0, 2).toLocaleUpperCase();
  const salary = formatSalaryRange(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
  );
  const locationLabel = [
    job.location,
    job.workplaceType ? workplaceTypeLabels[job.workplaceType] : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/jobs/${job.slug}`}
      aria-label={`View ${job.title} at ${job.company.name}`}
      className="group/job focus-visible:ring-ring focus-visible:ring-offset-background block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="group-hover/job:ring-primary/30 group-focus-visible/job:ring-primary/40 h-full transition duration-200 group-hover/job:-translate-y-1 group-focus-visible/job:-translate-y-1">
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
                {employmentTypeLabels[job.employmentType]}
              </p>
            ) : null}
            {job.publishedAt ? (
              <p className="flex items-center gap-2">
                <Clock3 aria-hidden="true" className="size-4" />
                {formatJobDate(job.publishedAt)}
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
        <CardFooter className="justify-between gap-3">
          <p className="text-sm font-semibold">
            {salary ?? "Salary not disclosed"}
          </p>
          <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
            View details
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
