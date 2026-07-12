"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  applicationIdSchema,
  createNoteSchema,
  deleteNoteSchema,
  editNoteSchema,
} from "@/features/application-notes/schemas";
import {
  ApplicationNoteMutationError,
  createApplicationNote,
  deleteApplicationNote,
  editApplicationNote,
} from "@/features/application-notes/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type ApplicationNoteActionResult =
  | { success: true; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
      conflict?: boolean;
    };

function firstFieldErrors(error: {
  flatten(): { fieldErrors: Record<string, string[] | undefined> };
}) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ]),
  );
}

function failure(error: unknown): ApplicationNoteActionResult {
  if (error instanceof ApplicationNoteMutationError) {
    if (error.code === "CONFLICT") {
      return {
        success: false,
        conflict: true,
        message:
          "This note changed since you opened it. Refresh and review the latest version before trying again.",
      };
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: "That note was not found or is not available to you.",
      };
    }
  }
  return {
    success: false,
    message: "We could not update the note. Please try again.",
  };
}

async function recruiterActor(applicationId?: string) {
  const session = await requireRole(
    "RECRUITER",
    applicationId
      ? `/recruiter/applications/${applicationId}`
      : "/recruiter/applications",
  );
  return { userId: session.user.id, role: session.user.role } as const;
}

function revalidateNoteViews(applicationId: string, jobId: string) {
  revalidatePath(`/recruiter/applications/${applicationId}`);
  revalidatePath("/recruiter/applications");
  revalidatePath(`/recruiter/jobs/${jobId}/applications`);
  revalidatePath(`/recruiter/jobs/${jobId}`);
}

export async function createApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = createNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return {
      success: false,
      message: "Check the note and try again.",
      fieldErrors: parsed.success ? undefined : firstFieldErrors(parsed.error),
    };
  }

  try {
    const note = await createApplicationNote(
      getPrismaClient(),
      actor,
      applicationId.data,
      parsed.data.body,
    );
    revalidateNoteViews(note.applicationId, note.jobId);
    return { success: true, message: "Note added." };
  } catch (error) {
    return failure(error);
  }
}

export async function editApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = editNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return {
      success: false,
      message: "Check the note and try again.",
      fieldErrors: parsed.success ? undefined : firstFieldErrors(parsed.error),
    };
  }

  try {
    const note = await editApplicationNote(
      getPrismaClient(),
      actor,
      applicationId.data,
      parsed.data.noteId,
      parsed.data.expectedRevision,
      parsed.data.body,
    );
    revalidateNoteViews(note.applicationId, note.jobId);
    return { success: true, message: "Note updated." };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = deleteNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return { success: false, message: "That note could not be deleted." };
  }

  try {
    const note = await deleteApplicationNote(
      getPrismaClient(),
      actor,
      applicationId.data,
      parsed.data.noteId,
      parsed.data.expectedRevision,
    );
    revalidateNoteViews(note.applicationId, note.jobId);
    return { success: true, message: "Note deleted." };
  } catch (error) {
    return failure(error);
  }
}
