"use client";

import { type FormEvent, useState, useTransition } from "react";
import {
  History,
  LoaderCircle,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canEditNote, isNoteEdited } from "@/features/application-notes/notes";
import { NOTE_BODY_MAX } from "@/features/application-notes/schemas";
import {
  type ApplicationNoteActionResult,
  createApplicationNoteAction,
  deleteApplicationNoteAction,
  editApplicationNoteAction,
} from "@/features/application-notes/server/actions";
import { useLocale } from "@/i18n/client";
import type { RecruiterDictionary } from "@/i18n/dictionary";
import { formatCount, formatDateTimeUtc } from "@/i18n/formatter";
import { localizeInternalPath } from "@/i18n/paths";
import { formatMessage } from "@/i18n/translate";

type ActiveNote = {
  id: string;
  body: string;
  revision: number;
  authorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { name: string } | null;
};

type DeletedNote = Omit<ActiveNote, "body"> & { deletedAt: Date | null };

function ResultMessage({
  result,
}: {
  result: ApplicationNoteActionResult | null;
}) {
  if (!result) return null;
  return (
    <p
      aria-live="polite"
      role={result.success ? "status" : "alert"}
      className={
        result.success ? "text-primary text-sm" : "text-destructive text-sm"
      }
    >
      {result.message}
    </p>
  );
}

export function ApplicationNotesPanel({
  applicationId,
  currentUserId,
  notes,
  deletedNotes,
  labels,
}: {
  applicationId: string;
  currentUserId: string;
  notes: ActiveNote[];
  deletedNotes: DeletedNote[];
  labels: RecruiterDictionary["notes"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [body, setBody] = useState("");
  const [result, setResult] = useState<ApplicationNoteActionResult | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await createApplicationNoteAction(applicationId, { body });
      setResult(next);
      if (next.success) {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid min-w-0 gap-6">
      <div className="bg-muted/45 flex items-start gap-3 rounded-xl p-4">
        <LockKeyhole
          aria-hidden="true"
          className="text-primary mt-0.5 size-4 shrink-0"
        />
        <p className="text-muted-foreground text-sm leading-6">
          {labels.privacy}
        </p>
      </div>

      <form className="grid gap-3" onSubmit={submit} noValidate>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="new-application-note">{labels.add}</Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {body.length}/{NOTE_BODY_MAX}
          </span>
        </div>
        <Textarea
          id="new-application-note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={labels.placeholder}
          rows={4}
          maxLength={NOTE_BODY_MAX}
          disabled={pending}
          aria-invalid={Boolean(
            result && !result.success && result.fieldErrors?.body,
          )}
          aria-describedby="new-application-note-status"
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div id="new-application-note-status">
            {result && !result.success && result.fieldErrors?.body ? (
              <p className="text-destructive text-sm" role="alert">
                {result.fieldErrors.body}
              </p>
            ) : (
              <ResultMessage result={result} />
            )}
          </div>
          <Button type="submit" disabled={pending || body.trim().length === 0}>
            {pending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {pending ? labels.adding : labels.add}
          </Button>
        </div>
      </form>

      {notes.length ? (
        <ul className="grid min-w-0 gap-4" aria-label={labels.activeLabel}>
          {notes.map((note) => (
            <li key={note.id} className="min-w-0">
              <ApplicationNoteCard
                applicationId={applicationId}
                note={note}
                canManage={canEditNote(
                  { authorUserId: note.authorUserId, deletedAt: null },
                  currentUserId,
                )}
                labels={labels}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">{labels.emptyTitle}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {labels.emptyDescription}
          </p>
        </div>
      )}

      {deletedNotes.length ? (
        <details className="group rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            {formatCount(locale, deletedNotes.length, labels.deletedSummary)}
          </summary>
          <ul className="mt-4 grid gap-3 border-t pt-4">
            {deletedNotes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-muted-foreground min-w-0">
                  {formatMessage(labels.deletedBy, {
                    name: note.author?.name ?? labels.formerRecruiter,
                    date: note.deletedAt
                      ? formatDateTimeUtc(locale, note.deletedAt)
                      : "—",
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="self-start sm:self-auto"
                >
                  <Link
                    href={localizeInternalPath(
                      `/recruiter/applications/${applicationId}/notes/${note.id}/history`,
                      locale,
                    )}
                  >
                    <History aria-hidden="true" />
                    {labels.history}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function ApplicationNoteCard({
  applicationId,
  note,
  canManage,
  labels,
}: {
  applicationId: string;
  note: ActiveNote;
  canManage: boolean;
  labels: RecruiterDictionary["notes"];
}) {
  const router = useRouter();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [result, setResult] = useState<ApplicationNoteActionResult | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function edit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    startTransition(async () => {
      const next = await editApplicationNoteAction(applicationId, {
        noteId: note.id,
        expectedRevision: note.revision,
        body,
      });
      setResult(next);
      if (next.success) {
        setEditing(false);
        router.refresh();
      }
    });
  }

  function remove() {
    setResult(null);
    startTransition(async () => {
      const next = await deleteApplicationNoteAction(applicationId, {
        noteId: note.id,
        expectedRevision: note.revision,
      });
      setResult(next);
      if (next.success) router.refresh();
    });
  }

  return (
    <article className="min-w-0 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {note.author?.name ?? labels.formerRecruiter}
            {canManage ? (
              <Badge variant="secondary" className="ml-2">
                {labels.you}
              </Badge>
            ) : null}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isNoteEdited(note.revision)
              ? formatMessage(labels.edited, {
                  date: formatDateTimeUtc(locale, note.updatedAt),
                })
              : formatMessage(labels.created, {
                  date: formatDateTimeUtc(locale, note.createdAt),
                })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={localizeInternalPath(
                `/recruiter/applications/${applicationId}/notes/${note.id}/history`,
                locale,
              )}
            >
              <History aria-hidden="true" />
              {labels.history}
            </Link>
          </Button>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setBody(note.body);
                  setResult(null);
                  setEditing((value) => !value);
                }}
              >
                <Pencil aria-hidden="true" />
                {labels.edit}
              </Button>
              <DeleteNoteButton
                pending={pending}
                onDelete={remove}
                labels={labels}
              />
            </>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form
          className="mt-4 grid gap-3 border-t pt-4"
          onSubmit={edit}
          noValidate
        >
          <Label htmlFor={`edit-note-${note.id}`}>{labels.editLabel}</Label>
          <Textarea
            id={`edit-note-${note.id}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={NOTE_BODY_MAX}
            disabled={pending}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ResultMessage result={result} />
            <div className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setBody(note.body);
                  setResult(null);
                }}
              >
                {labels.cancel}
              </Button>
              <Button
                type="submit"
                disabled={pending || body.trim().length === 0}
              >
                {pending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : null}
                {pending ? labels.saving : labels.save}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-4 min-w-0 leading-7 break-words whitespace-pre-wrap">
          {note.body}
        </p>
      )}
      {!editing ? <ResultMessage result={result} /> : null}
    </article>
  );
}

function DeleteNoteButton({
  pending,
  onDelete,
  labels,
}: {
  pending: boolean;
  onDelete: () => void;
  labels: RecruiterDictionary["notes"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={pending}>
          <Trash2 aria-hidden="true" />
          {labels.delete}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{labels.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {labels.deleteDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {labels.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onDelete();
            }}
          >
            {pending ? labels.deleting : labels.confirmDelete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
