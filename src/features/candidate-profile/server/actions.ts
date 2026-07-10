"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  basicProfileSchema,
  educationSchema,
  experienceSchema,
  skillSchema,
} from "@/features/candidate-profile/schemas";
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
    }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
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

function mutationFailure(error: unknown): ProfileActionResult {
  if (
    error instanceof CandidateProfileMutationError &&
    error.code === "DUPLICATE_SKILL"
  ) {
    return {
      success: false,
      message: "That skill is already on your profile.",
      fieldErrors: { name: "Choose a skill that is not already listed." },
    };
  }

  if (
    error instanceof CandidateProfileMutationError &&
    error.code === "NOT_FOUND"
  ) {
    return {
      success: false,
      message: "That profile record was not found or is no longer available.",
    };
  }

  return {
    success: false,
    message: "We could not save that change. Please try again.",
  };
}

async function candidateActor(callbackPath: string) {
  const session = await requireRole("CANDIDATE", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

function revalidateCandidateProfile() {
  revalidatePath("/candidate/profile");
  revalidatePath("/candidate/dashboard");
}

export async function saveBasicProfileAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/edit");
  const parsed = basicProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await upsertCandidateProfile(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: "Professional information saved.",
      redirectTo: "/candidate/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function createEducationAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/education/new");
  const parsed = educationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await createCandidateEducation(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: "Education added.",
      redirectTo: "/candidate/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateEducationAction(
  educationId: string,
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor(
    `/candidate/profile/education/${educationId}/edit`,
  );
  const parsed = educationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
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
      message: "Education updated.",
      redirectTo: "/candidate/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function deleteEducationAction(educationId: string) {
  const actor = await candidateActor("/candidate/profile");

  try {
    await deleteCandidateEducation(getPrismaClient(), actor, educationId);
    revalidateCandidateProfile();
    return { success: true, message: "Education removed." } as const;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function createExperienceAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile/experience/new");
  const parsed = experienceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await createCandidateExperience(getPrismaClient(), actor, parsed.data);
    revalidateCandidateProfile();
    return {
      success: true,
      message: "Experience added.",
      redirectTo: "/candidate/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateExperienceAction(
  experienceId: string,
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor(
    `/candidate/profile/experience/${experienceId}/edit`,
  );
  const parsed = experienceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
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
      message: "Experience updated.",
      redirectTo: "/candidate/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function deleteExperienceAction(experienceId: string) {
  const actor = await candidateActor("/candidate/profile");

  try {
    await deleteCandidateExperience(getPrismaClient(), actor, experienceId);
    revalidateCandidateProfile();
    return { success: true, message: "Experience removed." } as const;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function addSkillAction(
  input: unknown,
): Promise<ProfileActionResult> {
  const actor = await candidateActor("/candidate/profile");
  const parsed = skillSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Enter a valid skill.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await addCandidateSkill(getPrismaClient(), actor, parsed.data.name);
    revalidateCandidateProfile();
    return { success: true, message: "Skill added." };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function removeSkillAction(skillId: string) {
  const actor = await candidateActor("/candidate/profile");

  try {
    await removeCandidateSkill(getPrismaClient(), actor, skillId);
    revalidateCandidateProfile();
    return { success: true, message: "Skill removed." } as const;
  } catch (error) {
    return mutationFailure(error);
  }
}
