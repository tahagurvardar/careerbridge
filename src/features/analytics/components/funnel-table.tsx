import {
  formatAnalyticsPercentage,
  type FunnelResult,
} from "@/features/analytics/analytics";
import type { RouteLocale } from "@/i18n/config";
import type { AnalyticsDictionary, LabelsDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";

export function FunnelTable({
  funnel,
  locale,
  labels,
  t,
}: {
  funnel: FunnelResult;
  locale: RouteLocale;
  labels: LabelsDictionary;
  t: AnalyticsDictionary["shared"];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">{t.funnelCaption}</caption>
        <thead className="bg-muted/70">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">
              {t.stage}
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              {t.reached}
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              {t.fromPrevious}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {funnel.stages.map((stage, index) => (
            <tr key={stage.stage}>
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {labels.applicationStatus[stage.stage]}
              </th>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatInteger(locale, stage.reached)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {index === 0
                  ? t.cohort
                  : formatAnalyticsPercentage(
                      stage.conversionFromPrevious,
                      locale,
                    )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
