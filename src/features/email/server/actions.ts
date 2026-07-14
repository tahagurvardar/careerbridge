"use server";

import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { requireUser } from "@/features/auth/server/session";
import { replaceOwnEmailPreferences } from "@/features/email/server/preferences";
import { getRequestDictionary } from "@/i18n/server";
import { getPrismaClient } from "@/lib/prisma";

const candidatePreferenceSchema = z
  .object({
    APPLICATION_STATUS_CHANGED: z.boolean(),
    INTERVIEW_SCHEDULED: z.boolean(),
    INTERVIEW_RESCHEDULED: z.boolean(),
    INTERVIEW_CANCELED: z.boolean(),
  })
  .strict();
const recruiterPreferenceSchema = z
  .object({
    COMPANY_INVITATION_RECEIVED: z.boolean(),
    APPLICATION_SUBMITTED: z.boolean(),
    APPLICATION_WITHDRAWN: z.boolean(),
    INTERVIEW_RESPONSE_RECEIVED: z.boolean(),
  })
  .strict();

export type EmailPreferenceActionResult =
  { success: true; message: string } | { success: false; message: string };

export async function saveEmailPreferencesAction(
  input: unknown,
): Promise<EmailPreferenceActionResult> {
  const session = await requireUser("/settings/notifications");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.email.actions;
  if (session.user.role === "ADMIN") {
    return { success: false, message: messages.notAvailable };
  }

  const schema =
    session.user.role === "CANDIDATE"
      ? candidatePreferenceSchema
      : recruiterPreferenceSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalid,
    };
  }

  try {
    await replaceOwnEmailPreferences(
      getPrismaClient(),
      session.user.id,
      session.user.role,
      parsed.data,
    );
    revalidateLocalizedPath("/settings/notifications");
    return { success: true, message: messages.saved };
  } catch {
    return {
      success: false,
      message: messages.saveFailed,
    };
  }
}
