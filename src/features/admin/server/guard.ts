import "server-only";

import { requireRole } from "@/features/auth/server/session";

/** The single route/action boundary for authenticated, active Admin access. */
export function requireActiveAdmin(callbackPath?: string) {
  return requireRole("ADMIN", callbackPath ?? "/admin");
}
