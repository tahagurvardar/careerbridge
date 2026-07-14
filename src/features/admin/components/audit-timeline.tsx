import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  adminAuditActionLabels,
  getAuditTargetType,
  moderationReasonLabels,
} from "@/features/admin/moderation";
import type {
  AdminAuditRow,
  AdminAuditSummaryRow,
} from "@/features/admin/server/data";

type AuditTimelineEvent = AdminAuditRow | AdminAuditSummaryRow;

const auditTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function targetSummary(event: AuditTimelineEvent) {
  const type = getAuditTargetType(event.action);
  if (type === "USER") {
    return {
      label: event.targetUser?.name ?? "Deleted user",
      href:
        event.targetUser && event.targetUserId
          ? `/admin/users/${event.targetUserId}`
          : null,
    };
  }
  if (type === "COMPANY") {
    return {
      label: event.targetCompany?.name ?? "Deleted company",
      href:
        event.targetCompany && event.targetCompanyId
          ? `/admin/companies/${event.targetCompanyId}`
          : null,
    };
  }
  return {
    label: event.targetJob?.title ?? "Deleted job",
    href:
      event.targetJob && event.targetJobId
        ? `/admin/jobs/${event.targetJobId}`
        : null,
  };
}

export function AuditTimeline({
  events,
  showNotes = true,
}: {
  events: AuditTimelineEvent[];
  showNotes?: boolean;
}) {
  if (!events.length) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        No moderation actions recorded.
      </p>
    );
  }

  return (
    <ol className="divide-y">
      {events.map((event) => {
        const target = targetSummary(event);
        return (
          <li key={event.id} className="grid gap-3 py-5 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {adminAuditActionLabels[event.action]}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {target.href ? (
                    <Link href={target.href}>{target.label}</Link>
                  ) : (
                    target.label
                  )}
                  {" / "}
                  by {event.actor?.name ?? "Deleted admin"}
                </p>
              </div>
              <time
                dateTime={event.createdAt.toISOString()}
                className="text-muted-foreground text-xs"
              >
                {auditTimestampFormatter.format(event.createdAt)} UTC
              </time>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {moderationReasonLabels[event.reasonCode]}
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
