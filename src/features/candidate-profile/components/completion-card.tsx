import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProfileRecommendation } from "@/features/candidate-profile/completion";

export function CompletionCard({
  percentage,
  incomplete,
  compact = false,
}: {
  percentage: number;
  incomplete: ProfileRecommendation[];
  compact?: boolean;
}) {
  const next = incomplete[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
              Profile completion
            </p>
            <CardTitle className="mt-2 text-xl">
              {percentage}% complete
            </CardTitle>
          </div>
          {percentage === 100 ? (
            <CheckCircle2
              aria-label="Profile sections complete"
              className="text-primary size-6"
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Progress
          value={percentage}
          aria-label={`Profile ${percentage}% complete`}
        />
        {next ? (
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm leading-6">
              Recommended next step:{" "}
              <span className="text-foreground">{next.label}</span>
            </p>
            <Button variant="outline" asChild className="w-fit">
              <Link href={next.href}>
                Continue profile
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-6">
            Every profile foundation section is complete. Keep the details
            current as your experience changes.
          </p>
        )}

        {!compact && incomplete.length > 1 ? (
          <div className="border-border/70 grid gap-2 border-t pt-4">
            <p className="text-xs font-medium tracking-wide uppercase">
              Other suggestions
            </p>
            <ul className="grid gap-2">
              {incomplete.slice(1).map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
