"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

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
import { removeResumeAction } from "@/features/candidate-documents/server/actions";
import type { CandidateDictionary } from "@/i18n/dictionary";

export function RemoveResumeButton({
  t,
}: {
  t: CandidateDictionary["documents"]["remove"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await removeResumeAction();
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
          <Trash2 aria-hidden="true" />
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
              remove();
            }}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Trash2 aria-hidden="true" />
            )}
            {pending ? t.removing : t.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
