import type {
  InterviewEventType,
  InterviewStatus,
} from "@/generated/prisma/enums";
import {
  formatInterviewRange,
  INTERVIEW_ACTOR_REMOVED_FALLBACK,
  interviewEventTypeLabels,
  interviewStatusLabels,
} from "@/features/interviews/interviews";

export interface InterviewHistoryEntry {
  id: string;
  type: InterviewEventType;
  fromStatus: InterviewStatus | null;
  toStatus: InterviewStatus;
  startAt: Date | null;
  endAt: Date | null;
  timeZone: string | null;
  createdAt: Date;
  actor: { name: string } | null;
}

function formatEventTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

/**
 * Read-only, append-only interview timeline. There are intentionally no edit,
 * delete, or rewrite controls anywhere for this history.
 */
export function InterviewHistory({
  entries,
}: {
  entries: InterviewHistoryEntry[];
}) {
  if (!entries.length) {
    return (
      <p className="text-muted-foreground text-sm">No history recorded yet.</p>
    );
  }

  return (
    <ol className="border-border/70 relative space-y-5 border-l pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            aria-hidden="true"
            className="bg-primary ring-background absolute top-1 -left-[1.6875rem] size-2.5 rounded-full ring-4"
          />
          <p className="text-sm font-medium">
            {interviewEventTypeLabels[entry.type]}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatEventTimestamp(entry.createdAt)} · by{" "}
            {entry.actor?.name ?? INTERVIEW_ACTOR_REMOVED_FALLBACK}
          </p>
          <p className="text-muted-foreground text-xs">
            {entry.fromStatus
              ? `${interviewStatusLabels[entry.fromStatus]} → ${interviewStatusLabels[entry.toStatus]}`
              : interviewStatusLabels[entry.toStatus]}
          </p>
          {entry.startAt && entry.endAt && entry.timeZone ? (
            <p className="text-muted-foreground text-xs">
              Scheduled for{" "}
              {formatInterviewRange(entry.startAt, entry.endAt, entry.timeZone)}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
