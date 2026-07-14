import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationListItem } from "@/features/notifications/server/data";
import { NotificationTypeIcon } from "@/features/notifications/components/notification-type-icon";
import { MarkNotificationReadButton } from "@/features/notifications/components/notification-read-actions";
import type { RouteLocale } from "@/i18n/config";
import { formatDateTimeUtc } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/**
 * One Activity Center row. Title and message are the immutable stored
 * snapshots rendered in the recipient's event-time locale; surrounding labels
 * follow the current UI locale. All copy renders as escaped React text —
 * never HTML or Markdown. The View link localizes the stored canonical
 * destination at render time; the destination re-authorizes independently.
 */
export function NotificationItem({
  notification,
  locale,
  labels,
}: {
  notification: NotificationListItem;
  locale: RouteLocale;
  labels: { newBadge: string; readSr: string; view: string; markRead: string };
}) {
  const isUnread = notification.readAt === null;
  const iso = new Date(notification.createdAt).toISOString();

  return (
    <li>
      <article
        className={cn(
          "rounded-xl border p-4 transition-colors",
          isUnread ? "border-primary/30 bg-primary/5" : "border-border bg-card",
        )}
      >
        <div className="flex gap-3">
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              isUnread
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            <NotificationTypeIcon type={notification.type} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold break-words">
                {notification.title}
              </h3>
              {isUnread ? (
                <Badge className="shrink-0">{labels.newBadge}</Badge>
              ) : (
                <span className="sr-only">{labels.readSr}</span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              {notification.message}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <time dateTime={iso} className="text-muted-foreground text-xs">
                {formatDateTimeUtc(locale, new Date(notification.createdAt))}
              </time>
              <div className="flex items-center gap-1">
                {isUnread ? (
                  <MarkNotificationReadButton
                    notificationId={notification.id}
                    label={labels.markRead}
                  />
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href={localizeInternalPath(notification.href, locale)}>
                    {labels.view}
                    <ArrowUpRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </li>
  );
}
