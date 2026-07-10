"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/features/auth/server/session";
import { JOB_LIFECYCLE_ACTIONS } from "@/features/jobs/lifecycle";
import {
  jobContentSchema,
  jobCreateSchema,
  skillSchema,
} from "@/features/jobs/schemas";
import {
  addJobSkill,
  createJob,
  JobMutationError,
  removeJobSkill,
  transitionJob,
  updateJob,
} from "@/features/jobs/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type JobActionResult =
  | { success: true; message: string; redirectTo?: string }
  | { success: false; message: string; fieldErrors?: FieldErrors };

const lifecycleActionSchema = z.enum(JOB_LIFECYCLE_ACTIONS);

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

async function recruiterActor(callbackPath: string) {
  const session = await requireRole("RECRUITER", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

function mutationFailure(error: unknown): JobActionResult {
  if (error instanceof JobMutationError) {
    if (error.code === "INCOMPLETE") {
      return {
        success: false,
        message: `Resolve these before publishing: ${error.details?.join(", ")}.`,
      };
    }
    if (error.code === "DUPLICATE_SKILL") {
      return {
        success: false,
        message: "That skill is already required for this job.",
        fieldErrors: { name: "Choose a skill that is not already listed." },
      };
    }
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: "That action is not available for this job right now.",
      };
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: "That job was not found or is not available to manage.",
      };
    }
  }

  return {
    success: false,
    message: "We could not save that change. Please try again.",
  };
}

function revalidateJobViews(jobId?: string, companyId?: string) {
  revalidatePath("/recruiter/jobs");
  revalidatePath("/recruiter/dashboard");
  if (jobId) {
    revalidatePath(`/recruiter/jobs/${jobId}`);
    revalidatePath(`/recruiter/jobs/${jobId}/edit`);
  }
  if (companyId) revalidatePath(`/recruiter/companies/${companyId}`);
  // Public discovery surfaces that depend on published jobs.
  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function createJobAction(
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor("/recruiter/jobs/new");
  const parsed = jobCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const job = await createJob(getPrismaClient(), actor, parsed.data);
    revalidateJobViews(job.id, parsed.data.companyId);
    return {
      success: true,
      message: "Draft job created.",
      redirectTo: `/recruiter/jobs/${job.id}`,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateJobAction(
  jobId: string,
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}/edit`);
  const parsed = jobContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await updateJob(getPrismaClient(), actor, jobId, parsed.data);
    revalidateJobViews(jobId);
    return {
      success: true,
      message: "Job details saved.",
      redirectTo: `/recruiter/jobs/${jobId}`,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function transitionJobAction(
  jobId: string,
  action: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);
  const parsed = lifecycleActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      success: false,
      message: "That action is not available for this job right now.",
    };
  }

  try {
    await transitionJob(getPrismaClient(), actor, jobId, parsed.data);
    revalidateJobViews(jobId);
    const message =
      parsed.data === "publish"
        ? "Job published."
        : parsed.data === "close"
          ? "Job closed."
          : "Job archived.";
    return { success: true, message };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function addJobSkillAction(
  jobId: string,
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);
  const parsed = skillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a valid skill.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await addJobSkill(getPrismaClient(), actor, jobId, parsed.data.name);
    revalidateJobViews(jobId);
    return { success: true, message: "Skill added." };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function removeJobSkillAction(
  jobId: string,
  skillId: string,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);

  try {
    await removeJobSkill(getPrismaClient(), actor, jobId, skillId);
    revalidateJobViews(jobId);
    return { success: true, message: "Skill removed." };
  } catch (error) {
    return mutationFailure(error);
  }
}
