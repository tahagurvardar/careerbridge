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

function formatNoteDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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
}: {
  applicationId: string;
  currentUserId: string;
  notes: ActiveNote[];
  deletedNotes: DeletedNote[];
}) {
  const router = useRouter();
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
          Internal hiring-team notes. Candidates, company members, admins, and
          the public cannot view them.
        </p>
      </div>

      <form className="grid gap-3" onSubmit={submit} noValidate>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="new-application-note">Add a note</Label>
          <span className="text-muted-foreground text-xs tabular-nums">
            {body.length}/{NOTE_BODY_MAX}
          </span>
        </div>
        <Textarea
          id="new-application-note"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add private context for the hiring team…"
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
            Add note
          </Button>
        </div>
      </form>

      {notes.length ? (
        <ul
          className="grid min-w-0 gap-4"
          aria-label="Active application notes"
        >
          {notes.map((note) => (
            <li key={note.id} className="min-w-0">
              <ApplicationNoteCard
                applicationId={applicationId}
                note={note}
                canManage={canEditNote(
                  { authorUserId: note.authorUserId, deletedAt: null },
                  currentUserId,
                )}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed p-6 text-center">
          <p className="font-medium">No internal notes yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Add the first note to keep private hiring context with this
            application.
          </p>
        </div>
      )}

      {deletedNotes.length ? (
        <details className="group rounded-xl border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Deleted note history ({deletedNotes.length})
          </summary>
          <ul className="mt-4 grid gap-3 border-t pt-4">
            {deletedNotes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-muted-foreground min-w-0">
                  Deleted{" "}
                  {note.deletedAt ? formatNoteDate(note.deletedAt) : "—"}
                  {note.author?.name
                    ? ` · originally by ${note.author.name}`
                    : ""}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="self-start sm:self-auto"
                >
                  <Link
                    href={`/recruiter/applications/${applicationId}/notes/${note.id}/history`}
                  >
                    <History aria-hidden="true" />
                    View history
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
}: {
  applicationId: string;
  note: ActiveNote;
  canManage: boolean;
}) {
  const router = useRouter();
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
            {note.author?.name ?? "Former recruiter"}
            {canManage ? (
              <Badge variant="secondary" className="ml-2">
                Your note
              </Badge>
            ) : null}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {isNoteEdited(note.revision)
              ? `Edited ${formatNoteDate(note.updatedAt)} · Revision ${note.revision}`
              : `Added ${formatNoteDate(note.createdAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 sm:justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/recruiter/applications/${applicationId}/notes/${note.id}/history`}
            >
              <History aria-hidden="true" />
              History
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
                Edit
              </Button>
              <DeleteNoteButton pending={pending} onDelete={remove} />
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
          <Label htmlFor={`edit-note-${note.id}`}>Edit note</Label>
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
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || body.trim().length === 0}
              >
                {pending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : null}
                Save changes
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
}: {
  pending: boolean;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={pending}>
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
          <AlertDialogDescription>
            It will leave the active notes list, but its immutable revision
            history remains available to authorized company owners.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setOpen(false);
              onDelete();
            }}
          >
            Delete note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
