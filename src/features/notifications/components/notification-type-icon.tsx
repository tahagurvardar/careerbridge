import {
  Bell,
  CalendarClock,
  Inbox,
  RefreshCw,
  Undo2,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";

import type { NotificationType } from "@/generated/prisma/enums";
import {
  notificationTypeIconKeys,
  type NotificationIconKey,
} from "@/features/notifications/notifications";

// Translates the library-agnostic icon key from the domain layer into a
// concrete icon. Keeping the mapping here means the domain key map stays
// unit-testable without importing any React/icon code.
const iconByKey: Record<NotificationIconKey, LucideIcon> = {
  inbound: Inbox,
  status: RefreshCw,
  withdrawn: Undo2,
  invitation: UserRoundPlus,
  interview: CalendarClock,
};

export function NotificationTypeIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const Icon = iconByKey[notificationTypeIconKeys[type]] ?? Bell;
  return <Icon aria-hidden="true" className={className} />;
}
