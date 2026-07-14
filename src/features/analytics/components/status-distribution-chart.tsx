import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalyticsEmptyState } from "@/features/analytics/components/analytics-empty-state";
import type { StatusDistributionItem } from "@/features/analytics/analytics";

export function StatusDistributionChart({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: StatusDistributionItem[];
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
          <AnalyticsEmptyState title="No current records" />
        ) : (
          <div
            role="img"
            aria-label={`${title}. ${total} records across ${items.length} statuses.`}
            className="grid gap-4"
          >
            {items.map((item) => (
              <div key={item.status} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="tabular-nums">
                    {item.count.toLocaleString()}
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
          <caption>{title} data table</caption>
          <thead>
            <tr>
              <th scope="col">Status</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.status}>
                <th scope="row">{item.label}</th>
                <td>{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
