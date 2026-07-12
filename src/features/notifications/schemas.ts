import { z } from "zod";

// Read-state filters for the Activity Center, expressed as URL query values.
export const NOTIFICATION_FILTERS = ["ALL", "UNREAD", "READ"] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

// A bounded page size keeps every Notification query small; history is never
// fetched unbounded.
export const NOTIFICATIONS_PAGE_SIZE = 20;

// A hard ceiling on the requested page number defends the offset query even
// before the real page count is known.
export const NOTIFICATIONS_MAX_PAGE = 10_000;

// Identifier shape filters obvious garbage before any database access; it never
// authorizes — the recipient is always derived from the session.
export const notificationIdSchema = z.string().trim().min(1).max(64);

const filterSchema = z.enum(NOTIFICATION_FILTERS).catch("ALL");

const pageSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(NOTIFICATIONS_MAX_PAGE)
  .catch(1);

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export interface NotificationSearch {
  filter: NotificationFilter;
  page: number;
}

/**
 * Parses the Activity Center query string into a validated filter and page.
 * Unknown filters fall back to ALL; non-numeric, zero, negative, or absurd page
 * values fall back to page 1 so the query is always bounded.
 */
export function parseNotificationSearch(
  searchParams: SearchParams,
): NotificationSearch {
  return {
    filter: filterSchema.parse(firstValue(searchParams.filter)),
    page: pageSchema.parse(firstValue(searchParams.page)),
  };
}

export function hasActiveNotificationFilter(
  search: NotificationSearch,
): boolean {
  return search.filter !== "ALL";
}

export const notificationFilterLabels: Record<NotificationFilter, string> = {
  ALL: "All",
  UNREAD: "Unread",
  READ: "Read",
};
