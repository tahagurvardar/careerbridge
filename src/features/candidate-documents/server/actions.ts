"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import { applicationIdSchema } from "@/features/candidate-documents/schemas";
import { sha256Hex } from "@/features/candidate-documents/hash";
import {
  CandidateDocumentError,
  attachCurrentResumeToApplication,
  removeCurrentResume,
  replaceCurrentResume,
} from "@/features/candidate-documents/server/mutations";
import {
  MAX_RESUME_BYTES,
  MAX_RESUME_MB,
  RESUME_MIME_TYPE,
  sanitizeDocumentFilename,
  validateResumeUpload,
} from "@/features/candidate-documents/validation";
import { getPrismaClient } from "@/lib/prisma";
import { getDocumentStorage } from "@/lib/storage";
import { generateResumeStorageKey } from "@/lib/storage/keys";

export type DocumentActionResult =
  { success: true; message: string } | { success: false; message: string };

function candidateActor(
  userId: string,
  role: "CANDIDATE" | "RECRUITER" | "ADMIN",
) {
  return { userId, role } as const;
}

function revalidateDocumentViews() {
  revalidatePath("/candidate/documents");
  revalidatePath("/candidate/dashboard");
  revalidatePath("/candidate/profile");
}

function uploadFailure(error: unknown): DocumentActionResult {
  if (error instanceof CandidateDocumentError && error.code === "FORBIDDEN") {
    return { success: false, message: "Only candidates can manage a CV." };
  }
  // STORAGE, CONFLICT, and any unexpected error map to a safe, generic message
  // that never exposes storage-provider or database internals.
  return {
    success: false,
    message: "We could not save your CV right now. Please try again.",
  };
}

function attachFailure(error: unknown): DocumentActionResult {
  if (error instanceof CandidateDocumentError) {
    switch (error.code) {
      case "ALREADY_ATTACHED":
        return {
          success: false,
          message: "A CV is already attached to this application.",
        };
      case "NO_CURRENT_RESUME":
        return {
          success: false,
          message: "Upload a current CV before attaching it to an application.",
        };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: "This application can no longer receive a CV.",
        };
      case "NOT_FOUND":
        return {
          success: false,
          message: "That application was not found or is not available.",
        };
    }
  }
  return {
    success: false,
    message: "We could not attach your CV. Please try again.",
  };
}

export async function uploadResumeAction(
  formData: FormData,
): Promise<DocumentActionResult> {
  const session = await requireRole("CANDIDATE", "/candidate/documents");
  const actor = candidateActor(session.user.id, session.user.role);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Choose a PDF file to upload." };
  }
  // Reject an oversized declared length before buffering the bytes into memory.
  if (file.size > MAX_RESUME_BYTES) {
    return {
      success: false,
      message: `PDF files must be ${MAX_RESUME_MB} MB or smaller.`,
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const validation = validateResumeUpload({
    size: bytes.byteLength,
    mimeType: file.type,
    filename: file.name,
    header: bytes.subarray(0, 5),
  });
  if (!validation.ok) {
    return { success: false, message: validation.message };
  }

  try {
    await replaceCurrentResume(getPrismaClient(), getDocumentStorage(), actor, {
      storageKey: generateResumeStorageKey(),
      bytes,
      originalFilename: sanitizeDocumentFilename(file.name),
      mimeType: RESUME_MIME_TYPE,
      sizeBytes: bytes.byteLength,
      sha256: sha256Hex(bytes),
    });
    revalidateDocumentViews();
    return { success: true, message: "Your CV was uploaded." };
  } catch (error) {
    return uploadFailure(error);
  }
}

export async function removeResumeAction(): Promise<DocumentActionResult> {
  const session = await requireRole("CANDIDATE", "/candidate/documents");
  const actor = candidateActor(session.user.id, session.user.role);

  try {
    const { removed } = await removeCurrentResume(getPrismaClient(), actor);
    revalidateDocumentViews();
    return {
      success: true,
      message: removed
        ? "Your current CV was removed from your profile."
        : "You do not have a current CV to remove.",
    };
  } catch (error) {
    return uploadFailure(error);
  }
}

export async function attachResumeToApplicationAction(
  applicationIdInput: unknown,
): Promise<DocumentActionResult> {
  const parsed = applicationIdSchema.safeParse(applicationIdInput);
  if (!parsed.success) {
    return { success: false, message: "That application is not available." };
  }

  const session = await requireRole("CANDIDATE", "/candidate/applications");
  const actor = candidateActor(session.user.id, session.user.role);

  try {
    await attachCurrentResumeToApplication(
      getPrismaClient(),
      actor,
      parsed.data,
    );
    revalidatePath("/candidate/applications");
    revalidatePath(`/candidate/applications/${parsed.data}`);
    revalidatePath("/recruiter/applications");
    revalidatePath(`/recruiter/applications/${parsed.data}`);
    return {
      success: true,
      message: "Your current CV is now attached to this application.",
    };
  } catch (error) {
    return attachFailure(error);
  }
}
