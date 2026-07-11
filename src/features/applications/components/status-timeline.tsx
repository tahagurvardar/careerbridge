import {
  type ApplicationStatusValue,
  applicationStatusLabels,
} from "@/features/applications/schemas";
import { formatJobDate } from "@/features/jobs/format";

export interface StatusTimelineEntry {
  fromStatus: ApplicationStatusValue | null;
  toStatus: ApplicationStatusValue;
  createdAt: Date;
  by?: string | null;
}

export function StatusTimeline({
  entries,
}: {
  entries: StatusTimelineEntry[];
}) {
  if (!entries.length) {
    return (
      <p className="text-muted-foreground text-sm">No history recorded yet.</p>
    );
  }

  return (
    <ol className="border-border/70 relative space-y-5 border-l pl-6">
      {entries.map((entry) => (
        <li
          key={`${entry.createdAt.toISOString()}-${entry.toStatus}`}
          className="relative"
        >
          <span
            aria-hidden="true"
            className="bg-primary ring-background absolute top-1 -left-[1.6875rem] size-2.5 rounded-full ring-4"
          />
          <p className="text-sm font-medium">
            {entry.fromStatus === null
              ? "Application submitted"
              : `Moved to ${applicationStatusLabels[entry.toStatus]}`}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatJobDate(entry.createdAt)}
            {entry.by ? ` · by ${entry.by}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
