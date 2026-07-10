"use client";

import { useState, useTransition } from "react";
import { Archive, CircleCheck, LoaderCircle, Lock, Send } from "lucide-react";
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
  allowedJobActions,
  type JobLifecycleAction,
} from "@/features/jobs/lifecycle";
import type { JobStatusValue } from "@/features/jobs/schemas";
import {
  type JobActionResult,
  transitionJobAction,
} from "@/features/jobs/server/actions";

export function JobLifecycleControls({
  jobId,
  status,
  canPublish,
}: {
  jobId: string;
  status: JobStatusValue;
  canPublish: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<JobActionResult | null>(null);
  const actions = allowedJobActions(status);

  function run(action: JobLifecycleAction) {
    setResult(null);
    startTransition(async () => {
      const nextResult = await transitionJobAction(jobId, action);
      setResult(nextResult);
      if (nextResult.success) router.refresh();
    });
  }

  if (actions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-6">
        This job is archived. Archived jobs are read-only in this phase.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {actions.includes("publish") ? (
        <div className="grid gap-2">
          <Button
            type="button"
            onClick={() => run("publish")}
            disabled={pending || !canPublish}
          >
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Send aria-hidden="true" />
            )}
            Publish job
          </Button>
          {!canPublish ? (
            <p className="text-muted-foreground text-xs leading-5">
              Complete every publication requirement below to enable publishing.
            </p>
          ) : null}
        </div>
      ) : null}

      {status === "PUBLISHED" ? (
        <p className="text-primary flex items-center gap-2 text-sm font-medium">
          <CircleCheck aria-hidden="true" className="size-4" />
          Live in public job discovery.
        </p>
      ) : null}

      {actions.includes("close") ? (
        <ConfirmTransition
          trigger={
            <Button type="button" variant="outline" disabled={pending}>
              <Lock aria-hidden="true" />
              Close job
            </Button>
          }
          title="Close this job?"
          description="Closing immediately removes the job from public discovery. Candidates will no longer find or open it. You can archive it afterwards."
          confirmLabel="Close job"
          pending={pending}
          onConfirm={() => run("close")}
        />
      ) : null}

      {actions.includes("archive") ? (
        <ConfirmTransition
          trigger={
            <Button type="button" variant="ghost" disabled={pending}>
              <Archive aria-hidden="true" />
              Archive job
            </Button>
          }
          title="Archive this job?"
          description="Archiving removes the job from public discovery and locks it as read-only for this phase. This cannot be undone here."
          confirmLabel="Archive job"
          pending={pending}
          onConfirm={() => run("archive")}
        />
      ) : null}

      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </div>
  );
}

function ConfirmTransition({
  trigger,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep as is</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
