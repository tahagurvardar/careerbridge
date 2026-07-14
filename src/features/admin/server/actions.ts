"use server";

import {
  createModerationMutationSchema,
  type ModerationMutationInput,
} from "@/features/admin/schemas";
import { revalidateLocalizedPath } from "@/i18n/revalidate";
import type { AdminDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";
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

type ActionMessages = AdminDictionary["moderationForm"]["action"];
type SuccessKey = Exclude<
  keyof ActionMessages,
  "conflict" | "invalidTransition" | "unavailable" | "failed" | "invalid"
>;

function safeMutationError(
  error: unknown,
  messages: ActionMessages,
): ModerationActionResult {
  if (error instanceof ModerationMutationError) {
    if (error.code === "CONFLICT") {
      return {
        success: false,
        message: messages.conflict,
      };
    }
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: messages.invalidTransition,
      };
    }
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
  successKey: SuccessKey,
  paths: (targetId: string) => string[],
): Promise<ModerationActionResult> {
  const [{ dictionary }, session] = await Promise.all([
    getRequestDictionary(),
    requireActiveAdmin(),
  ]);
  const messages = dictionary.admin.moderationForm.action;
  const parsed = createModerationMutationSchema(
    dictionary.validation,
    dictionary.admin.moderationForm,
  ).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalid,
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
    for (const path of paths(parsed.data.targetId))
      revalidateLocalizedPath(path);
    return { success: true, message: messages[successKey] };
  } catch (error) {
    return safeMutationError(error, messages);
  }
}

export async function suspendUserAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateUserAccount(getPrismaClient(), actor, "SUSPEND", parsed),
    "userSuspended",
    (id) => ["/admin", "/admin/users", `/admin/users/${id}`, "/admin/audit"],
  );
}

export async function restoreUserAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateUserAccount(getPrismaClient(), actor, "RESTORE", parsed),
    "userRestored",
    (id) => ["/admin", "/admin/users", `/admin/users/${id}`, "/admin/audit"],
  );
}

export async function hideCompanyAction(input: unknown) {
  return validatedMutation(
    input,
    (actor, parsed) =>
      moderateCompany(getPrismaClient(), actor, "HIDE", parsed),
    "companyHidden",
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
    "companyRestored",
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
    "jobHidden",
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
    "jobRestored",
    (id) => [
      "/admin",
      "/admin/jobs",
      `/admin/jobs/${id}`,
      "/admin/audit",
      "/jobs",
    ],
  );
}
