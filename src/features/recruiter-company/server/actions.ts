"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  companySchema,
  recruiterProfileSchema,
} from "@/features/recruiter-company/schemas";
import {
  createRecruiterCompany,
  publishRecruiterCompany,
  RecruiterCompanyMutationError,
  unpublishRecruiterCompany,
  updateRecruiterCompany,
  upsertRecruiterProfile,
} from "@/features/recruiter-company/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type RecruiterCompanyActionResult =
  | { success: true; message: string; redirectTo?: string }
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

async function recruiterActor(callbackPath: string) {
  const session = await requireRole("RECRUITER", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

function mutationFailure(error: unknown): RecruiterCompanyActionResult {
  if (error instanceof RecruiterCompanyMutationError) {
    if (error.code === "INCOMPLETE") {
      return {
        success: false,
        message: `Complete these fields before publishing: ${error.details?.join(", ")}.`,
      };
    }

    if (error.code === "NOT_FOUND" || error.code === "FORBIDDEN") {
      return {
        success: false,
        message: "That company was not found or is not available to manage.",
      };
    }
  }

  return {
    success: false,
    message: "We could not save that change. Please try again.",
  };
}

function revalidateRecruiterWorkspace(companyId?: string, slug?: string) {
  revalidatePath("/recruiter/dashboard");
  revalidatePath("/recruiter/profile");
  revalidatePath("/recruiter/companies");
  revalidatePath("/companies");
  if (companyId) revalidatePath(`/recruiter/companies/${companyId}`);
  if (slug) revalidatePath(`/companies/${slug}`);
}

export async function saveRecruiterProfileAction(
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor("/recruiter/profile/edit");
  const parsed = recruiterProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await upsertRecruiterProfile(getPrismaClient(), actor, parsed.data);
    revalidateRecruiterWorkspace();
    return {
      success: true,
      message: "Recruiter profile saved.",
      redirectTo: "/recruiter/profile",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function createCompanyAction(
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor("/recruiter/companies/new");
  const parsed = companySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    const company = await createRecruiterCompany(
      getPrismaClient(),
      actor,
      parsed.data,
    );
    revalidateRecruiterWorkspace(company.id);
    return {
      success: true,
      message: "Company created. You are its owner.",
      redirectTo: `/recruiter/companies/${company.id}`,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function updateCompanyAction(
  companyId: string,
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}/edit`);
  const parsed = companySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await updateRecruiterCompany(
      getPrismaClient(),
      actor,
      companyId,
      parsed.data,
    );
    revalidateRecruiterWorkspace(companyId);
    return {
      success: true,
      message: "Company details saved.",
      redirectTo: `/recruiter/companies/${companyId}`,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function publishCompanyAction(companyId: string) {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}`);

  try {
    const company = await publishRecruiterCompany(
      getPrismaClient(),
      actor,
      companyId,
    );
    revalidateRecruiterWorkspace(companyId, company.slug);
    return { success: true, message: "Company profile published." } as const;
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function unpublishCompanyAction(companyId: string) {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}`);

  try {
    const company = await unpublishRecruiterCompany(
      getPrismaClient(),
      actor,
      companyId,
    );
    revalidateRecruiterWorkspace(companyId, company.slug);
    return { success: true, message: "Company profile unpublished." } as const;
  } catch (error) {
    return mutationFailure(error);
  }
}
