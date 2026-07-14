"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  CircleCheckBig,
  CircleX,
  LoaderCircle,
} from "lucide-react";
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
import { getAllowedRecruiterTransitions } from "@/features/applications/lifecycle";
import {
  type ApplicationStatusValue,
  RECRUITER_TARGET_STATUSES,
  type RecruiterTargetStatus,
} from "@/features/applications/schemas";
import {
  type ApplicationActionResult,
  transitionApplicationAction,
} from "@/features/applications/server/actions";
import type { AppDictionary, RecruiterDictionary } from "@/i18n/dictionary";
import { formatMessage } from "@/i18n/translate";

// Terminal, high-consequence transitions get a confirmation step.
const CONFIRM_TARGETS: readonly RecruiterTargetStatus[] = ["HIRED", "REJECTED"];

export function ApplicationStatusActions({
  applicationId,
  status,
  labels,
  statusLabels,
}: {
  applicationId: string;
  status: ApplicationStatusValue;
  labels: RecruiterDictionary["applicationActions"];
  statusLabels: AppDictionary["labels"]["applicationStatus"];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApplicationActionResult | null>(null);
  const targets = getAllowedRecruiterTransitions(status).filter(
    (target): target is RecruiterTargetStatus =>
      (RECRUITER_TARGET_STATUSES as readonly ApplicationStatusValue[]).includes(
        target,
      ),
  );

  function run(target: RecruiterTargetStatus) {
    setResult(null);
    startTransition(async () => {
      const next = await transitionApplicationAction(applicationId, target);
      setResult(next);
      if (next.success) router.refresh();
    });
  }

  if (targets.length === 0) {
    return (
      <p className="text-muted-foreground text-sm leading-6">
        {formatMessage(labels.finalState, { status: statusLabels[status] })}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {targets.map((target) =>
          CONFIRM_TARGETS.includes(target) ? (
            <ConfirmTransition
              key={target}
              target={target}
              pending={pending}
              labels={labels}
              onConfirm={() => run(target)}
            />
          ) : (
            <Button
              key={target}
              type="button"
              onClick={() => run(target)}
              disabled={pending}
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <ArrowRight aria-hidden="true" />
              )}
              {labels[target]}
            </Button>
          ),
        )}
      </div>
      {result ? (
        <FormStatus message={result.message} success={result.success} />
      ) : null}
    </div>
  );
}

function ConfirmTransition({
  target,
  pending,
  onConfirm,
  labels,
}: {
  target: RecruiterTargetStatus;
  pending: boolean;
  onConfirm: () => void;
  labels: RecruiterDictionary["applicationActions"];
}) {
  const [open, setOpen] = useState(false);
  const isReject = target === "REJECTED";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={isReject ? "outline" : "default"}
          disabled={pending}
        >
          {isReject ? (
            <CircleX aria-hidden="true" />
          ) : (
            <CircleCheckBig aria-hidden="true" />
          )}
          {labels[target]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReject ? labels.rejectTitle : labels.hiredTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReject ? labels.rejectDescription : labels.hiredDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={isReject ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onConfirm();
            }}
          >
            {labels[target]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
