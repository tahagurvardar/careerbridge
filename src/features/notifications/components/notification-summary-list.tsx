import Link from "next/link";

import type { NotificationListItem } from "@/features/notifications/server/data";
import { NotificationTypeIcon } from "@/features/notifications/components/notification-type-icon";
import type { RouteLocale } from "@/i18n/config";
import { formatShortDate } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { cn } from "@/lib/utils";

/**
 * Compact recent-notification list for the Candidate and Recruiter dashboards.
 * Titles/messages are immutable stored snapshots in the recipient's event-time
 * locale; the destination localizes at render. Escaped text only.
 */
export function NotificationSummaryList({
  notifications,
  locale,
  unreadSrLabel,
}: {
  notifications: NotificationListItem[];
  locale: RouteLocale;
  unreadSrLabel: string;
}) {
  return (
    <ul className="divide-y">
      {notifications.map((notification) => {
        const isUnread = notification.readAt === null;
        return (
          <li key={notification.id}>
            <Link
              href={localizeInternalPath(notification.href, locale)}
              className="hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-start gap-3 rounded-lg px-2 py-3 focus-visible:ring-2 focus-visible:outline-none"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                  isUnread
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <NotificationTypeIcon
                  type={notification.type}
                  className="size-4"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {isUnread ? (
                    <span
                      aria-hidden="true"
                      className="bg-primary size-2 shrink-0 rounded-full"
                    />
                  ) : null}
                  <span className="truncate font-medium">
                    {notification.title}
                  </span>
                  {isUnread ? (
                    <span className="sr-only">{unreadSrLabel}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {notification.message}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {formatShortDate(locale, new Date(notification.createdAt))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
