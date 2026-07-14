import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ProfileRecommendation } from "@/features/candidate-profile/completion";
import type { CandidateDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";

export function CompletionCard({
  percentage,
  incomplete,
  locale,
  t,
  compact = false,
}: {
  percentage: number;
  incomplete: ProfileRecommendation[];
  locale: RouteLocale;
  t: CandidateDictionary["completion"];
  compact?: boolean;
}) {
  const next = incomplete[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
              {t.title}
            </p>
            <CardTitle className="mt-2 text-xl">
              {formatMessage(t.percentComplete, { percent: percentage })}
            </CardTitle>
          </div>
          {percentage === 100 ? (
            <CheckCircle2
              aria-label={t.completeAria}
              className="text-primary size-6"
            />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Progress
          value={percentage}
          aria-label={formatMessage(t.progressAria, { percent: percentage })}
        />
        {next ? (
          <div className="grid gap-3">
            <p className="text-muted-foreground text-sm leading-6">
              {t.nextStep}{" "}
              <span className="text-foreground">{t.sections[next.key]}</span>
            </p>
            <Button variant="outline" asChild className="w-fit">
              <Link href={localizeInternalPath(next.href, locale)}>
                {t.continueProfile}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-6">
            {t.allComplete}
          </p>
        )}

        {!compact && incomplete.length > 1 ? (
          <div className="border-border/70 grid gap-2 border-t pt-4">
            <p className="text-xs font-medium tracking-wide uppercase">
              {t.otherSuggestions}
            </p>
            <ul className="grid gap-2">
              {incomplete.slice(1).map((item) => (
                <li key={item.key}>
                  <Link
                    href={localizeInternalPath(item.href, locale)}
                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {t.sections[item.key]}
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
