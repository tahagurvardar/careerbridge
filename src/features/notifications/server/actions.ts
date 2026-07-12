"use server";

import { revalidatePath } from "next/cache";

import { getDashboardPathForRole } from "@/features/auth/roles";
import { notificationIdSchema } from "@/features/notifications/schemas";
import { requireNotificationRecipient } from "@/features/notifications/server/guard";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

export type NotificationActionResult =
  { success: true; message: string } | { success: false; message: string };

/**
 * Revalidates the Activity Center and the caller's own dashboard so the header
 * bell and any on-page unread counts reflect the change. The client also calls
 * `router.refresh()` to update the layout-level header in the same interaction.
 */
function revalidateNotificationViews(role: "CANDIDATE" | "RECRUITER") {
  revalidatePath("/notifications");
  revalidatePath(getDashboardPathForRole(role));
}

export async function markNotificationReadAction(
  notificationIdInput: unknown,
): Promise<NotificationActionResult> {
  const recipient = await requireNotificationRecipient("/notifications");
  const parsed = notificationIdSchema.safeParse(notificationIdInput);
  if (!parsed.success) {
    return { success: false, message: "That notification is not available." };
  }

  try {
    await markNotificationRead(getPrismaClient(), recipient, parsed.data);
    revalidateNotificationViews(recipient.role);
    return { success: true, message: "Notification marked as read." };
  } catch {
    // Return a safe, generic error — never a raw Prisma error or stack trace.
    return {
      success: false,
      message: "We could not update that notification. Please try again.",
    };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const recipient = await requireNotificationRecipient("/notifications");

  try {
    await markAllNotificationsRead(getPrismaClient(), recipient);
    revalidateNotificationViews(recipient.role);
    return { success: true, message: "All notifications marked as read." };
  } catch {
    return {
      success: false,
      message: "We could not update your notifications. Please try again.",
    };
  }
}
