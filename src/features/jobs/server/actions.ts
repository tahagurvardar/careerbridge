"use server";

import { z } from "zod";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getRequestDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { requireRole } from "@/features/auth/server/session";
import { JOB_LIFECYCLE_ACTIONS } from "@/features/jobs/lifecycle";
import { createJobSchemas } from "@/features/jobs/schemas";
import { createCandidateProfileSchemas } from "@/features/candidate-profile/schemas";
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

type JobsMessages = Awaited<
  ReturnType<typeof getRequestDictionary>
>["dictionary"]["recruiter"]["jobs"];

function localizeRequirement(detail: string, messages: JobsMessages) {
  const requirementLabels: Record<string, string> = {
    "Publish the company first": messages.workspace.publishCompanyFirst,
    "Job title": messages.form.title,
    Summary: messages.form.summary,
    Description: messages.form.description,
    Responsibilities: messages.form.responsibilities,
    Requirements: messages.form.requirements,
    Location: messages.form.location,
    "Employment type": messages.form.employmentType,
    "Workplace type": messages.form.workplaceType,
    "Experience level": messages.form.experienceLevel,
    "At least one required skill": messages.workspace.atLeastOneSkill,
    "Application deadline cannot be in the past":
      messages.workspace.deadlinePast,
    "A published job needs at least one skill":
      messages.workspace.atLeastOneSkill,
  };
  return requirementLabels[detail] ?? messages.actions.invalid;
}

function mutationFailure(
  error: unknown,
  messages: JobsMessages,
): JobActionResult {
  if (error instanceof JobMutationError) {
    if (error.code === "INCOMPLETE") {
      return {
        success: false,
        message: formatMessage(messages.actions.incomplete, {
          fields: (error.details ?? [])
            .map((detail) => localizeRequirement(detail, messages))
            .join(", "),
        }),
      };
    }
    if (error.code === "DUPLICATE_SKILL") {
      return {
        success: false,
        message: messages.actions.duplicateSkill,
        fieldErrors: { name: messages.actions.duplicateSkillField },
      };
    }
    if (error.code === "INVALID_TRANSITION") {
      return {
        success: false,
        message: messages.actions.invalidTransition,
      };
    }
    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: messages.actions.unavailable,
      };
    }
  }

  return {
    success: false,
    message: messages.actions.failed,
  };
}

function revalidateJobViews(jobId?: string, companyId?: string) {
  revalidateLocalizedPath("/recruiter/jobs");
  revalidateLocalizedPath("/recruiter/dashboard");
  if (jobId) {
    revalidateLocalizedPath(`/recruiter/jobs/${jobId}`);
    revalidateLocalizedPath(`/recruiter/jobs/${jobId}/edit`);
  }
  if (companyId) revalidateLocalizedPath(`/recruiter/companies/${companyId}`);
  // Public discovery surfaces that depend on published jobs.
  revalidateLocalizedPath("/jobs");
  revalidateLocalizedPath("/");
}

export async function createJobAction(
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor("/recruiter/jobs/new");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.jobs;
  const parsed = createJobSchemas(
    dictionary.validation,
    dictionary.recruiter,
  ).jobCreateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.actions.invalid,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const job = await createJob(getPrismaClient(), actor, parsed.data);
    revalidateJobViews(job.id, parsed.data.companyId);
    return {
      success: true,
      message: messages.actions.created,
      redirectTo: `/recruiter/jobs/${job.id}`,
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function updateJobAction(
  jobId: string,
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}/edit`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.jobs;
  const parsed = createJobSchemas(
    dictionary.validation,
    dictionary.recruiter,
  ).jobContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.actions.invalid,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await updateJob(getPrismaClient(), actor, jobId, parsed.data);
    revalidateJobViews(jobId);
    return {
      success: true,
      message: messages.actions.saved,
      redirectTo: `/recruiter/jobs/${jobId}`,
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function transitionJobAction(
  jobId: string,
  action: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.jobs;
  const parsed = lifecycleActionSchema.safeParse(action);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.actions.invalidTransition,
    };
  }

  try {
    await transitionJob(getPrismaClient(), actor, jobId, parsed.data);
    revalidateJobViews(jobId);
    const message =
      parsed.data === "publish"
        ? messages.actions.published
        : parsed.data === "close"
          ? messages.actions.closed
          : messages.actions.archived;
    return { success: true, message };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function addJobSkillAction(
  jobId: string,
  input: unknown,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.jobs;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).skillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.actions.invalidSkill,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await addJobSkill(getPrismaClient(), actor, jobId, parsed.data.name);
    revalidateJobViews(jobId);
    return { success: true, message: messages.actions.skillAdded };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function removeJobSkillAction(
  jobId: string,
  skillId: string,
): Promise<JobActionResult> {
  const actor = await recruiterActor(`/recruiter/jobs/${jobId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.jobs;

  try {
    await removeJobSkill(getPrismaClient(), actor, jobId, skillId);
    revalidateJobViews(jobId);
    return { success: true, message: messages.actions.skillRemoved };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}
