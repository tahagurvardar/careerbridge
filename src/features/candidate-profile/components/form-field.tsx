import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormStatus({
  message,
  success = false,
}: {
  message?: string;
  success?: boolean;
}) {
  return (
    <p
      aria-live="polite"
      className={success ? "text-primary text-sm" : "text-destructive text-sm"}
    >
      {message}
    </p>
  );
}
