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
import type { ApplicationsDictionary } from "@/i18n/dictionary";

export function WithdrawApplicationButton({
  applicationId,
  t,
}: {
  applicationId: string;
  t: ApplicationsDictionary["withdraw"];
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
          {t.trigger}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.title}</AlertDialogTitle>
          <AlertDialogDescription>{t.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <p aria-live="polite" className="text-destructive text-sm">
          {message}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t.keep}</AlertDialogCancel>
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
            {pending ? t.withdrawing : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
