import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Clock3, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Opportunity } from "@/types/opportunity";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
  return (
    <Link
      href={"/jobs/" + opportunity.slug}
      aria-label={"View " + opportunity.title + " at " + opportunity.company}
      className="group/opportunity focus-visible:ring-ring focus-visible:ring-offset-background block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <Card className="group-hover/opportunity:ring-primary/30 group-focus-visible/opportunity:ring-primary/40 h-full transition duration-200 group-hover/opportunity:-translate-y-1 group-focus-visible/opportunity:-translate-y-1">
        <CardHeader>
          <div className="bg-secondary text-secondary-foreground mb-4 flex size-11 items-center justify-center rounded-xl font-mono text-sm font-semibold">
            {opportunity.companyInitials}
          </div>
          <CardTitle className="text-lg">{opportunity.title}</CardTitle>
          <p className="text-muted-foreground text-sm font-medium">
            {opportunity.company}
          </p>
          {opportunity.featured && (
            <CardAction>
              <Badge className="bg-highlight text-highlight-foreground">
                Featured
              </Badge>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-5">
          <div className="text-muted-foreground grid gap-2.5 text-sm">
            <p className="flex items-center gap-2">
              <MapPin aria-hidden="true" className="size-4" />
              {opportunity.location} · {opportunity.workMode}
            </p>
            <p className="flex items-center gap-2">
              <BriefcaseBusiness aria-hidden="true" className="size-4" />
              {opportunity.employmentType}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4" />
              {opportunity.postedAt}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {opportunity.skills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <p className="text-sm font-semibold">{opportunity.compensation}</p>
          <span className="text-primary inline-flex items-center gap-1 text-sm font-semibold">
            View details
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
