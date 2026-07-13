"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  CANDIDATE_INTERVIEW_CONFLICT_MESSAGE,
  ORGANIZER_INTERVIEW_CONFLICT_MESSAGE,
  STALE_INTERVIEW_MESSAGE,
  type InterviewResponseValue,
} from "@/features/interviews/interviews";
import {
  buildInterviewScheduleSchema,
  expectedVersionSchema,
} from "@/features/interviews/schemas";
import {
  cancelInterview,
  completeInterview,
  InterviewMutationError,
  rescheduleInterview,
  respondToInterview,
  scheduleInterview,
} from "@/features/interviews/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

// Server Actions re-resolve the acting user from the session on every call.
// The browser supplies only opaque ids, validated schedule fields, and the
// expectedVersion concurrency token; statuses, organizers, recipients, and
// event types are all server literals inside the mutation layer.

type FieldErrors = Record<string, string | undefined>;

export type InterviewActionResult =
  | { success: true; message: string; interviewId?: string }
  | { success: false; message: string; fieldErrors?: FieldErrors };

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

function interviewFailure(error: unknown): InterviewActionResult {
  if (error instanceof InterviewMutationError) {
    switch (error.code) {
      case "CANDIDATE_CONFLICT":
        return {
          success: false,
          message: CANDIDATE_INTERVIEW_CONFLICT_MESSAGE,
        };
      case "ORGANIZER_CONFLICT":
        return {
          success: false,
          message: ORGANIZER_INTERVIEW_CONFLICT_MESSAGE,
        };
      case "STALE_VERSION":
      case "CONFLICT":
        return { success: false, message: STALE_INTERVIEW_MESSAGE };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: "Interviews are only available for active applications.",
        };
      case "INVALID_TRANSITION":
        return {
          success: false,
          message: "That action is not available for this interview right now.",
        };
      case "NOT_FOUND":
      case "FORBIDDEN":
        return {
          success: false,
          message: "That interview was not found or is not available.",
        };
    }
  }
  return {
    success: false,
    message: "We could not complete that action. Please try again.",
  };
}

function revalidateCandidateInterviewViews(
  interviewId?: string,
  applicationId?: string,
) {
  revalidatePath("/candidate/interviews");
  revalidatePath("/candidate/dashboard");
  if (interviewId) revalidatePath(`/candidate/interviews/${interviewId}`);
  if (applicationId) {
    revalidatePath(`/candidate/applications/${applicationId}`);
  }
}

function revalidateRecruiterInterviewViews(
  interviewId?: string,
  applicationId?: string,
) {
  revalidatePath("/recruiter/interviews");
  revalidatePath("/recruiter/dashboard");
  if (interviewId) revalidatePath(`/recruiter/interviews/${interviewId}`);
  if (applicationId) {
    revalidatePath(`/recruiter/applications/${applicationId}`);
  }
}

export async function scheduleInterviewAction(
  applicationId: string,
  input: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(
    `/recruiter/applications/${applicationId}`,
  );
  const parsed = buildInterviewScheduleSchema(new Date()).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const interview = await scheduleInterview(
      getPrismaClient(),
      actor,
      applicationId,
      parsed.data,
    );
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    revalidateCandidateInterviewViews(interview.id, interview.applicationId);
    return {
      success: true,
      message: "Interview scheduled.",
      interviewId: interview.id,
    };
  } catch (error) {
    return interviewFailure(error);
  }
}

async function respondToInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
  response: InterviewResponseValue,
): Promise<InterviewActionResult> {
  const actor = await candidateActor(`/candidate/interviews/${interviewId}`);
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: STALE_INTERVIEW_MESSAGE };
  }

  try {
    const interview = await respondToInterview(
      getPrismaClient(),
      actor,
      interviewId,
      parsedVersion.data,
      response,
    );
    revalidateCandidateInterviewViews(interview.id, interview.applicationId);
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    return {
      success: true,
      message:
        response === "ACCEPTED" ? "Interview accepted." : "Interview declined.",
    };
  } catch (error) {
    return interviewFailure(error);
  }
}

/** Explicit accept operation; the resulting status is a server literal. */
export async function acceptInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  return respondToInterviewAction(interviewId, expectedVersion, "ACCEPTED");
}

/** Explicit decline operation; the resulting status is a server literal. */
export async function declineInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  return respondToInterviewAction(interviewId, expectedVersion, "DECLINED");
}

export async function rescheduleInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
  input: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(`/recruiter/interviews/${interviewId}`);
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: STALE_INTERVIEW_MESSAGE };
  }
  const parsed = buildInterviewScheduleSchema(new Date()).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const interview = await rescheduleInterview(
      getPrismaClient(),
      actor,
      interviewId,
      parsedVersion.data,
      parsed.data,
    );
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    revalidateCandidateInterviewViews(interview.id, interview.applicationId);
    return { success: true, message: "Interview rescheduled." };
  } catch (error) {
    return interviewFailure(error);
  }
}

export async function cancelInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(`/recruiter/interviews/${interviewId}`);
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: STALE_INTERVIEW_MESSAGE };
  }

  try {
    const interview = await cancelInterview(
      getPrismaClient(),
      actor,
      interviewId,
      parsedVersion.data,
    );
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    revalidateCandidateInterviewViews(interview.id, interview.applicationId);
    return { success: true, message: "Interview canceled." };
  } catch (error) {
    return interviewFailure(error);
  }
}

export async function completeInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(`/recruiter/interviews/${interviewId}`);
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: STALE_INTERVIEW_MESSAGE };
  }

  try {
    const interview = await completeInterview(
      getPrismaClient(),
      actor,
      interviewId,
      parsedVersion.data,
    );
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    return { success: true, message: "Interview marked completed." };
  } catch (error) {
    return interviewFailure(error);
  }
}
