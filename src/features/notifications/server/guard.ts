import "server-only";

import { redirect } from "next/navigation";

import { getDashboardPathForRole } from "@/features/auth/roles";
import { requireUser } from "@/features/auth/server/session";
import {
  isNotificationCenterRole,
  type NotificationCenterRole,
} from "@/features/notifications/notifications";

export interface NotificationSession {
  userId: string;
  role: NotificationCenterRole;
}

/**
 * Gates the Notification Center and its actions to the supported roles.
 * Signed-out users are sent to `/login` (with a safe callback); Admins — who
 * have no implicit Notification Center in this phase — are redirected to their
 * own dashboard. Returns the narrowed recipient identity from trusted session
 * state.
 */
export async function requireNotificationRecipient(
  callbackPath?: string,
): Promise<NotificationSession> {
  const session = await requireUser(callbackPath);

  if (!isNotificationCenterRole(session.user.role)) {
    redirect(getDashboardPathForRole(session.user.role));
  }

  return { userId: session.user.id, role: session.user.role };
}
