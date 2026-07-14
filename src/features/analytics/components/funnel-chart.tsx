import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import { FunnelTable } from "@/features/analytics/components/funnel-table";
import {
  formatAnalyticsPercentage,
  type FunnelResult,
} from "@/features/analytics/analytics";
import type { RouteLocale } from "@/i18n/config";
import type { AnalyticsDictionary, LabelsDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

export function FunnelChart({
  title,
  description,
  funnel,
  locale,
  labels,
  t,
}: {
  title: string;
  description: string;
  funnel: FunnelResult;
  locale: RouteLocale;
  labels: LabelsDictionary;
  t: AnalyticsDictionary["shared"];
}) {
  const submitted = funnel.stages[0]?.reached ?? 0;
  const hired = funnel.stages.at(-1)?.reached ?? 0;
  const conversion = formatAnalyticsPercentage(
    funnel.overallHireConversion,
    locale,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {submitted === 0 ? (
          <AnalyticsEmptyState title={t.noCohort} />
        ) : (
          <div
            role="img"
            aria-label={formatMessage(t.funnelAria, {
              title,
              submitted: formatInteger(locale, submitted),
              hired: formatInteger(locale, hired),
              conversion,
            })}
            className="grid gap-3"
          >
            {funnel.stages.map((stage) => (
              <div key={stage.stage} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">
                    {labels.applicationStatus[stage.stage]}
                  </span>
                  <span className="tabular-nums">
                    {formatInteger(locale, stage.reached)}
                  </span>
                </div>
                <div className="bg-muted h-4 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(stage.reached / submitted) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-muted-foreground text-sm">
          {formatMessage(t.overallConversion, { conversion })}{" "}
          {formatMessage(t.exits, {
            rejected: formatInteger(locale, funnel.exits.REJECTED),
            withdrawn: formatInteger(locale, funnel.exits.WITHDRAWN),
          })}
        </p>
        <FunnelTable funnel={funnel} locale={locale} labels={labels} t={t} />
      </CardContent>
    </Card>
  );
}
