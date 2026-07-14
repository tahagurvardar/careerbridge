"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import type { CandidateDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
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
  revalidateLocalizedPath("/candidate/documents");
  revalidateLocalizedPath("/candidate/dashboard");
  revalidateLocalizedPath("/candidate/profile");
}

type DocumentMessages = CandidateDictionary["documents"]["actions"];

function uploadFailure(
  error: unknown,
  messages: DocumentMessages,
): DocumentActionResult {
  if (error instanceof CandidateDocumentError && error.code === "FORBIDDEN") {
    return { success: false, message: messages.candidateOnly };
  }
  // STORAGE, CONFLICT, and any unexpected error map to a safe, generic message
  // that never exposes storage-provider or database internals.
  return {
    success: false,
    message: messages.saveFailed,
  };
}

function attachFailure(
  error: unknown,
  messages: DocumentMessages,
): DocumentActionResult {
  if (error instanceof CandidateDocumentError) {
    switch (error.code) {
      case "ALREADY_ATTACHED":
        return {
          success: false,
          message: messages.alreadyAttached,
        };
      case "NO_CURRENT_RESUME":
        return {
          success: false,
          message: messages.noCurrent,
        };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: messages.noLongerEligible,
        };
      case "NOT_FOUND":
        return {
          success: false,
          message: messages.applicationUnavailable,
        };
    }
  }
  return {
    success: false,
    message: messages.attachFailed,
  };
}

export async function uploadResumeAction(
  formData: FormData,
): Promise<DocumentActionResult> {
  const session = await requireRole("CANDIDATE", "/candidate/documents");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.documents.actions;
  const actor = candidateActor(session.user.id, session.user.role);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: messages.chooseFile };
  }
  // Reject an oversized declared length before buffering the bytes into memory.
  if (file.size > MAX_RESUME_BYTES) {
    return {
      success: false,
      message: formatMessage(messages.tooLarge, { max: MAX_RESUME_MB }),
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
    const validationMessages = {
      MISSING_FILE: messages.missingFile,
      EMPTY_FILE: messages.emptyFile,
      TOO_LARGE: formatMessage(messages.tooLarge, { max: MAX_RESUME_MB }),
      INVALID_TYPE: messages.invalidType,
      INVALID_EXTENSION: messages.invalidExtension,
      INVALID_SIGNATURE: messages.invalidSignature,
      INVALID_FILENAME: messages.invalidFilename,
    } as const;
    return { success: false, message: validationMessages[validation.code] };
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
    return { success: true, message: messages.uploaded };
  } catch (error) {
    return uploadFailure(error, messages);
  }
}

export async function removeResumeAction(): Promise<DocumentActionResult> {
  const session = await requireRole("CANDIDATE", "/candidate/documents");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.documents.actions;
  const actor = candidateActor(session.user.id, session.user.role);

  try {
    const { removed } = await removeCurrentResume(getPrismaClient(), actor);
    revalidateDocumentViews();
    return {
      success: true,
      message: removed ? messages.removed : messages.noneToRemove,
    };
  } catch (error) {
    return uploadFailure(error, messages);
  }
}

export async function attachResumeToApplicationAction(
  applicationIdInput: unknown,
): Promise<DocumentActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.documents.actions;
  const parsed = applicationIdSchema.safeParse(applicationIdInput);
  if (!parsed.success) {
    return { success: false, message: messages.invalidApplication };
  }

  const session = await requireRole("CANDIDATE", "/candidate/applications");
  const actor = candidateActor(session.user.id, session.user.role);

  try {
    await attachCurrentResumeToApplication(
      getPrismaClient(),
      actor,
      parsed.data,
    );
    revalidateLocalizedPath("/candidate/applications");
    revalidateLocalizedPath(`/candidate/applications/${parsed.data}`);
    revalidateLocalizedPath("/recruiter/applications");
    revalidateLocalizedPath(`/recruiter/applications/${parsed.data}`);
    return {
      success: true,
      message: messages.attached,
    };
  } catch (error) {
    return attachFailure(error, messages);
  }
}
