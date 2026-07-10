"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ProfileActionResult } from "@/features/candidate-profile/server/actions";

export function DeleteRecordButton({
  recordLabel,
  action,
}: {
  recordLabel: "education" | "experience";
  action: () => Promise<ProfileActionResult>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await action();
      setMessage(result.message);

      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {recordLabel} record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the record from your profile. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p aria-live="polite" className="text-destructive text-sm">
            {message}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              Keep record
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {pending ? "Deleting…" : "Delete record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
