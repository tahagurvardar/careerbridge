"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Paperclip } from "lucide-react";

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
import { attachResumeToApplicationAction } from "@/features/candidate-documents/server/actions";

/**
 * Lets a Candidate attach their current CV to an eligible existing application
 * exactly once. The attachment cannot be changed afterwards, so the action is
 * confirmed deliberately.
 */
export function AttachResumeButton({
  applicationId,
  currentResumeFilename,
}: {
  applicationId: string;
  currentResumeFilename: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function attach() {
    startTransition(async () => {
      const result = await attachResumeToApplicationAction(applicationId);
      setMessage(result.message);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Paperclip aria-hidden="true" />
          Attach current CV
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Attach your current CV?</AlertDialogTitle>
          <AlertDialogDescription>
            Your current CV ({currentResumeFilename}) will be attached to this
            application and shared with the hiring team. This can only be done
            once and cannot be changed later, even if you replace your CV.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p aria-live="polite" className="text-destructive text-sm">
          {message}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              attach();
            }}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Paperclip aria-hidden="true" />
            )}
            {pending ? "Attaching…" : "Attach CV"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
