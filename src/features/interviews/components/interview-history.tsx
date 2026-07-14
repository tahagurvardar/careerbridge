import type {
  InterviewEventType,
  InterviewStatus,
} from "@/generated/prisma/enums";
import { formatInterviewRange } from "@/features/interviews/interviews";
import type { InterviewsDictionary, LabelsDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatDateTimeUtc } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

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

/**
 * Read-only, append-only interview timeline. There are intentionally no edit,
 * delete, or rewrite controls anywhere for this history.
 */
export function InterviewHistory({
  entries,
  locale,
  labels,
  t,
}: {
  entries: InterviewHistoryEntry[];
  locale: RouteLocale;
  labels: LabelsDictionary;
  t: InterviewsDictionary["history"];
}) {
  if (!entries.length) {
    return <p className="text-muted-foreground text-sm">{t.noHistory}</p>;
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
            {labels.interviewEventType[entry.type]}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatDateTimeUtc(locale, entry.createdAt)} ·{" "}
            {formatMessage(t.byActor, {
              name: entry.actor?.name ?? labels.fallbacks.accountRemoved,
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            {entry.fromStatus
              ? `${labels.interviewStatus[entry.fromStatus]} → ${labels.interviewStatus[entry.toStatus]}`
              : labels.interviewStatus[entry.toStatus]}
          </p>
          {entry.startAt && entry.endAt && entry.timeZone ? (
            <p className="text-muted-foreground text-xs">
              {formatMessage(t.scheduledFor, {
                schedule: formatInterviewRange(
                  locale,
                  entry.startAt,
                  entry.endAt,
                  entry.timeZone,
                ),
              })}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
