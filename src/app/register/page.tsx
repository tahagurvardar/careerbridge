import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, Building2, Check, LockKeyhole } from "lucide-react";

import { PageIntro } from "@/components/shared/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Preview CareerBridge candidate and recruiter account paths.",
};

const accountTypes = [
  {
    icon: BriefcaseBusiness,
    title: "Candidate",
    description:
      "Build your professional profile, discover roles, and keep every application organized.",
    points: [
      "Professional profile",
      "Saved opportunities",
      "Application tracking",
    ],
  },
  {
    icon: Building2,
    title: "Recruiter",
    description:
      "Represent your company, publish opportunities, and move candidates through a clear process.",
    points: ["Company workspace", "Job management", "Applicant review"],
  },
];

export default function RegisterPage() {
  return (
    <>
      <PageIntro
        eyebrow="Choose your path"
        title="Create the workspace that fits your goals."
        description="Role-based onboarding will be implemented with authentication in the next phase. These account paths preview the intended experience."
      />
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {accountTypes.map((account) => {
            const Icon = account.icon;

            return (
              <Card key={account.title} className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <Badge variant="outline">Phase 1</Badge>
                  </div>
                  <CardTitle className="mt-5 text-2xl">
                    {account.title}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2 leading-6">
                    {account.description}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-3 text-sm">
                    {account.points.map((point) => (
                      <li key={point} className="flex items-center gap-3">
                        <Check
                          aria-hidden="true"
                          className="text-primary size-4"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Button className="mt-8 w-full" disabled>
                    <LockKeyhole aria-hidden="true" data-icon="inline-start" />
                    {account.title} onboarding coming next
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-foreground focus-visible:ring-ring rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Go to sign in
          </Link>
        </p>
      </section>
    </>
  );
}
