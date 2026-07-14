"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { requireRole } from "@/features/auth/server/session";
import { savedJobSlugSchema } from "@/features/saved-jobs/schemas";
import {
  SavedJobMutationError,
  saveJob,
  unsaveJob,
} from "@/features/saved-jobs/server/mutations";
import { getPrismaClient } from "@/lib/prisma";
import type { PublicDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";

export type SavedJobActionResult =
  | { success: true; saved: boolean; message: string }
  | { success: false; message: string };

function revalidateSavedJobViews(slug: string) {
  revalidateLocalizedPath("/jobs");
  revalidateLocalizedPath(`/jobs/${slug}`);
  revalidateLocalizedPath("/candidate/saved-jobs");
  revalidateLocalizedPath("/candidate/dashboard");
}

function genericFailure(
  error: unknown,
  messages: PublicDictionary["saveButton"],
): SavedJobActionResult {
  if (error instanceof SavedJobMutationError && error.code === "NOT_ELIGIBLE") {
    return {
      success: false,
      message: messages.unavailable,
    };
  }
  return {
    success: false,
    message: messages.failed,
  };
}

export async function saveJobAction(
  slugInput: unknown,
): Promise<SavedJobActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.public.saveButton;
  const parsed = savedJobSlugSchema.safeParse(slugInput);
  if (!parsed.success) return genericFailure(null, messages);

  const session = await requireRole("CANDIDATE", `/jobs/${parsed.data}`);
  try {
    await saveJob(
      getPrismaClient(),
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidateSavedJobViews(parsed.data);
    return { success: true, saved: true, message: messages.savedMessage };
  } catch (error) {
    return genericFailure(error, messages);
  }
}

export async function unsaveJobAction(
  slugInput: unknown,
): Promise<SavedJobActionResult> {
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.public.saveButton;
  const parsed = savedJobSlugSchema.safeParse(slugInput);
  if (!parsed.success) return genericFailure(null, messages);

  const session = await requireRole("CANDIDATE", "/candidate/saved-jobs");
  try {
    await unsaveJob(
      getPrismaClient(),
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidateSavedJobViews(parsed.data);
    return { success: true, saved: false, message: messages.removedMessage };
  } catch (error) {
    return genericFailure(error, messages);
  }
}
