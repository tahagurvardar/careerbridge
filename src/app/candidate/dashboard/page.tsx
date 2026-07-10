import type { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  FileCheck2,
  Pencil,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompletionCard } from "@/features/candidate-profile/components/completion-card";
import { getCompletionFromProfile } from "@/features/candidate-profile/completion";
import { getCandidateProfile } from "@/features/candidate-profile/server/data";
import { requireRole } from "@/features/auth/server/session";
import { getPrismaClient } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Candidate dashboard",
  description: "Your protected CareerBridge candidate workspace.",
};

const deferredItems = [
  {
    icon: FileCheck2,
    title: "Applications",
    description:
      "Application submission and status tracking will arrive with the applications phase.",
  },
  {
    icon: Bookmark,
    title: "Saved jobs",
    description:
      "Saving jobs will become available after database-backed opportunity discovery is introduced.",
  },
  {
    icon: Sparkles,
    title: "Job recommendations",
    description:
      "Personalized recommendations are deferred until the required jobs and matching foundations exist.",
  },
];

export default async function CandidateDashboardPage() {
  const session = await requireRole("CANDIDATE", "/candidate/dashboard");
  const profile = await getCandidateProfile(getPrismaClient(), session.user.id);
  const completion = getCompletionFromProfile(profile);

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div aria-hidden="true" className="hero-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">Candidate</Badge>
            <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Sparkles aria-hidden="true" className="size-4" />
              Profile foundation
            </span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Welcome, {session.user.name}.
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg leading-8">
            Build a clear professional foundation now. Application and job tools
            remain honest placeholders until their product phases are ready.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <UserRound aria-hidden="true" className="text-primary size-5" />
                Your candidate profile
              </CardTitle>
              <CardDescription>
                Keep your headline, background, skills, education, and
                experience current.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/candidate/profile">
                  <UserRound aria-hidden="true" />
                  View profile
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/candidate/profile/edit">
                  <Pencil aria-hidden="true" />
                  Edit profile
                </Link>
              </Button>
            </CardContent>
          </Card>
          <CompletionCard {...completion} compact />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {deferredItems.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="h-full">
                <CardHeader>
                  <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-xl">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <CardTitle className="mt-3 text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-6">
                    {item.description}
                  </p>
                  <Badge variant="outline" className="mt-5">
                    Planned for a later phase
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
