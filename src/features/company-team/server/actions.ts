"use server";

import { revalidateLocalizedPath } from "@/i18n/revalidate";
import { getRequestDictionary } from "@/i18n/server";
import { requireRole } from "@/features/auth/server/session";
import {
  createInviteRecruiterSchema,
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

type TeamMessages = Awaited<
  ReturnType<typeof getRequestDictionary>
>["dictionary"]["recruiter"]["team"];

function mutationFailure(
  error: unknown,
  messages: TeamMessages,
): CompanyTeamActionResult {
  if (error instanceof CompanyTeamMutationError) {
    const errorMessages: Partial<Record<typeof error.code, string>> = {
      NOT_FOUND: messages.action.notFound,
      FORBIDDEN: messages.action.forbidden,
      INVITEE_NOT_ELIGIBLE: messages.action.accountRequired,
      SELF_INVITE: messages.action.selfInvite,
      ALREADY_MEMBER: messages.action.alreadyMember,
      DUPLICATE_INVITATION: messages.action.duplicateInvitation,
      INVITATION_NOT_ACTIVE: messages.action.inactiveInvitation,
      INVITATION_EXPIRED: messages.action.expiredInvitation,
      TARGET_NOT_ELIGIBLE: messages.action.ineligible,
      SELF_TARGET: messages.action.selfTarget,
      LAST_OWNER: messages.finalOwner,
      CONFLICT: messages.action.conflict,
    };
    return {
      success: false,
      message: errorMessages[error.code] ?? messages.action.failed,
    };
  }

  return {
    success: false,
    message: messages.action.failed,
  };
}

function invalidIdentifier(messages: TeamMessages): CompanyTeamActionResult {
  return { success: false, message: messages.action.invalid };
}

function revalidateTeam(companyId?: string) {
  revalidateLocalizedPath("/recruiter/dashboard");
  revalidateLocalizedPath("/recruiter/companies");
  revalidateLocalizedPath("/recruiter/invitations");
  revalidateLocalizedPath("/notifications");
  if (companyId) {
    revalidateLocalizedPath(`/recruiter/companies/${companyId}`);
    revalidateLocalizedPath(`/recruiter/companies/${companyId}/team`);
  }
}

export async function inviteRecruiterAction(
  companyId: string,
  input: unknown,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.recruiter.team;
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedInput = createInviteRecruiterSchema(
    dictionary.validation,
  ).safeParse(input);
  if (!parsedCompanyId.success) return invalidIdentifier(messages);
  if (!parsedInput.success) {
    return {
      success: false,
      message: messages.action.invalidEmail,
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
    return { success: true, message: messages.action.sent };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function acceptCompanyInvitationAction(
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/invitations");
  const messages = (await getRequestDictionary()).dictionary.recruiter.team;
  const parsed = teamEntityIdSchema.safeParse(invitationId);
  if (!parsed.success) return invalidIdentifier(messages);
  try {
    const result = await acceptCompanyInvitation(
      getPrismaClient(),
      actor,
      parsed.data,
    );
    revalidateTeam(result.companyId);
    return {
      success: true,
      message: messages.action.accepted,
      redirectTo: `/recruiter/companies/${result.companyId}`,
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function declineCompanyInvitationAction(
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/invitations");
  const messages = (await getRequestDictionary()).dictionary.recruiter.team;
  const parsed = teamEntityIdSchema.safeParse(invitationId);
  if (!parsed.success) return invalidIdentifier(messages);
  try {
    await declineCompanyInvitation(getPrismaClient(), actor, parsed.data);
    revalidateTeam();
    return { success: true, message: messages.action.declined };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

async function runOwnerMembershipAction(
  companyId: string,
  membershipId: string,
  callback: typeof promoteCompanyMember,
  successMessage: keyof TeamMessages["action"],
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const messages = (await getRequestDictionary()).dictionary.recruiter.team;
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedMembershipId = teamEntityIdSchema.safeParse(membershipId);
  if (!parsedCompanyId.success || !parsedMembershipId.success) {
    return invalidIdentifier(messages);
  }
  try {
    await callback(
      getPrismaClient(),
      actor,
      parsedCompanyId.data,
      parsedMembershipId.data,
    );
    revalidateTeam(parsedCompanyId.data);
    return { success: true, message: messages.action[successMessage] };
  } catch (error) {
    return mutationFailure(error, messages);
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
    "promoted",
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
    "demoted",
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
    "removed",
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
    "transferred",
  );
}

export async function revokeCompanyInvitationAction(
  companyId: string,
  invitationId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const messages = (await getRequestDictionary()).dictionary.recruiter.team;
  const parsedCompanyId = teamEntityIdSchema.safeParse(companyId);
  const parsedInvitationId = teamEntityIdSchema.safeParse(invitationId);
  if (!parsedCompanyId.success || !parsedInvitationId.success) {
    return invalidIdentifier(messages);
  }
  try {
    await revokeCompanyInvitation(
      getPrismaClient(),
      actor,
      parsedCompanyId.data,
      parsedInvitationId.data,
    );
    revalidateTeam(parsedCompanyId.data);
    return { success: true, message: messages.action.revoked };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}

export async function leaveCompanyAction(
  companyId: string,
): Promise<CompanyTeamActionResult> {
  const actor = await recruiterActor("/recruiter/companies");
  const messages = (await getRequestDictionary()).dictionary.recruiter.team;
  const parsed = teamEntityIdSchema.safeParse(companyId);
  if (!parsed.success) return invalidIdentifier(messages);
  try {
    await leaveCompany(getPrismaClient(), actor, parsed.data);
    revalidateTeam(parsed.data);
    return {
      success: true,
      message: messages.action.left,
      redirectTo: "/recruiter/companies",
    };
  } catch (error) {
    return mutationFailure(error, messages);
  }
}
