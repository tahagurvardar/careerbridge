import { BarChart3 } from "lucide-react";

export function AnalyticsEmptyState({
  title = "No activity in this view",
  description = "There is no matching data for the selected range and authorized scope.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="border-border/70 bg-muted/30 rounded-xl border border-dashed px-5 py-8 text-center">
      <BarChart3
        aria-hidden="true"
        className="text-muted-foreground mx-auto size-6"
      />
      <p className="mt-3 font-medium">{title}</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-lg text-sm leading-6">
        {description}
      </p>
    </div>
  );
}
