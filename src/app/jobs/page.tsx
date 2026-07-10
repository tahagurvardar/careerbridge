import type { Metadata } from "next";
import {
  BriefcaseBusiness,
  MapPin,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { featuredOpportunities } from "@/config/opportunities";
import { OpportunityCard } from "@/features/opportunities/components/opportunity-card";

export const metadata: Metadata = {
  title: "Jobs",
  description: "Explore the CareerBridge opportunity discovery experience.",
};

export default function JobsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Opportunity discovery"
        title="Find a role shaped around where you want to go."
        description="The complete search and filtering experience arrives in the jobs phase. This preview establishes the structure and visual language today."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Search opportunities</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Search controls are a visual preview in this phase.
              </p>
            </div>
            <Badge variant="outline">Foundation preview</Badge>
          </div>
          <div
            role="search"
            aria-label="Job search preview"
            className="grid gap-4 lg:grid-cols-[1fr_0.8fr_auto] lg:items-end"
          >
            <div className="space-y-2">
              <Label htmlFor="job-query">Role or skill</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-query"
                  placeholder="e.g. Product designer"
                  className="h-10 pl-9"
                  readOnly
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-location">Location</Label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="job-location"
                  placeholder="City or remote"
                  className="h-10 pl-9"
                  readOnly
                />
              </div>
            </div>
            <Button className="h-10" disabled>
              <SlidersHorizontal aria-hidden="true" data-icon="inline-start" />
              Filters in Phase 2
            </Button>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-primary text-sm font-semibold tracking-wide uppercase">
              Sample listings
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Featured opportunities
            </h2>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <BriefcaseBusiness aria-hidden="true" className="size-4" />
            Mock data for interface development
          </p>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {featuredOpportunities.map((opportunity) => (
            <OpportunityCard key={opportunity.id} opportunity={opportunity} />
          ))}
        </div>
      </section>
    </>
  );
}
