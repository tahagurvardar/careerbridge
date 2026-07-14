"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { requireRole } from "@/features/auth/server/session";
import {
  applicationIdSchema,
  createApplicationNoteSchemas,
} from "@/features/application-notes/schemas";
import {
  ApplicationNoteMutationError,
  createApplicationNote,
  deleteApplicationNote,
  editApplicationNote,
} from "@/features/application-notes/server/mutations";
import { getPrismaClient } from "@/lib/prisma";
import type { RecruiterDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";

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

type ActionMessages = RecruiterDictionary["notes"]["actions"];

function failure(
  error: unknown,
  messages: ActionMessages,
): ApplicationNoteActionResult {
  if (error instanceof ApplicationNoteMutationError) {
    if (error.code === "CONFLICT") {
      return {
        success: false,
        conflict: true,
        message: messages.conflict,
      };
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: messages.unavailable,
      };
    }
  }
  return {
    success: false,
    message: messages.failed,
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
  revalidateLocalizedPath(`/recruiter/applications/${applicationId}`);
  revalidateLocalizedPath("/recruiter/applications");
  revalidateLocalizedPath(`/recruiter/jobs/${jobId}/applications`);
  revalidateLocalizedPath(`/recruiter/jobs/${jobId}`);
}

export async function createApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.notes.actions;
  const { createNoteSchema } = createApplicationNoteSchemas(messages);
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = createNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return {
      success: false,
      message: messages.invalid,
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
    return { success: true, message: messages.added };
  } catch (error) {
    return failure(error, messages);
  }
}

export async function editApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.notes.actions;
  const { editNoteSchema } = createApplicationNoteSchemas(messages);
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = editNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return {
      success: false,
      message: messages.invalid,
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
    return { success: true, message: messages.updated };
  } catch (error) {
    return failure(error, messages);
  }
}

export async function deleteApplicationNoteAction(
  applicationIdInput: unknown,
  input: unknown,
): Promise<ApplicationNoteActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.notes.actions;
  const { deleteNoteSchema } = createApplicationNoteSchemas(messages);
  const applicationId = applicationIdSchema.safeParse(applicationIdInput);
  const parsed = deleteNoteSchema.safeParse(input);
  const actor = await recruiterActor(
    applicationId.success ? applicationId.data : undefined,
  );
  if (!applicationId.success || !parsed.success) {
    return { success: false, message: messages.deleteFailed };
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
    return { success: true, message: messages.deleted };
  } catch (error) {
    return failure(error, messages);
  }
}
