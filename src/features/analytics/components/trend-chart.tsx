import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import type { TrendPoint } from "@/features/analytics/analytics";
import type { RouteLocale } from "@/i18n/config";
import type { AnalyticsDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

export function TrendChart({
  title,
  description,
  points,
  locale,
  t,
}: {
  title: string;
  description: string;
  points: TrendPoint[];
  locale: RouteLocale;
  t: AnalyticsDictionary["shared"];
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce<TrendPoint | null>(
    (current, point) =>
      !current || point.value > current.value ? point : current,
    null,
  );
  const maximum = Math.max(0, ...points.map((point) => point.value));
  const totalLabel = formatInteger(locale, total);
  const peakLabel = formatInteger(locale, peak?.value ?? 0);
  const period = peak?.label ?? t.noBucket;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <AnalyticsEmptyState title={t.noTrendData} />
        ) : (
          <>
            <p
              className="text-muted-foreground mb-4 text-sm"
              aria-live="polite"
            >
              {formatMessage(t.trendSummary, {
                total: totalLabel,
                peak: peakLabel,
                period,
              })}
            </p>
            <div
              role="img"
              aria-label={formatMessage(t.trendAria, {
                title,
                total: totalLabel,
                peak: peakLabel,
                period,
              })}
              className="border-border/60 bg-muted/20 flex h-44 min-w-0 items-end gap-px rounded-xl border px-2 pt-4 pb-2"
            >
              {points.map((point) => (
                <span
                  key={point.key}
                  title={`${point.label}: ${formatInteger(locale, point.value)}`}
                  className="bg-primary/80 min-w-0 flex-1 rounded-t-sm"
                  style={{
                    height:
                      point.value === 0
                        ? "2px"
                        : `${Math.max(4, (point.value / maximum) * 100)}%`,
                  }}
                />
              ))}
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between gap-4 text-xs">
              <span>{points[0]?.label}</span>
              <span className="text-right">{points.at(-1)?.label}</span>
            </div>
            <details className="mt-4">
              <summary className="focus-visible:ring-ring w-fit cursor-pointer rounded text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
                {t.viewTable}
              </summary>
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {formatMessage(t.trendCaption, { title })}
                  </caption>
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left">
                        {t.period}
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        {t.count}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {points.map((point) => (
                      <tr key={point.key}>
                        <th
                          scope="row"
                          className="px-3 py-2 text-left font-normal"
                        >
                          {point.label}
                        </th>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatInteger(locale, point.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
