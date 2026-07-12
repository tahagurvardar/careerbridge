"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/server/actions";

/**
 * Marks a single notification read, then refreshes the route so the list and
 * the layout-level header bell reflect the change in the same interaction. The
 * server action re-derives the recipient from the session and is idempotent, so
 * a repeated click is harmless.
 */
export function MarkNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await markNotificationReadAction(notificationId);
            if (result.success) {
              router.refresh();
            } else {
              setError(result.message);
            }
          })
        }
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Check aria-hidden="true" />
        )}
        Mark read
      </Button>
    </div>
  );
}

/**
 * Marks every unread notification for the current recipient read. Disabled when
 * there is nothing unread; idempotent on the server.
 */
export function MarkAllNotificationsReadButton({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const disabled = pending || unreadCount <= 0;

  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-destructive text-xs">
          {error}
        </span>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await markAllNotificationsReadAction();
            if (result.success) {
              router.refresh();
            } else {
              setError(result.message);
            }
          })
        }
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <CheckCheck aria-hidden="true" />
        )}
        Mark all as read
      </Button>
    </div>
  );
}
