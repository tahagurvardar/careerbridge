import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatUnreadBadge } from "@/features/notifications/notifications";
import { cn } from "@/lib/utils";

/**
 * Header notification bell: a plain link to the Activity Center with an
 * accessible label and an unread-count badge. The href and label arrive
 * pre-localized from the server header. No client state and no real-time
 * claim — the count reflects the last server render and refreshes on
 * navigation or after a mark-read action. Presentational only, so it renders
 * safely in both the server header and the client mobile navigation.
 */
export function NotificationBell({
  unreadCount,
  href,
  label,
  className,
}: {
  unreadCount: number;
  href: string;
  label: string;
  className?: string;
}) {
  const badge = formatUnreadBadge(unreadCount);

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={label}
      className={cn("relative", className)}
    >
      <Link href={href}>
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
