import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import type { StatusDistributionItem } from "@/features/analytics/analytics";
import type { RouteLocale } from "@/i18n/config";
import type { AnalyticsDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

export function StatusDistributionChart({
  title,
  description,
  items,
  locale,
  t,
}: {
  title: string;
  description: string;
  items: StatusDistributionItem[];
  locale: RouteLocale;
  t: AnalyticsDictionary["shared"];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const maximum = Math.max(0, ...items.map((item) => item.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <AnalyticsEmptyState title={t.noCurrentRecords} />
        ) : (
          <div
            role="img"
            aria-label={formatMessage(t.distributionAria, {
              title,
              total: formatInteger(locale, total),
              statuses: formatInteger(locale, items.length),
            })}
            className="grid gap-4"
          >
            {items.map((item) => (
              <div key={item.status} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="tabular-nums">
                    {formatInteger(locale, item.count)}
                  </span>
                </div>
                <div className="bg-muted h-2.5 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${maximum === 0 ? 0 : (item.count / maximum) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <table className="sr-only">
          <caption>{t.distributionCaption.replace("{title}", title)}</caption>
          <thead>
            <tr>
              <th scope="col">{t.status}</th>
              <th scope="col">{t.count}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.status}>
                <th scope="row">{item.label}</th>
                <td>{formatInteger(locale, item.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
