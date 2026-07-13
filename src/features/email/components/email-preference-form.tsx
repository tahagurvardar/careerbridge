"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  emailEventDescriptions,
  emailEventLabels,
} from "@/features/email/email";
import { saveEmailPreferencesAction } from "@/features/email/server/actions";
import type { EmailEventType } from "@/generated/prisma/enums";

export function EmailPreferenceForm({
  events,
  initialValues,
}: {
  events: readonly EmailEventType[];
  initialValues: Partial<Record<EmailEventType, boolean>>;
}) {
  const [values, setValues] = useState(initialValues);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setResult(null);
        startTransition(async () => {
          const payload = Object.fromEntries(
            events.map((eventType) => [eventType, values[eventType] !== false]),
          );
          setResult(await saveEmailPreferencesAction(payload));
        });
      }}
    >
      <fieldset disabled={pending} className="grid gap-3">
        <legend className="sr-only">Transactional email preferences</legend>
        {events.map((eventType) => {
          const id = `email-preference-${eventType.toLowerCase()}`;
          return (
            <label
              key={eventType}
              htmlFor={id}
              className="border-border hover:bg-muted/40 flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors sm:p-5"
            >
              <Checkbox
                id={id}
                className="mt-0.5"
                checked={values[eventType] !== false}
                onCheckedChange={(checked) =>
                  setValues((current) => ({
                    ...current,
                    [eventType]: checked === true,
                  }))
                }
              />
              <span className="grid gap-1">
                <span className="font-medium">
                  {emailEventLabels[eventType]}
                </span>
                <span className="text-muted-foreground text-sm leading-6">
                  {emailEventDescriptions[eventType]}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : null}
          Save email settings
        </Button>
        {result ? (
          <p
            role={result.success ? "status" : "alert"}
            className={
              result.success
                ? "text-muted-foreground flex items-center gap-1.5 text-sm"
                : "text-destructive text-sm"
            }
          >
            {result.success ? <CheckCircle2 aria-hidden="true" /> : null}
            {result.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
