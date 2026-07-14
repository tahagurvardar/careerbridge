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

export function FunnelChart({
  title = "Application funnel",
  description,
  funnel,
}: {
  title?: string;
  description: string;
  funnel: FunnelResult;
}) {
  const submitted = funnel.stages[0]?.reached ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        {submitted === 0 ? (
          <AnalyticsEmptyState title="No Applications in this cohort" />
        ) : (
          <div
            role="img"
            aria-label={`${title}. ${submitted} submitted and ${funnel.stages.at(-1)?.reached ?? 0} reached Hired. Overall hire conversion ${formatAnalyticsPercentage(funnel.overallHireConversion)}.`}
            className="grid gap-3"
          >
            {funnel.stages.map((stage) => (
              <div key={stage.stage} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium">{stage.label}</span>
                  <span className="tabular-nums">
                    {stage.reached.toLocaleString()}
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
          Overall Submitted → Hired conversion:{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatAnalyticsPercentage(funnel.overallHireConversion)}
          </span>
          . Exits: {funnel.exits.REJECTED.toLocaleString()} rejected and{" "}
          {funnel.exits.WITHDRAWN.toLocaleString()} withdrawn.
        </p>
        <FunnelTable funnel={funnel} />
      </CardContent>
    </Card>
  );
}
