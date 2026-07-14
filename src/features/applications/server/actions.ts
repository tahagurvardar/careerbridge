"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { requireRole } from "@/features/auth/server/session";
import {
  createApplySchema,
  recruiterStatusActionSchema,
} from "@/features/applications/schemas";
import {
  ApplicationMutationError,
  createJobApplication,
  transitionApplicationByRecruiter,
  withdrawJobApplication,
} from "@/features/applications/server/mutations";
import { getPrismaClient } from "@/lib/prisma";
import type { ApplicationsDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";

type FieldErrors = Record<string, string | undefined>;

export type ApplicationActionResult =
  | { success: true; message: string; redirectTo?: string }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
      profileIncomplete?: boolean;
      alreadyApplied?: boolean;
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

async function candidateActor(callbackPath: string) {
  const session = await requireRole("CANDIDATE", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

async function recruiterActor(callbackPath: string) {
  const session = await requireRole("RECRUITER", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

type ActionMessages = ApplicationsDictionary["actions"];

function applyFailure(
  error: unknown,
  messages: ActionMessages,
): ApplicationActionResult {
  if (error instanceof ApplicationMutationError) {
    switch (error.code) {
      case "PROFILE_INCOMPLETE":
        return {
          success: false,
          message: formatMessage(messages.profileIncomplete, {
            details: (error.details ?? [])
              .map(
                (detail) =>
                  ({
                    headline: messages.profileHeadline,
                    location: messages.profileLocation,
                    skills: messages.profileSkill,
                  })[detail] ?? messages.profileSkill,
              )
              .join(", "),
          }),
          profileIncomplete: true,
        };
      case "ALREADY_APPLIED":
        return {
          success: false,
          message: messages.alreadyApplied,
          alreadyApplied: true,
        };
      case "DEADLINE_PASSED":
        return {
          success: false,
          message: messages.deadlinePassed,
        };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: messages.notEligible,
        };
      case "FORBIDDEN":
        return {
          success: false,
          message: messages.candidateOnly,
        };
    }
  }
  return {
    success: false,
    message: messages.submitFailed,
  };
}

function mutationFailure(
  error: unknown,
  messages: ActionMessages,
): ApplicationActionResult {
  if (error instanceof ApplicationMutationError) {
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: messages.invalidTransition,
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

function revalidateCandidateViews(slug?: string, applicationId?: string) {
  revalidateLocalizedPath("/candidate/applications");
  revalidateLocalizedPath("/candidate/dashboard");
  if (applicationId)
    revalidateLocalizedPath(`/candidate/applications/${applicationId}`);
  if (slug) revalidateLocalizedPath(`/jobs/${slug}`);
}

function revalidateRecruiterViews(applicationId?: string) {
  revalidateLocalizedPath("/recruiter/applications");
  revalidateLocalizedPath("/recruiter/dashboard");
  if (applicationId)
    revalidateLocalizedPath(`/recruiter/applications/${applicationId}`);
}

export async function applyToJobAction(
  slug: string,
  input: unknown,
): Promise<ApplicationActionResult> {
  const actor = await candidateActor(`/jobs/${slug}/apply`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.applications.actions;
  const parsed = createApplySchema(dictionary.validation).safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const application = await createJobApplication(
      getPrismaClient(),
      actor,
      slug,
      parsed.data.coverLetter,
    );
    revalidateCandidateViews(slug, application.id);
    revalidateLocalizedPath("/recruiter/applications");
    return {
      success: true,
      message: messages.submitted,
      redirectTo: `/candidate/applications/${application.id}`,
    };
  } catch (error) {
    return applyFailure(error, messages);
  }
}

export async function withdrawApplicationAction(
  applicationId: string,
): Promise<ApplicationActionResult> {
  const actor = await candidateActor("/candidate/applications");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.applications.actions;

  try {
    await withdrawJobApplication(getPrismaClient(), actor, applicationId);
    revalidateCandidateViews(undefined, applicationId);
    revalidateLocalizedPath("/recruiter/applications");
    return { success: true, message: messages.withdrawn };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function transitionApplicationAction(
  applicationId: string,
  targetStatus: unknown,
): Promise<ApplicationActionResult> {
  const actor = await recruiterActor("/recruiter/applications");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.applications.actions;
  const parsed = recruiterStatusActionSchema.safeParse(targetStatus);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalidTransition,
    };
  }

  try {
    await transitionApplicationByRecruiter(
      getPrismaClient(),
      actor,
      applicationId,
      parsed.data,
    );
    revalidateRecruiterViews(applicationId);
    revalidateLocalizedPath("/candidate/applications");
    return { success: true, message: messages.updated };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}
