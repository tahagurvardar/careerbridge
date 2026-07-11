"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import { savedJobSlugSchema } from "@/features/saved-jobs/schemas";
import {
  SavedJobMutationError,
  saveJob,
  unsaveJob,
} from "@/features/saved-jobs/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

export type SavedJobActionResult =
  | { success: true; saved: boolean; message: string }
  | { success: false; message: string };

function revalidateSavedJobViews(slug: string) {
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${slug}`);
  revalidatePath("/candidate/saved-jobs");
  revalidatePath("/candidate/dashboard");
}

function genericFailure(error: unknown): SavedJobActionResult {
  if (error instanceof SavedJobMutationError && error.code === "NOT_ELIGIBLE") {
    return {
      success: false,
      message: "This job is no longer available to save.",
    };
  }
  return {
    success: false,
    message: "We could not update your saved jobs. Please try again.",
  };
}

export async function saveJobAction(
  slugInput: unknown,
): Promise<SavedJobActionResult> {
  const parsed = savedJobSlugSchema.safeParse(slugInput);
  if (!parsed.success) return genericFailure(null);

  const session = await requireRole("CANDIDATE", `/jobs/${parsed.data}`);
  try {
    await saveJob(
      getPrismaClient(),
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidateSavedJobViews(parsed.data);
    return { success: true, saved: true, message: "Job saved." };
  } catch (error) {
    return genericFailure(error);
  }
}

export async function unsaveJobAction(
  slugInput: unknown,
): Promise<SavedJobActionResult> {
  const parsed = savedJobSlugSchema.safeParse(slugInput);
  if (!parsed.success) return genericFailure(null);

  const session = await requireRole("CANDIDATE", "/candidate/saved-jobs");
  try {
    await unsaveJob(
      getPrismaClient(),
      { userId: session.user.id, role: session.user.role },
      parsed.data,
    );
    revalidateSavedJobViews(parsed.data);
    return { success: true, saved: false, message: "Job removed." };
  } catch (error) {
    return genericFailure(error);
  }
}
