"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { uploadResumeAction } from "@/features/candidate-documents/server/actions";
import {
  MAX_RESUME_BYTES,
  MAX_RESUME_MB,
  RESUME_MIME_TYPE,
} from "@/features/candidate-documents/validation";

export function ResumeUploadForm({
  hasCurrentResume,
}: {
  hasCurrentResume: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
    setFileName(null);
  }

  // Client-side pre-checks are UX only; the Server Action re-validates the
  // bytes authoritatively (size, MIME, extension, and PDF magic bytes).
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(null);
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setFileName(null);
      return;
    }
    const looksPdf =
      file.type === RESUME_MIME_TYPE ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!looksPdf) {
      setError("Only PDF files are accepted.");
      resetInput();
      return;
    }
    if (file.size === 0) {
      setError("The selected file is empty.");
      resetInput();
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setError(`PDF files must be ${MAX_RESUME_MB} MB or smaller.`);
      resetInput();
      return;
    }
    setFileName(file.name);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF file to upload.");
      return;
    }
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadResumeAction(formData);
      if (result.success) {
        setSuccess(result.message);
        resetInput();
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3" noValidate>
      <div className="grid gap-2">
        <label htmlFor="resume-file" className="text-sm font-medium">
          {hasCurrentResume ? "Replacement PDF" : "CV PDF"}
        </label>
        <input
          ref={inputRef}
          id="resume-file"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleChange}
          disabled={pending}
          aria-describedby="resume-file-hint"
          className="border-input file:bg-muted file:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 block w-full cursor-pointer rounded-md border bg-transparent text-sm file:mr-3 file:cursor-pointer file:rounded file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <p id="resume-file-hint" className="text-muted-foreground text-xs">
          PDF only · maximum {MAX_RESUME_MB} MB. Your CV is stored privately and
          is never shown publicly.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-primary text-sm">
          {success}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={pending || !fileName}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : hasCurrentResume ? (
            <RefreshCw aria-hidden="true" />
          ) : (
            <FileUp aria-hidden="true" />
          )}
          {pending
            ? "Uploading…"
            : hasCurrentResume
              ? "Replace CV"
              : "Upload CV"}
        </Button>
      </div>
    </form>
  );
}
