import "server-only";

import { cache } from "react";

import type { PrismaClient } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import {
  NOTIFICATIONS_PAGE_SIZE,
  type NotificationFilter,
  type NotificationSearch,
} from "@/features/notifications/schemas";

// Browser-facing projection. Only these fields ever leave the server: never
// dedupeKey, recipientUserId, actorUserId, relation ids, or actor private data.
// `id` is included solely as the target for the recipient's own mark-read
// action.
const notificationListSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  href: true,
  readAt: true,
  createdAt: true,
} as const;

export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  readAt: Date | null;
  createdAt: Date;
}

/**
 * Unread count for the authenticated recipient. Wrapped in React `cache` so the
 * header bell and a dashboard rendered in the same request share one query.
 * Recipient identity is always the caller-supplied session user id — never a
 * client value.
 */
export const getUnreadNotificationCount = cache(
  async (prisma: PrismaClient, recipientUserId: string): Promise<number> => {
    return prisma.notification.count({
      where: { recipientUserId, readAt: null },
    });
  },
);

/**
 * A few most-recent notifications for the header dropdown and dashboards.
 * Newest first with a stable tiebreak; safe projection only.
 */
export async function getRecentNotifications(
  prisma: PrismaClient,
  recipientUserId: string,
  take = 5,
): Promise<NotificationListItem[]> {
  return prisma.notification.findMany({
    where: { recipientUserId },
    select: notificationListSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

/** Unread count plus recent notifications for a dashboard summary card. */
export async function getNotificationSummary(
  prisma: PrismaClient,
  recipientUserId: string,
  take = 4,
): Promise<{ unreadCount: number; recent: NotificationListItem[] }> {
  const [unreadCount, recent] = await Promise.all([
    getUnreadNotificationCount(prisma, recipientUserId),
    getRecentNotifications(prisma, recipientUserId, take),
  ]);
  return { unreadCount, recent };
}

function filterWhere(recipientUserId: string, filter: NotificationFilter) {
  if (filter === "UNREAD") return { recipientUserId, readAt: null };
  if (filter === "READ") return { recipientUserId, readAt: { not: null } };
  return { recipientUserId };
}

export interface NotificationCenterPage {
  items: NotificationListItem[];
  filter: NotificationFilter;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  unreadCount: number;
  readCount: number;
  filteredCount: number;
}

/**
 * One page of the Activity Center for the authenticated recipient. Counts are
 * derived from two bounded aggregates; the page number is clamped to the real
 * page range so an out-of-range request never issues a huge offset query.
 * Ordering is deterministic (createdAt DESC, id DESC).
 */
export async function getNotificationCenterPage(
  prisma: PrismaClient,
  recipientUserId: string,
  search: NotificationSearch,
): Promise<NotificationCenterPage> {
  const pageSize = NOTIFICATIONS_PAGE_SIZE;

  const [totalCount, unreadCount] = await Promise.all([
    prisma.notification.count({ where: { recipientUserId } }),
    prisma.notification.count({
      where: { recipientUserId, readAt: null },
    }),
  ]);
  const readCount = totalCount - unreadCount;
  const filteredCount =
    search.filter === "UNREAD"
      ? unreadCount
      : search.filter === "READ"
        ? readCount
        : totalCount;

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const page = Math.min(Math.max(1, search.page), totalPages);

  const items = filteredCount
    ? await prisma.notification.findMany({
        where: filterWhere(recipientUserId, search.filter),
        select: notificationListSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    : [];

  return {
    items,
    filter: search.filter,
    page,
    pageSize,
    totalPages,
    totalCount,
    unreadCount,
    readCount,
    filteredCount,
  };
}
