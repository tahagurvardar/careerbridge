import type { ApplicationStatusValue } from "@/features/applications/schemas";
import { formatJobDate } from "@/features/jobs/format";
import type {
  ApplicationsDictionary,
  LabelsDictionary,
} from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/translate";

export interface StatusTimelineEntry {
  fromStatus: ApplicationStatusValue | null;
  toStatus: ApplicationStatusValue;
  createdAt: Date;
  by?: string | null;
}

export function StatusTimeline({
  entries,
  locale,
  labels,
  t,
}: {
  entries: StatusTimelineEntry[];
  locale: RouteLocale;
  labels: LabelsDictionary;
  t: ApplicationsDictionary["timeline"];
}) {
  if (!entries.length) {
    return <p className="text-muted-foreground text-sm">{t.noHistory}</p>;
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
              ? t.submitted
              : formatMessage(t.movedTo, {
                  status: labels.applicationStatus[entry.toStatus],
                })}
          </p>
          <p className="text-muted-foreground text-xs">
            {formatJobDate(locale, entry.createdAt)}
            {entry.by
              ? ` · ${formatMessage(t.byActor, { name: entry.by })}`
              : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
