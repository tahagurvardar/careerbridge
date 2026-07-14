"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getDashboardPathForRole } from "@/features/auth/roles";
import { notificationIdSchema } from "@/features/notifications/schemas";
import { requireNotificationRecipient } from "@/features/notifications/server/guard";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/server/mutations";
import { getRequestDictionary } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

export type NotificationActionResult =
  { success: true; message: string } | { success: false; message: string };

/**
 * Revalidates the Activity Center and the caller's own dashboard so the header
 * bell and any on-page unread counts reflect the change. Routes live under the
 * `[locale]` segment, so the page form invalidates every locale variant. The
 * client also calls `router.refresh()` to update the layout-level header in
 * the same interaction.
 */
function revalidateNotificationViews(role: "CANDIDATE" | "RECRUITER") {
  revalidateLocalizedPath("/notifications");
  revalidateLocalizedPath(`${getDashboardPathForRole(role)}`);
}

export async function markNotificationReadAction(
  notificationIdInput: unknown,
): Promise<NotificationActionResult> {
  const recipient = await requireNotificationRecipient("/notifications");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.notifications.actions;
  const parsed = notificationIdSchema.safeParse(notificationIdInput);
  if (!parsed.success) {
    return { success: false, message: messages.invalidNotification };
  }

  try {
    await markNotificationRead(getPrismaClient(), recipient, parsed.data);
    revalidateNotificationViews(recipient.role);
    return { success: true, message: messages.markedRead };
  } catch {
    // Return a safe, generic error — never a raw Prisma error or stack trace.
    return {
      success: false,
      message: messages.updateFailed,
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const recipient = await requireNotificationRecipient("/notifications");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.notifications.actions;

  try {
    await markAllNotificationsRead(getPrismaClient(), recipient);
    revalidateNotificationViews(recipient.role);
    return { success: true, message: messages.markedAllRead };
  } catch {
    return {
      success: false,
      message: messages.updateAllFailed,
    };
  }
}
