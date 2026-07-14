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
import { useLocale } from "@/i18n/client";
import type { AdminDictionary, AppDictionary } from "@/i18n/dictionary";
import { formatInteger } from "@/i18n/formatter";
import { formatMessage } from "@/i18n/translate";

type ModerationActionFormProps = {
  targetId: string;
  expectedVersion: number;
  targetType: "USER" | "COMPANY" | "JOB";
  currentStatus: "ACTIVE" | "SUSPENDED" | "VISIBLE" | "HIDDEN";
  labels: AdminDictionary["moderationForm"];
  reasonLabels: AppDictionary["labels"]["moderationReason"];
};

const initialResult: ModerationActionResult | null = null;

function actionCopy(props: ModerationActionFormProps) {
  const labels = props.labels;
  if (props.targetType === "USER") {
    return props.currentStatus === "ACTIVE"
      ? {
          verb: labels.suspendUser,
          title: labels.suspendUserTitle,
          description: labels.suspendUserDescription,
          destructive: true,
          action: suspendUserAction,
        }
      : {
          verb: labels.restoreUser,
          title: labels.restoreUserTitle,
          description: labels.restoreUserDescription,
          destructive: false,
          action: restoreUserAction,
        };
  }
  if (props.targetType === "COMPANY") {
    return props.currentStatus === "VISIBLE"
      ? {
          verb: labels.hideCompany,
          title: labels.hideCompanyTitle,
          description: labels.hideCompanyDescription,
          destructive: true,
          action: hideCompanyAction,
        }
      : {
          verb: labels.restoreCompany,
          title: labels.restoreCompanyTitle,
          description: labels.restoreCompanyDescription,
          destructive: false,
          action: restoreCompanyAction,
        };
  }
  return props.currentStatus === "VISIBLE"
    ? {
        verb: labels.hideJob,
        title: labels.hideJobTitle,
        description: labels.hideJobDescription,
        destructive: true,
        action: hideJobAction,
      }
    : {
        verb: labels.restoreJob,
        title: labels.restoreJobTitle,
        description: labels.restoreJobDescription,
        destructive: false,
        action: restoreJobAction,
      };
}

export function ModerationActionForm(props: ModerationActionFormProps) {
  const router = useRouter();
  const locale = useLocale();
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
        <Label htmlFor={`reason-${props.targetId}`}>
          {props.labels.reason}
        </Label>
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
          <option value="">{props.labels.chooseReason}</option>
          {MODERATION_REASON_CODES.map((code) => (
            <option key={code} value={code}>
              {props.reasonLabels[code]}
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
          <Label htmlFor={`note-${props.targetId}`}>{props.labels.note}</Label>
          <span className="text-muted-foreground text-xs">
            {formatInteger(locale, reasonNote.length)}/
            {formatInteger(locale, 500)}
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
          placeholder={props.labels.notePlaceholder}
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
            {pending ? props.labels.working : copy.verb}
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
            <AlertDialogCancel disabled={pending}>
              {props.labels.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant={copy.destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              {pending
                ? props.labels.working
                : formatMessage(props.labels.confirm, { action: copy.verb })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
