import type { Metadata } from "next";
import { ArrowUpRight, Building2, MapPin, UsersRound } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Companies",
  description: "Preview companies building their teams with CareerBridge.",
};

const companies = [
  {
    initials: "NL",
    name: "Northstar Labs",
    industry: "Product & technology",
    location: "Baku, Azerbaijan",
    size: "51–200 people",
    description:
      "A product studio turning complex industry problems into thoughtful digital tools.",
  },
  {
    initials: "OS",
    name: "Orbit Systems",
    industry: "Developer infrastructure",
    location: "Remote — Europe",
    size: "201–500 people",
    description:
      "Distributed engineering teams building dependable infrastructure for modern software companies.",
  },
  {
    initials: "MF",
    name: "Mosaic Finance",
    industry: "Financial technology",
    location: "Tbilisi, Georgia",
    size: "51–200 people",
    description:
      "A fintech team making everyday financial planning more understandable and accessible.",
  },
];

export default function CompaniesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Company discovery"
        title="Learn how teams work before you apply."
        description="CareerBridge company profiles will bring mission, culture, open roles, and practical details together in one candidate-friendly view."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Sample company directory
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Representative mock profiles for foundation development.
            </p>
          </div>
          <Badge variant="outline">Profiles arrive in Phase 3</Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.name} className="h-full">
              <CardHeader>
                <div className="bg-primary text-primary-foreground mb-4 flex size-12 items-center justify-center rounded-xl font-mono text-sm font-semibold">
                  {company.initials}
                </div>
                <CardTitle className="flex items-center justify-between gap-3 text-lg">
                  {company.name}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="text-muted-foreground size-4"
                  />
                </CardTitle>
                <CardDescription>{company.industry}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5">
                <p className="text-muted-foreground leading-6">
                  {company.description}
                </p>
                <div className="text-muted-foreground mt-auto grid gap-2 text-sm">
                  <p className="flex items-center gap-2">
                    <MapPin aria-hidden="true" className="size-4" />
                    {company.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <UsersRound aria-hidden="true" className="size-4" />
                    {company.size}
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 aria-hidden="true" className="size-4" />
                    Company profile preview
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
