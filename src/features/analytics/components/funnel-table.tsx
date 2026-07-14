import {
  formatAnalyticsPercentage,
  type FunnelResult,
} from "@/features/analytics/analytics";

export function FunnelTable({ funnel }: { funnel: FunnelResult }) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[34rem] text-sm">
        <caption className="sr-only">
          Application funnel reached-stage counts and conversion rates
        </caption>
        <thead className="bg-muted/70">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">
              Stage
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Applications that reached stage
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              From previous stage
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {funnel.stages.map((stage, index) => (
            <tr key={stage.stage}>
              <th scope="row" className="px-4 py-3 text-left font-medium">
                {stage.label}
              </th>
              <td className="px-4 py-3 text-right tabular-nums">
                {stage.reached.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {index === 0
                  ? "Cohort"
                  : formatAnalyticsPercentage(stage.conversionFromPrevious)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
