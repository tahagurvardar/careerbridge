"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MODERATION_REASON_CODES,
  moderationReasonLabels,
  type ModerationReasonCodeValue,
} from "@/features/admin/moderation";
import {
  hideCompanyAction,
  hideJobAction,
  restoreCompanyAction,
  restoreJobAction,
  restoreUserAction,
  suspendUserAction,
  type ModerationActionResult,
} from "@/features/admin/server/actions";

type ModerationActionFormProps = {
  targetId: string;
  expectedVersion: number;
  targetType: "USER" | "COMPANY" | "JOB";
  currentStatus: "ACTIVE" | "SUSPENDED" | "VISIBLE" | "HIDDEN";
};

const initialResult: ModerationActionResult | null = null;

function actionCopy(props: ModerationActionFormProps) {
  if (props.targetType === "USER") {
    return props.currentStatus === "ACTIVE"
      ? {
          verb: "Suspend user",
          title: "Suspend this user account?",
          description:
            "The account will lose authenticated access and every active session will be revoked. Historical records will remain.",
          destructive: true,
          action: suspendUserAction,
        }
      : {
          verb: "Restore user",
          title: "Restore this user account?",
          description:
            "The account may sign in normally again, but no session will be created automatically.",
          destructive: false,
          action: restoreUserAction,
        };
  }
  if (props.targetType === "COMPANY") {
    return props.currentStatus === "VISIBLE"
      ? {
          verb: "Hide company",
          title: "Hide this company?",
          description:
            "The company and all of its jobs will disappear from public discovery. Private authorized workspaces and history remain.",
          destructive: true,
          action: hideCompanyAction,
        }
      : {
          verb: "Restore company",
          title: "Restore this company's visibility?",
          description:
            "Only moderation visibility changes. The existing publication setting remains authoritative.",
          destructive: false,
          action: restoreCompanyAction,
        };
  }
  return props.currentStatus === "VISIBLE"
    ? {
        verb: "Hide job",
        title: "Hide this job?",
        description:
          "The job will disappear from public discovery and new applications will be blocked. Existing history remains.",
        destructive: true,
        action: hideJobAction,
      }
    : {
        verb: "Restore job",
        title: "Restore this job's visibility?",
        description:
          "Only moderation visibility changes. Draft, closed, or archived jobs will remain non-public.",
        destructive: false,
        action: restoreJobAction,
      };
}

export function ModerationActionForm(props: ModerationActionFormProps) {
  const router = useRouter();
  const copy = actionCopy(props);
  const [reasonCode, setReasonCode] = useState<ModerationReasonCodeValue | "">(
    "",
  );
  const [reasonNote, setReasonNote] = useState("");
  const [result, setResult] = useState(initialResult);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reasonCode || pending) return;
    startTransition(async () => {
      const nextResult = await copy.action({
        targetId: props.targetId,
        expectedVersion: props.expectedVersion,
        reasonCode,
        reasonNote,
      });
      setResult(nextResult);
      setOpen(false);
      if (nextResult.success) {
        setReasonCode("");
        setReasonNote("");
        router.refresh();
      }
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (reasonCode && !pending) setOpen(true);
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`reason-${props.targetId}`}>Moderation reason</Label>
        <select
          id={`reason-${props.targetId}`}
          value={reasonCode}
          onChange={(event) => {
            setReasonCode(event.target.value as ModerationReasonCodeValue | "");
            setResult(null);
          }}
          required
          disabled={pending}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-3 disabled:opacity-50"
        >
          <option value="">Choose a reason</option>
          {MODERATION_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {moderationReasonLabels[code]}
            </option>
          ))}
        </select>
        {result && !result.success && result.fieldErrors?.reasonCode ? (
          <p className="text-destructive text-sm">
            {result.fieldErrors.reasonCode}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`note-${props.targetId}`}>Internal note</Label>
          <span className="text-muted-foreground text-xs">
            {reasonNote.length}/500
          </span>
        </div>
        <Textarea
          id={`note-${props.targetId}`}
          value={reasonNote}
          onChange={(event) => {
            setReasonNote(event.target.value);
            setResult(null);
          }}
          maxLength={500}
          rows={4}
          disabled={pending}
          placeholder="Optional plain-text context for Admin audit history"
        />
        {result && !result.success && result.fieldErrors?.reasonNote ? (
          <p className="text-destructive text-sm">
            {result.fieldErrors.reasonNote}
          </p>
        ) : null}
      </div>

      {result ? (
        <p
          role="status"
          className={
            result.success
              ? "text-sm text-emerald-700 dark:text-emerald-300"
              : "text-destructive text-sm"
          }
        >
          {result.message}
        </p>
      ) : null}

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            type="submit"
            variant={copy.destructive ? "destructive" : "default"}
            disabled={!reasonCode || pending}
          >
            {pending ? "Working..." : copy.verb}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ShieldAlert aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>{copy.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={copy.destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              {pending ? "Working..." : `Confirm ${copy.verb.toLowerCase()}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
