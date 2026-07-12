import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatUnreadBadge,
  unreadBellLabel,
} from "@/features/notifications/notifications";
import { cn } from "@/lib/utils";

/**
 * Header notification bell: a plain link to the Activity Center with an
 * accessible label and an unread-count badge. No client state and no real-time
 * claim — the count reflects the last server render and refreshes on navigation
 * or after a mark-read action. Presentational only, so it renders safely in
 * both the server header and the client mobile navigation.
 */
export function NotificationBell({
  unreadCount,
  className,
}: {
  unreadCount: number;
  className?: string;
}) {
  const badge = formatUnreadBadge(unreadCount);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={unreadBellLabel(unreadCount)}
      className={cn("relative", className)}
    >
      <Link href="/notifications">
        <Bell aria-hidden="true" />
        {badge ? (
          <span
            aria-hidden="true"
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold"
          >
            {badge}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
