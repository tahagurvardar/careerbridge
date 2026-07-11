"use client";

import { useState, useTransition } from "react";
import { CircleX, LoaderCircle } from "lucide-react";
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
import { withdrawApplicationAction } from "@/features/applications/server/actions";

export function WithdrawApplicationButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawApplicationAction(applicationId);
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
        <Button variant="outline">
          <CircleX aria-hidden="true" />
          Withdraw application
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw this application?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes you from consideration for this job. Your application
            record is kept for your history, but this cannot be undone and you
            will not be able to apply to this job again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p aria-live="polite" className="text-destructive text-sm">
          {message}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            Keep application
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              withdraw();
            }}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <CircleX aria-hidden="true" />
            )}
            {pending ? "Withdrawing…" : "Withdraw"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
