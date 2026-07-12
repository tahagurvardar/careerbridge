import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { NotificationCenterRole } from "@/features/notifications/notifications";

// The recipient is always derived from the session; the browser supplies only
// which notification to mark (an id reference), never ownership, read time, or
// any other field.
export interface NotificationRecipient {
  userId: string;
  role: NotificationCenterRole;
}

/**
 * Marks one notification read. The update is scoped to
 * `(id, recipientUserId, readAt: null)`, so it only ever touches the caller's
 * own unread row. Idempotent: an already-read notification, another user's
 * notification, or a non-existent id all match zero rows and return `0`,
 * revealing nothing about whether the row exists.
 */
export async function markNotificationRead(
  prisma: PrismaClient,
  recipient: NotificationRecipient,
  notificationId: string,
): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      recipientUserId: recipient.userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}

/**
 * Marks every unread notification for the caller read. Scoped strictly to the
 * session user's own unread rows; never touches another recipient. Idempotent.
 */
export async function markAllNotificationsRead(
  prisma: PrismaClient,
  recipient: NotificationRecipient,
): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { recipientUserId: recipient.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { updated: result.count };
}
