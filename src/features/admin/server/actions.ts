"use server";

import { revalidatePath } from "next/cache";

import {
  moderationMutationSchema,
  type ModerationMutationInput,
} from "@/features/admin/schemas";
import { requireActiveAdmin } from "@/features/admin/server/guard";
import {
  moderateCompany,
  moderateJob,
  moderateUserAccount,
  ModerationMutationError,
} from "@/features/admin/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type ModerationActionResult =
  | { success: true; message: string }
  | { success: false; message: string; fieldErrors?: FieldErrors };

function validationErrors(error: {
  flatten(): { fieldErrors: Record<string, string[] | undefined> };
}) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ]),
  );
}

function safeMutationError(error: unknown): ModerationActionResult {
  if (error instanceof ModerationMutationError) {
    if (error.code === "CONFLICT") {
      return {
        success: false,
        message: "This record changed. Refresh and try again.",
      };
    }
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: "This moderation action is no longer available.",
      };
    }
    return {
      success: false,
      message: "This moderation target is unavailable.",
    };
  }

  return {
    success: false,
    message: "We could not complete this moderation action. Try again.",
  };
}

async function validatedMutation(
  input: unknown,
  run: (
    actor: {
      userId: string;
      role: "ADMIN";
      accountStatus: "ACTIVE";
    },
    parsed: ModerationMutationInput,
  ) => Promise<unknown>,
  successMessage: string,
  paths: (targetId: string) => string[],
): Promise<ModerationActionResult> {
  const session = await requireActiveAdmin();
  const parsed = moderationMutationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: validationErrors(parsed.error),
    };
  }

  try {
    await run(
      {
        userId: session.user.id,
        role: "ADMIN",
        accountStatus: "ACTIVE",
      },
      parsed.data,
    );
    for (const path of paths(parsed.data.targetId)) revalidatePath(path);
    return { success: true, message: successMessage };
  } catch (error) {
    return safeMutationError(error);
  }
}

export async function suspendUserAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateUserAccount(getPrismaClient(), actor, "SUSPEND", parsed),
    "The user account was suspended and active sessions were revoked.",
    (id) => ["/admin", "/admin/users", `/admin/users/${id}`, "/admin/audit"],
  );
}

export async function restoreUserAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateUserAccount(getPrismaClient(), actor, "RESTORE", parsed),
    "The user account was restored. They must sign in again.",
    (id) => ["/admin", "/admin/users", `/admin/users/${id}`, "/admin/audit"],
  );
}

export async function hideCompanyAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateCompany(getPrismaClient(), actor, "HIDE", parsed),
    "The company was hidden from public discovery.",
    (id) => [
      "/admin",
      "/admin/companies",
      `/admin/companies/${id}`,
      "/admin/jobs",
      "/admin/audit",
      "/companies",
      "/jobs",
    ],
  );
}

export async function restoreCompanyAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateCompany(getPrismaClient(), actor, "RESTORE", parsed),
    "The company moderation visibility was restored.",
    (id) => [
      "/admin",
      "/admin/companies",
      `/admin/companies/${id}`,
      "/admin/jobs",
      "/admin/audit",
      "/companies",
      "/jobs",
    ],
  );
}

export async function hideJobAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) => moderateJob(getPrismaClient(), actor, "HIDE", parsed),
    "The job was hidden from public discovery.",
    (id) => [
      "/admin",
      "/admin/jobs",
      `/admin/jobs/${id}`,
      "/admin/audit",
      "/jobs",
    ],
  );
}

export async function restoreJobAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) => moderateJob(getPrismaClient(), actor, "RESTORE", parsed),
    "The job moderation visibility was restored.",
    (id) => [
      "/admin",
      "/admin/jobs",
      `/admin/jobs/${id}`,
      "/admin/audit",
      "/jobs",
    ],
  );
}
