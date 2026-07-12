import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationListItem } from "@/features/notifications/server/data";
import { NotificationTypeIcon } from "@/features/notifications/components/notification-type-icon";
import { MarkNotificationReadButton } from "@/features/notifications/components/notification-read-actions";
import { cn } from "@/lib/utils";

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * One Activity Center row. All copy is rendered as escaped React text — never
 * HTML or Markdown. The View link points at a server-generated safe internal
 * path; the destination re-authorizes independently.
 */
export function NotificationItem({
  notification,
}: {
  notification: NotificationListItem;
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
                <Badge className="shrink-0">New</Badge>
              ) : (
                <span className="sr-only">Read</span>
              )}
            </div>
            <p className="text-muted-foreground mt-1 text-sm break-words">
              {notification.message}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <time dateTime={iso} className="text-muted-foreground text-xs">
                {formatTimestamp(notification.createdAt)}
              </time>
              <div className="flex items-center gap-1">
                {isUnread ? (
                  <MarkNotificationReadButton
                    notificationId={notification.id}
                  />
                ) : null}
                <Button asChild variant="ghost" size="sm">
                  <Link href={notification.href}>
                    View
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
