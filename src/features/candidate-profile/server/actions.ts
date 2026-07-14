"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import type { CandidateDictionary } from "@/i18n/dictionary";
import { getRequestDictionary } from "@/i18n/server";
import { requireRole } from "@/features/auth/server/session";
import { createCandidateProfileSchemas } from "@/features/candidate-profile/schemas";
import {
  addCandidateSkill,
  CandidateProfileMutationError,
  createCandidateEducation,
  createCandidateExperience,
  deleteCandidateEducation,
  deleteCandidateExperience,
  removeCandidateSkill,
  updateCandidateEducation,
  updateCandidateExperience,
  upsertCandidateProfile,
} from "@/features/candidate-profile/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type ProfileActionResult =
  | {
      success: true;
      message: string;
      redirectTo?: "/candidate/profile";
      feedbackCode?: ProfileFeedbackCode;
    }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
    };

export type ProfileFeedbackCode =
  | "basic-saved"
  | "education-added"
  | "education-updated"
  | "experience-added"
  | "experience-updated";

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

type ProfileMessages = CandidateDictionary["profile"]["actions"];

function mutationFailure(
  error: unknown,
  messages: ProfileMessages,
): ProfileActionResult {
  if (
    error instanceof CandidateProfileMutationError &&
    error.code === "DUPLICATE_SKILL"
  ) {
    return {
      success: false,
      message: messages.duplicateSkill,
      fieldErrors: { name: messages.duplicateSkillField },
    };
  }

  if (
    error instanceof CandidateProfileMutationError &&
    error.code === "NOT_FOUND"
  ) {
    return {
      success: false,
      message: messages.recordUnavailable,
    };
  }

  return {
    success: false,
    message: messages.saveFailed,
  };
}

async function candidateActor(callbackPath: string) {
  const session = await requireRole("CANDIDATE", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

function revalidateCandidateProfile() {
  revalidateLocalizedPath("/candidate/profile");
  revalidateLocalizedPath("/candidate/dashboard");
}

export async function saveBasicProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/edit");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).basicProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await upsertCandidateProfile(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: messages.basicSaved,
      redirectTo: "/candidate/profile",
      feedbackCode: "basic-saved",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function createEducationAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/education/new");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).educationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await createCandidateEducation(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: messages.educationAdded,
      redirectTo: "/candidate/profile",
      feedbackCode: "education-added",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function updateEducationAction(
  educationId: string,
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor(
    `/candidate/profile/education/${educationId}/edit`,
  );
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).educationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await updateCandidateEducation(
      getPrismaClient(),
      actor,
      educationId,
      parsed.data,
    );
    revalidateCandidateProfile();
    return {
      success: true,
      message: messages.educationUpdated,
      redirectTo: "/candidate/profile",
      feedbackCode: "education-updated",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function deleteEducationAction(educationId: string) {
  const actor = await candidateActor("/candidate/profile");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;

  try {
    await deleteCandidateEducation(getPrismaClient(), actor, educationId);
    revalidateCandidateProfile();
    return { success: true, message: messages.educationRemoved } as const;
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function createExperienceAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/experience/new");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).experienceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await createCandidateExperience(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: messages.experienceAdded,
      redirectTo: "/candidate/profile",
      feedbackCode: "experience-added",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function updateExperienceAction(
  experienceId: string,
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor(
    `/candidate/profile/experience/${experienceId}/edit`,
  );
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).experienceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await updateCandidateExperience(
      getPrismaClient(),
      actor,
      experienceId,
      parsed.data,
    );
    revalidateCandidateProfile();
    return {
      success: true,
      message: messages.experienceUpdated,
      redirectTo: "/candidate/profile",
      feedbackCode: "experience-updated",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function deleteExperienceAction(experienceId: string) {
  const actor = await candidateActor("/candidate/profile");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;

  try {
    await deleteCandidateExperience(getPrismaClient(), actor, experienceId);
    revalidateCandidateProfile();
    return { success: true, message: messages.experienceRemoved } as const;
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function addSkillAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;
  const parsed = createCandidateProfileSchemas(
    dictionary.validation,
    dictionary.candidate,
  ).skillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalidSkill,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await addCandidateSkill(getPrismaClient(), actor, parsed.data.name);
    revalidateCandidateProfile();
    return { success: true, message: messages.skillAdded };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function removeSkillAction(skillId: string) {
  const actor = await candidateActor("/candidate/profile");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.candidate.profile.actions;

  try {
    await removeCandidateSkill(getPrismaClient(), actor, skillId);
    revalidateCandidateProfile();
    return { success: true, message: messages.skillRemoved } as const;
  } catch (error) {
    return mutationFailure(error, messages);
  }
}
