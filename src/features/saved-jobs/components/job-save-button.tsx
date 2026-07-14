"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  saveJobAction,
  unsaveJobAction,
} from "@/features/saved-jobs/server/actions";
import type { PublicDictionary } from "@/i18n/dictionary";

export function JobSaveButton({
  slug,
  initialSaved,
  labels,
  className,
  compact = false,
}: {
  slug: string;
  initialSaved: boolean;
  labels: PublicDictionary["saveButton"];
  className?: string;
  compact?: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleSaved() {
    if (pending) return;

    startTransition(async () => {
      const result = saved
        ? await unsaveJobAction(slug)
        : await saveJobAction(slug);
      setMessage(result.message);
      if (result.success) setSaved(result.saved);
    });
  }

  const label = saved ? labels.removeFromSaved : labels.save;

  return (
    <div className={compact ? "shrink-0" : "grid gap-1.5"}>
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        size={compact ? "sm" : "default"}
        className={className}
        disabled={pending}
        aria-label={label}
        aria-pressed={saved}
        onClick={toggleSaved}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : saved ? (
          <BookmarkCheck aria-hidden="true" />
        ) : (
          <Bookmark aria-hidden="true" />
        )}
        {pending ? labels.updating : saved ? labels.saved : labels.save}
      </Button>
      <p
        aria-live="polite"
        className={compact ? "sr-only" : "text-muted-foreground text-xs"}
      >
        {message}
      </p>
    </div>
  );
}
