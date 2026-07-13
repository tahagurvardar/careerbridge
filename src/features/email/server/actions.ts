"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/features/auth/server/session";
import { replaceOwnEmailPreferences } from "@/features/email/server/preferences";
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
  if (session.user.role === "ADMIN") {
    return { success: false, message: "Email settings are not available." };
  }

  const schema =
    session.user.role === "CANDIDATE"
      ? candidatePreferenceSchema
      : recruiterPreferenceSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Those email settings could not be saved.",
    };
  }

  try {
    await replaceOwnEmailPreferences(
      getPrismaClient(),
      session.user.id,
      session.user.role,
      parsed.data,
    );
    revalidatePath("/settings/notifications");
    return { success: true, message: "Email settings saved." };
  } catch {
    return {
      success: false,
      message: "We could not save your email settings. Please try again.",
    };
  }
}
