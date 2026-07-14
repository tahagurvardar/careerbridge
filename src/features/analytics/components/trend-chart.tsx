import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import type { TrendPoint } from "@/features/analytics/analytics";

export function TrendChart({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: TrendPoint[];
}) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce<TrendPoint | null>(
    (current, point) =>
      !current || point.value > current.value ? point : current,
    null,
  );
  const maximum = Math.max(0, ...points.map((point) => point.value));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <AnalyticsEmptyState />
        ) : (
          <>
            <p
              className="text-muted-foreground mb-4 text-sm"
              aria-live="polite"
            >
              Total {total.toLocaleString()}; peak{" "}
              {peak?.value.toLocaleString()} in {peak?.label}.
            </p>
            <div
              role="img"
              aria-label={`${title}. ${total} total. Peak ${peak?.value ?? 0} in ${peak?.label ?? "no bucket"}.`}
              className="border-border/60 bg-muted/20 flex h-44 min-w-0 items-end gap-px rounded-xl border px-2 pt-4 pb-2"
            >
              {points.map((point) => (
                <span
                  key={point.key}
                  title={`${point.label}: ${point.value}`}
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
                View accessible data table
              </summary>
              <div className="mt-3 max-h-72 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <caption className="sr-only">
                    {title} values by UTC bucket
                  </caption>
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left">
                        Period
                      </th>
                      <th scope="col" className="px-3 py-2 text-right">
                        Count
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
                          {point.value.toLocaleString()}
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
