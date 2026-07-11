"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  applySchema,
  recruiterStatusActionSchema,
} from "@/features/applications/schemas";
import {
  ApplicationMutationError,
  createJobApplication,
  transitionApplicationByRecruiter,
  withdrawJobApplication,
} from "@/features/applications/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

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

function applyFailure(error: unknown): ApplicationActionResult {
  if (error instanceof ApplicationMutationError) {
    switch (error.code) {
      case "PROFILE_INCOMPLETE":
        return {
          success: false,
          message: `Complete your profile before applying: ${error.details?.join(", ")}.`,
          profileIncomplete: true,
        };
      case "ALREADY_APPLIED":
        return {
          success: false,
          message: "You have already applied to this job.",
          alreadyApplied: true,
        };
      case "DEADLINE_PASSED":
        return {
          success: false,
          message: "Applications for this job are closed.",
        };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: "This job is no longer accepting applications.",
        };
      case "FORBIDDEN":
        return {
          success: false,
          message: "Only candidates can apply to jobs.",
        };
    }
  }
  return {
    success: false,
    message: "We could not submit your application. Please try again.",
  };
}

function mutationFailure(error: unknown): ApplicationActionResult {
  if (error instanceof ApplicationMutationError) {
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: "That action is not available for this application right now.",
      };
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: "That application was not found or is not available.",
      };
    }
  }
  return {
    success: false,
    message: "We could not complete that action. Please try again.",
  };
}

function revalidateCandidateViews(slug?: string, applicationId?: string) {
  revalidatePath("/candidate/applications");
  revalidatePath("/candidate/dashboard");
  if (applicationId) revalidatePath(`/candidate/applications/${applicationId}`);
  if (slug) revalidatePath(`/jobs/${slug}`);
}

function revalidateRecruiterViews(applicationId?: string) {
  revalidatePath("/recruiter/applications");
  revalidatePath("/recruiter/dashboard");
  if (applicationId) revalidatePath(`/recruiter/applications/${applicationId}`);
}

export async function applyToJobAction(
  slug: string,
  input: unknown,
): Promise<ApplicationActionResult> {
  const actor = await candidateActor(`/jobs/${slug}/apply`);
  const parsed = applySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
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
    revalidatePath("/recruiter/applications");
    return {
      success: true,
      message: "Application submitted.",
      redirectTo: `/candidate/applications/${application.id}`,
    };
  } catch (error) {
    return applyFailure(error);
  }
}

export async function withdrawApplicationAction(
  applicationId: string,
): Promise<ApplicationActionResult> {
  const actor = await candidateActor("/candidate/applications");

  try {
    await withdrawJobApplication(getPrismaClient(), actor, applicationId);
    revalidateCandidateViews(undefined, applicationId);
    revalidatePath("/recruiter/applications");
    return { success: true, message: "Application withdrawn." };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function transitionApplicationAction(
  applicationId: string,
  targetStatus: unknown,
): Promise<ApplicationActionResult> {
  const actor = await recruiterActor("/recruiter/applications");
  const parsed = recruiterStatusActionSchema.safeParse(targetStatus);

  if (!parsed.success) {
    return {
      success: false,
      message: "That action is not available for this application right now.",
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
    revalidatePath("/candidate/applications");
    return { success: true, message: "Application updated." };
  } catch (error) {
    return mutationFailure(error);
  }
}
