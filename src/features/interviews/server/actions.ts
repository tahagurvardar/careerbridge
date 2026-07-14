"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import type { InterviewsDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";
import { requireRole } from "@/features/auth/server/session";
import type { InterviewResponseValue } from "@/features/interviews/interviews";
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

type InterviewMessages = InterviewsDictionary["actions"];

function interviewFailure(
  error: unknown,
  messages: InterviewMessages,
): InterviewActionResult {
  if (error instanceof InterviewMutationError) {
    switch (error.code) {
      case "CANDIDATE_CONFLICT":
        return {
          success: false,
          message: messages.candidateConflict,
        };
      case "ORGANIZER_CONFLICT":
        return {
          success: false,
          message: messages.organizerConflict,
        };
      case "STALE_VERSION":
      case "CONFLICT":
        return { success: false, message: messages.stale };
      case "NOT_ELIGIBLE":
        return {
          success: false,
          message: messages.notEligible,
        };
      case "INVALID_TRANSITION":
        return {
          success: false,
          message: messages.invalidTransition,
        };
      case "NOT_FOUND":
      case "FORBIDDEN":
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

function revalidateCandidateInterviewViews(
  interviewId?: string,
  applicationId?: string,
) {
  revalidateLocalizedPath("/candidate/interviews");
  revalidateLocalizedPath("/candidate/dashboard");
  if (interviewId)
    revalidateLocalizedPath(`/candidate/interviews/${interviewId}`);
  if (applicationId) {
    revalidateLocalizedPath(`/candidate/applications/${applicationId}`);
  }
}

function revalidateRecruiterInterviewViews(
  interviewId?: string,
  applicationId?: string,
) {
  revalidateLocalizedPath("/recruiter/interviews");
  revalidateLocalizedPath("/recruiter/dashboard");
  if (interviewId)
    revalidateLocalizedPath(`/recruiter/interviews/${interviewId}`);
  if (applicationId) {
    revalidateLocalizedPath(`/recruiter/applications/${applicationId}`);
  }
}

export async function scheduleInterviewAction(
  applicationId: string,
  input: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(
    `/recruiter/applications/${applicationId}`,
  );
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.interviews.actions;
  const parsed = buildInterviewScheduleSchema(
    new Date(),
    dictionary.interviews.scheduleForm.validation,
  ).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
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
      message: messages.scheduled,
      interviewId: interview.id,
    };
  } catch (error) {
    return interviewFailure(error, messages);
  }
}

async function respondToInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
  response: InterviewResponseValue,
): Promise<InterviewActionResult> {
  const actor = await candidateActor(`/candidate/interviews/${interviewId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.interviews.actions;
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: messages.stale };
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
      message: response === "ACCEPTED" ? messages.accepted : messages.declined,
    };
  } catch (error) {
    return interviewFailure(error, messages);
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
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.interviews.actions;
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: messages.stale };
  }
  const parsed = buildInterviewScheduleSchema(
    new Date(),
    dictionary.interviews.scheduleForm.validation,
  ).safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
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
    return { success: true, message: messages.rescheduled };
  } catch (error) {
    return interviewFailure(error, messages);
  }
}

export async function cancelInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(`/recruiter/interviews/${interviewId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.interviews.actions;
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: messages.stale };
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
    return { success: true, message: messages.canceled };
  } catch (error) {
    return interviewFailure(error, messages);
  }
}

export async function completeInterviewAction(
  interviewId: string,
  expectedVersion: unknown,
): Promise<InterviewActionResult> {
  const actor = await recruiterActor(`/recruiter/interviews/${interviewId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.interviews.actions;
  const parsedVersion = expectedVersionSchema.safeParse(expectedVersion);
  if (!parsedVersion.success) {
    return { success: false, message: messages.stale };
  }

  try {
    const interview = await completeInterview(
      getPrismaClient(),
      actor,
      interviewId,
      parsedVersion.data,
    );
    revalidateRecruiterInterviewViews(interview.id, interview.applicationId);
    return { success: true, message: messages.completed };
  } catch (error) {
    return interviewFailure(error, messages);
  }
}
