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
  applicationStatusLabels,
  RECRUITER_TARGET_STATUSES,
  type RecruiterTargetStatus,
} from "@/features/applications/schemas";
import {
  type ApplicationActionResult,
  transitionApplicationAction,
} from "@/features/applications/server/actions";

const actionLabels: Record<RecruiterTargetStatus, string> = {
  UNDER_REVIEW: "Move to review",
  INTERVIEW: "Advance to interview",
  OFFER: "Extend offer",
  HIRED: "Mark hired",
  REJECTED: "Reject application",
};

// Terminal, high-consequence transitions get a confirmation step.
const CONFIRM_TARGETS: readonly RecruiterTargetStatus[] = ["HIRED", "REJECTED"];

export function ApplicationStatusActions({
  applicationId,
  status,
}: {
  applicationId: string;
  status: ApplicationStatusValue;
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
        This application is in a final state ({applicationStatusLabels[status]}
        ). No further actions are available.
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
              {actionLabels[target]}
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
}: {
  target: RecruiterTargetStatus;
  pending: boolean;
  onConfirm: () => void;
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
          {actionLabels[target]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isReject
              ? "Reject this application?"
              : "Mark this candidate hired?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReject
              ? "This moves the application to a final rejected state. It cannot be changed afterwards."
              : "This moves the application to a final hired state. It cannot be changed afterwards."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={isReject ? "destructive" : "default"}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onConfirm();
            }}
          >
            {actionLabels[target]}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
