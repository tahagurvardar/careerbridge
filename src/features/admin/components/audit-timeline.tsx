import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getAuditTargetType } from "@/features/admin/moderation";
import type {
  AdminAuditRow,
  AdminAuditSummaryRow,
} from "@/features/admin/server/data";
import type { AdminDictionary, AppDictionary } from "@/i18n/dictionary";
import type { RouteLocale } from "@/i18n/config";
import { formatDateTimeUtc } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";

type AuditTimelineEvent = AdminAuditRow | AdminAuditSummaryRow;

function targetSummary(
  event: AuditTimelineEvent,
  labels: AdminDictionary["audit"],
) {
  const type = getAuditTargetType(event.action);
  if (type === "USER") {
    return {
      label: event.targetUser?.name ?? labels.deletedUser,
      href:
        event.targetUser && event.targetUserId
          ? `/admin/users/${event.targetUserId}`
          : null,
    };
  }
  if (type === "COMPANY") {
    return {
      label: event.targetCompany?.name ?? labels.deletedCompany,
      href:
        event.targetCompany && event.targetCompanyId
          ? `/admin/companies/${event.targetCompanyId}`
          : null,
    };
  }
  return {
    label: event.targetJob?.title ?? labels.deletedJob,
    href:
      event.targetJob && event.targetJobId
        ? `/admin/jobs/${event.targetJobId}`
        : null,
  };
}

function actorLine(
  template: string,
  target: ReturnType<typeof targetSummary>,
  actor: string,
  locale: RouteLocale,
) {
  return template.split(/(\{target\}|\{actor\})/).map((part, index) => {
    if (part === "{target}") {
      return target.href ? (
        <Link key={index} href={localizeInternalPath(target.href, locale)}>
          {target.label}
        </Link>
      ) : (
        target.label
      );
    }
    if (part === "{actor}") return actor;
    return part;
  });
}

export function AuditTimeline({
  events,
  showNotes = true,
  locale,
  labels,
  displayLabels,
}: {
  events: AuditTimelineEvent[];
  showNotes?: boolean;
  locale: RouteLocale;
  labels: AdminDictionary["audit"];
  displayLabels: Pick<
    AppDictionary["labels"],
    "adminAuditAction" | "moderationReason"
  >;
}) {
  if (!events.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        {labels.noActions}
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {events.map((event) => {
        const target = targetSummary(event, labels);
        return (
          <li key={event.id} className="grid gap-3 py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {displayLabels.adminAuditAction[event.action]}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {actorLine(
                    labels.byActor,
                    target,
                    event.actor?.name ?? labels.deletedAdmin,
                    locale,
                  )}
                </p>
              </div>
              <time
                dateTime={event.createdAt.toISOString()}
                className="text-muted-foreground text-xs"
              >
                {formatDateTimeUtc(locale, event.createdAt)}
              </time>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {displayLabels.moderationReason[event.reasonCode]}
              </Badge>
            </div>
            {showNotes && "reasonNote" in event && event.reasonNote ? (
              <p className="bg-muted/60 rounded-lg p-3 text-sm leading-6 whitespace-pre-wrap">
                {event.reasonNote}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
