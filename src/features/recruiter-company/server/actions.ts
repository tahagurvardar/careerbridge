"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getRequestDictionary } from "@/i18n/server";
import { formatMessage } from "@/i18n/translate";
import { requireRole } from "@/features/auth/server/session";
import { createRecruiterCompanySchemas } from "@/features/recruiter-company/schemas";
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

function mutationFailure(
  error: unknown,
  messages: Awaited<
    ReturnType<typeof getRequestDictionary>
  >["dictionary"]["recruiter"]["actions"],
): RecruiterCompanyActionResult {
  if (error instanceof RecruiterCompanyMutationError) {
    if (error.code === "INCOMPLETE") {
      return {
        success: false,
        message: formatMessage(messages.incomplete, {
          fields: error.details?.join(", ") ?? "",
        }),
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

function revalidateRecruiterWorkspace(companyId?: string, slug?: string) {
  revalidateLocalizedPath("/recruiter/dashboard");
  revalidateLocalizedPath("/recruiter/profile");
  revalidateLocalizedPath("/recruiter/companies");
  revalidateLocalizedPath("/companies");
  if (companyId) revalidateLocalizedPath(`/recruiter/companies/${companyId}`);
  if (slug) revalidateLocalizedPath(`/companies/${slug}`);
}

export async function saveRecruiterProfileAction(
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor("/recruiter/profile/edit");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.actions;
  const parsed = createRecruiterCompanySchemas(
    dictionary.validation,
    dictionary.recruiter,
  ).recruiterProfileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalid,
      fieldErrors: firstFieldErrors(parsed.error),
    };
  }

  try {
    await upsertRecruiterProfile(getPrismaClient(), actor, parsed.data);
    revalidateRecruiterWorkspace();
    return {
      success: true,
      message: messages.profileSaved,
      redirectTo: "/recruiter/profile",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function createCompanyAction(
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor("/recruiter/companies/new");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.actions;
  const parsed = createRecruiterCompanySchemas(
    dictionary.validation,
    dictionary.recruiter,
  ).companySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalid,
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
      message: messages.companyCreated,
      redirectTo: `/recruiter/companies/${company.id}`,
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function updateCompanyAction(
  companyId: string,
  input: unknown,
): Promise<RecruiterCompanyActionResult> {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}/edit`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.actions;
  const parsed = createRecruiterCompanySchemas(
    dictionary.validation,
    dictionary.recruiter,
  ).companySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.invalid,
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
      message: messages.companySaved,
      redirectTo: `/recruiter/companies/${companyId}`,
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function publishCompanyAction(companyId: string) {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.actions;

  try {
    const company = await publishRecruiterCompany(
      getPrismaClient(),
      actor,
      companyId,
    );
    revalidateRecruiterWorkspace(companyId, company.slug);
    return { success: true, message: messages.companyPublished } as const;
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function unpublishCompanyAction(companyId: string) {
  const actor = await recruiterActor(`/recruiter/companies/${companyId}`);
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.actions;

  try {
    const company = await unpublishRecruiterCompany(
      getPrismaClient(),
      actor,
      companyId,
    );
    revalidateRecruiterWorkspace(companyId, company.slug);
    return { success: true, message: messages.companyUnpublished } as const;
  } catch (error) {
    return mutationFailure(error, messages);
  }
}
