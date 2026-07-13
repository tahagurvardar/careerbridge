"use client";

import { useState, useTransition } from "react";
import { CalendarCheck2, CalendarX2, LoaderCircle } from "lucide-react";
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
import { FormStatus } from "@/features/candidate-profile/components/form-field";
import {
  cancelInterviewAction,
  completeInterviewAction,
  type InterviewActionResult,
} from "@/features/interviews/server/actions";

/**
 * Recruiter OWNER cancel/complete controls. Cancellation is terminal, so it
 * always confirms first. Rendering these buttons is presentation only — the
 * Server Actions re-authorize OWNER access and re-check the lifecycle.
 */
export function InterviewManageActions({
  interviewId,
  expectedVersion,
  canCancel,
  canComplete,
}: {
  interviewId: string;
  expectedVersion: number;
  canCancel: boolean;
  canComplete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<InterviewActionResult | null>(null);

  function run(action: "cancel" | "complete") {
    setResult(null);
    startTransition(async () => {
      const next =
        action === "cancel"
          ? await cancelInterviewAction(interviewId, expectedVersion)
          : await completeInterviewAction(interviewId, expectedVersion);
      setResult(next);
      if (next.success) router.refresh();
    });
  }

  if (!canCancel && !canComplete) {
    return (
      <p className="text-muted-foreground text-sm leading-6">
        This interview is in a final state. No further actions are available.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {canComplete ? (
          <Button
            type="button"
            onClick={() => run("complete")}
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <CalendarCheck2 aria-hidden="true" />
            )}
            Mark completed
          </Button>
        ) : null}
        {canCancel ? (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" disabled={pending}>
                <CalendarX2 aria-hidden="true" />
                Cancel interview
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this interview?</AlertDialogTitle>
                <AlertDialogDescription>
                  The candidate is notified and this interview moves to a final
                  canceled state. It cannot be restored afterwards.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>
                  Keep interview
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending}
                  onClick={(event) => {
                    event.preventDefault();
                    setConfirmOpen(false);
                    run("cancel");
                  }}
                >
                  Cancel interview
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </div>
  );
}
