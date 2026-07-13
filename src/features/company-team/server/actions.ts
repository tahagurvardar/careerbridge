"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/features/auth/server/session";
import {
  inviteRecruiterSchema,
  teamEntityIdSchema,
} from "@/features/company-team/schemas";
import {
  acceptCompanyInvitation,
  CompanyTeamMutationError,
  createCompanyInvitation,
  declineCompanyInvitation,
  demoteCompanyOwner,
  leaveCompany,
  promoteCompanyMember,
  removeCompanyMember,
  revokeCompanyInvitation,
  transferCompanyOwnership,
} from "@/features/company-team/server/mutations";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type CompanyTeamActionResult =
  | { success: true; message: string; redirectTo?: string }
  | { success: false; message: string; fieldErrors?: FieldErrors };

async function recruiterActor(callbackPath: string) {
  const session = await requireRole("RECRUITER", callbackPath);
  return { userId: session.user.id, role: session.user.role } as const;
}

function mutationFailure(error: unknown): CompanyTeamActionResult {
  if (error instanceof CompanyTeamMutationError) {
    if (error.safeMessage) {
      return { success: false, message: error.safeMessage };
    }

    const messages: Partial<Record<typeof error.code, string>> = {
      NOT_FOUND: "That team record was not found or is not available to you.",
      FORBIDDEN: "You are not authorized to make that team change.",
      INVITEE_NOT_ELIGIBLE:
        "Invitations can only be sent to an existing Recruiter account.",
      SELF_INVITE: "You cannot invite yourself to this company.",
      ALREADY_MEMBER: "That recruiter is already a company member.",
      DUPLICATE_INVITATION:
        "That recruiter already has an active invitation to this company.",
      INVITATION_NOT_ACTIVE: "That invitation is no longer active.",
      INVITATION_EXPIRED: "That invitation has expired.",
      TARGET_NOT_ELIGIBLE: "That team member is not eligible for this change.",
      SELF_TARGET: "Use the leave-company action for your own membership.",
      LAST_OWNER: "A company must keep at least one owner.",
      CONFLICT: "The team changed at the same time. Refresh and try again.",
    };
    return {
      success: false,
      message:
        messages[error.code] ??
        "We could not save that team change. Please try again.",
    };
  }

  return {
    success: false,
    message: "We could not save that team change. Please try again.",
  };
}

function invalidIdentifier(): CompanyTeamActionResult {
  return { success: false, message: "That team record is not valid." };
}

function revalidateTeam(companyId?: string) {
  revalidatePath("/recruiter/dashboard");
  revalidatePath("/recruiter/companies");
  revalidatePath("/recruiter/invitations");
  revalidatePath("/notifications");
  if (companyId) {
    revalidatePath(`/recruiter/companies/${companyId}`);
    revalidatePath(`/recruiter/companies/${companyId}/team`);
  }
}

export async function inviteRecruiterAction(
  companyId: string,
  input: unknown,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedInput = inviteRecruiterSchema.safeParse(input);
  if (!parsedCompanyId.success) return invalidIdentifier();
  if (!parsedInput.success) {
    return {
      success: false,
      message: "Enter the email address of an existing Recruiter account.",
      fieldErrors: {
        email: parsedInput.error.flatten().fieldErrors.email?.[0],
      },
    };
  }

  try {
    await createCompanyInvitation(
      getPrismaClient(),
      actor,
      parsedCompanyId.data,
      parsedInput.data,
    );
    revalidateTeam(parsedCompanyId.data);
    return { success: true, message: "Invitation sent." };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function acceptCompanyInvitationAction(
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/invitations");
  const parsed = teamEntityIdSchema.safeParse(invitationId);
  if (!parsed.success) return invalidIdentifier();
  try {
    const result = await acceptCompanyInvitation(
      getPrismaClient(),
      actor,
      parsed.data,
    );
    revalidateTeam(result.companyId);
    return {
      success: true,
      message: "Invitation accepted. You are now a company member.",
      redirectTo: `/recruiter/companies/${result.companyId}`,
    };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function declineCompanyInvitationAction(
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/invitations");
  const parsed = teamEntityIdSchema.safeParse(invitationId);
  if (!parsed.success) return invalidIdentifier();
  try {
    await declineCompanyInvitation(getPrismaClient(), actor, parsed.data);
    revalidateTeam();
    return { success: true, message: "Invitation declined." };
  } catch (error) {
    return mutationFailure(error);
  }
}

async function runOwnerMembershipAction(
  companyId: string,
  membershipId: string,
  callback: typeof promoteCompanyMember,
  successMessage: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedMembershipId = teamEntityIdSchema.safeParse(membershipId);
  if (!parsedCompanyId.success || !parsedMembershipId.success) {
    return invalidIdentifier();
  }
  try {
    await callback(
      getPrismaClient(),
      actor,
      parsedCompanyId.data,
      parsedMembershipId.data,
    );
    revalidateTeam(parsedCompanyId.data);
    return { success: true, message: successMessage };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function promoteCompanyMemberAction(
  companyId: string,
  membershipId: string,
) {
  return runOwnerMembershipAction(
    companyId,
    membershipId,
    promoteCompanyMember,
    "Member promoted to owner.",
  );
}

export async function demoteCompanyOwnerAction(
  companyId: string,
  membershipId: string,
) {
  return runOwnerMembershipAction(
    companyId,
    membershipId,
    demoteCompanyOwner,
    "Owner demoted to member.",
  );
}

export async function removeCompanyMemberAction(
  companyId: string,
  membershipId: string,
) {
  return runOwnerMembershipAction(
    companyId,
    membershipId,
    removeCompanyMember,
    "Member removed from the company.",
  );
}

export async function transferCompanyOwnershipAction(
  companyId: string,
  membershipId: string,
) {
  return runOwnerMembershipAction(
    companyId,
    membershipId,
    transferCompanyOwnership,
    "Ownership transferred.",
  );
}

export async function revokeCompanyInvitationAction(
  companyId: string,
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedInvitationId = teamEntityIdSchema.safeParse(invitationId);
  if (!parsedCompanyId.success || !parsedInvitationId.success) {
    return invalidIdentifier();
  }
  try {
    await revokeCompanyInvitation(
      getPrismaClient(),
      actor,
      parsedCompanyId.data,
      parsedInvitationId.data,
    );
    revalidateTeam(parsedCompanyId.data);
    return { success: true, message: "Invitation revoked." };
  } catch (error) {
    return mutationFailure(error);
  }
}

export async function leaveCompanyAction(
  companyId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const parsed = teamEntityIdSchema.safeParse(companyId);
  if (!parsed.success) return invalidIdentifier();
  try {
    await leaveCompany(getPrismaClient(), actor, parsed.data);
    revalidateTeam(parsed.data);
    return {
      success: true,
      message: "You left the company.",
      redirectTo: "/recruiter/companies",
    };
  } catch (error) {
    return mutationFailure(error);
  }
}
