import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllNotificationsReadButton } from "@/features/notifications/components/notification-read-actions";
import { NotificationItem } from "@/features/notifications/components/notification-item";
import {
  NOTIFICATION_FILTERS,
  hasActiveNotificationFilter,
  notificationFilterLabels,
  parseNotificationSearch,
  type NotificationFilter,
} from "@/features/notifications/schemas";
import { requireNotificationRecipient } from "@/features/notifications/server/guard";
import { getNotificationCenterPage } from "@/features/notifications/server/data";
import { getPrismaClient } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Your CareerBridge activity and notification center.",
};

function filterHref(filter: NotificationFilter) {
  return filter === "ALL"
    ? "/notifications"
    : `/notifications?filter=${filter}`;
}

function pageHref(filter: NotificationFilter, page: number) {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/notifications?${query}` : "/notifications";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const recipient = await requireNotificationRecipient("/notifications");
  const search = parseNotificationSearch(await searchParams);
  const prisma = getPrismaClient();
  const result = await getNotificationCenterPage(
    prisma,
    recipient.userId,
    search,
  );

  const summary = [
    { label: "Total", value: result.totalCount },
    { label: "Unread", value: result.unreadCount },
    { label: "Read", value: result.readCount },
  ];
  const hasFilter = hasActiveNotificationFilter(search);
  const filterCounts: Record<NotificationFilter, number> = {
    ALL: result.totalCount,
    UNREAD: result.unreadCount,
    READ: result.readCount,
  };

  return (
    <section className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <Badge variant="secondary">Activity</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Notifications
          </h1>
          <p className="text-muted-foreground mt-3 leading-7">
            Updates about your applications, delivered in the app. Opening a
            notification takes you to the related page, which always checks your
            access.
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-3 gap-4">
          {summary.map((item) => (
            <div key={item.label} className="bg-muted/60 rounded-xl p-4">
              <dt className="text-muted-foreground text-sm">{item.label}</dt>
              <dd className="mt-1 text-2xl font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter notifications"
            className="bg-muted/60 inline-flex rounded-lg p-1"
          >
            {NOTIFICATION_FILTERS.map((filter) => {
              const active = search.filter === filter;
              return (
                <Link
                  key={filter}
                  href={filterHref(filter)}
                  role="tab"
                  aria-selected={active}
                  className={cn(
                    "focus-visible:ring-ring rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {notificationFilterLabels[filter]}
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {filterCounts[filter]}
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings/notifications">Email settings</Link>
            </Button>
            <MarkAllNotificationsReadButton unreadCount={result.unreadCount} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm" role="status">
            {result.filteredCount}{" "}
            {result.filteredCount === 1 ? "notification" : "notifications"}
            {hasFilter
              ? ` · ${notificationFilterLabels[search.filter].toLowerCase()}`
              : ""}
          </p>
          {hasFilter ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/notifications">Clear filter</Link>
            </Button>
          ) : null}
        </div>

        {result.items.length ? (
          <>
            <ul className="mt-4 grid gap-3">
              {result.items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </ul>

            {result.totalPages > 1 ? (
              <nav
                aria-label="Notification pages"
                className="mt-8 flex items-center justify-between gap-3"
              >
                <Button
                  variant="outline"
                  size="sm"
                  asChild={result.page > 1}
                  disabled={result.page <= 1}
                >
                  {result.page > 1 ? (
                    <Link
                      href={pageHref(search.filter, result.page - 1)}
                      rel="prev"
                    >
                      <ChevronLeft aria-hidden="true" />
                      Previous
                    </Link>
                  ) : (
                    <span>
                      <ChevronLeft aria-hidden="true" />
                      Previous
                    </span>
                  )}
                </Button>
                <span className="text-muted-foreground text-sm" role="status">
                  Page {result.page} of {result.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  asChild={result.page < result.totalPages}
                  disabled={result.page >= result.totalPages}
                >
                  {result.page < result.totalPages ? (
                    <Link
                      href={pageHref(search.filter, result.page + 1)}
                      rel="next"
                    >
                      Next
                      <ChevronRight aria-hidden="true" />
                    </Link>
                  ) : (
                    <span>
                      Next
                      <ChevronRight aria-hidden="true" />
                    </span>
                  )}
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <Card className="mt-4 border-dashed">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                {result.totalCount === 0 ? (
                  <BellRing aria-hidden="true" />
                ) : (
                  <Inbox aria-hidden="true" />
                )}
              </span>
              <h2 className="mt-5 text-xl font-semibold">
                {result.totalCount === 0
                  ? "No notifications yet"
                  : `No ${notificationFilterLabels[search.filter].toLowerCase()} notifications`}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md leading-7">
                {result.totalCount === 0
                  ? "When there is activity on your applications, it will show up here."
                  : "Try a different filter to see more of your notifications."}
              </p>
              {hasFilter ? (
                <Button variant="outline" className="mt-6" asChild>
                  <Link href="/notifications">View all notifications</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
