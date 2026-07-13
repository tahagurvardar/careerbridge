import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  CompanyMembershipEventType,
  CompanyMembershipRole,
} from "@/generated/prisma/enums";
import {
  buildInvitationActiveKey,
  computeInvitationExpiry,
  getDemotionBlock,
  getLeaveBlock,
  getOwnershipTransferBlock,
  getPromotionBlock,
  getRemovalBlock,
  INVITATION_ACCEPTANCE_ROLE,
  isInvitablePlatformRole,
  isInvitationExpired,
} from "@/features/company-team/team";
import type { ValidatedInviteRecruiter } from "@/features/company-team/schemas";
import { emitCompanyInvitationReceivedNotification } from "@/features/notifications/server/emit";
import {
  isRecruiterActor,
  type RecruiterActor,
} from "@/features/recruiter-company/authorization";

// Every mutation here re-resolves identity, Company OWNER authorization,
// target membership, invitation state, owner counts, and audit actors from the
// session and fresh transaction reads. The browser only ever supplies opaque
// ids and a normalized email — never a role, a status, a recipient, or an
// actor. Each domain change and its audit event (and, for invitation creation,
// its notification) commit or roll back together.

export type CompanyTeamMutationErrorCode =
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVITEE_NOT_ELIGIBLE"
  | "SELF_INVITE"
  | "ALREADY_MEMBER"
  | "DUPLICATE_INVITATION"
  | "INVITATION_NOT_ACTIVE"
  | "INVITATION_EXPIRED"
  | "TARGET_NOT_ELIGIBLE"
  | "SELF_TARGET"
  | "LAST_OWNER"
  | "CONFLICT";

export class CompanyTeamMutationError extends Error {
  constructor(
    readonly code: CompanyTeamMutationErrorCode,
    // Only ever a static string from the pure domain layer — safe to show.
    readonly safeMessage?: string,
  ) {
    super("Company team mutation failed.");
    this.name = "CompanyTeamMutationError";
  }
}

type Tx = Prisma.TransactionClient;

function assertRecruiter(actor: RecruiterActor) {
  if (!isRecruiterActor(actor)) {
    throw new CompanyTeamMutationError("FORBIDDEN");
  }
}

function isPrismaErrorCode(error: unknown, code: string) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

const SERIALIZABLE_ATTEMPTS = 3;

/**
 * Runs an owner-count-sensitive mutation under Serializable isolation with a
 * bounded retry on serialization aborts (P2034), matching the repository's
 * existing transaction pattern. A retry re-executes every authorization and
 * invariant check against fresh state, so it can never bypass the last-owner
 * rule; concurrent owner-reducing transactions that would write-skew past the
 * invariant are aborted by the database itself.
 */
async function runSerializable<T>(
  prisma: PrismaClient,
  run: (tx: Tx) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(run, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      if (
        attempt < SERIALIZABLE_ATTEMPTS - 1 &&
        isPrismaErrorCode(error, "P2034")
      ) {
        continue;
      }
      throw error;
    }
  }
  throw new CompanyTeamMutationError("CONFLICT");
}

/**
 * Re-authorizes the acting user as an OWNER of the Company. A Company the
 * caller does not own is indistinguishable from one that does not exist.
 */
async function requireOwnedCompany(
  tx: Tx,
  actorUserId: string,
  companyId: string,
) {
  const company = await tx.company.findFirst({
    where: {
      id: companyId,
      memberships: { some: { userId: actorUserId, role: "OWNER" } },
    },
    select: { id: true, name: true },
  });
  if (!company) {
    throw new CompanyTeamMutationError("NOT_FOUND");
  }
  return company;
}

/** OWNER re-authorization that also returns the acting membership row. */
async function requireOwnerMembership(
  tx: Tx,
  actorUserId: string,
  companyId: string,
) {
  const membership = await tx.companyMembership.findFirst({
    where: { companyId, userId: actorUserId, role: "OWNER" },
    select: { id: true },
  });
  if (!membership) {
    throw new CompanyTeamMutationError("NOT_FOUND");
  }
  return membership;
}

/** Resolves a target membership bound to the same Company, or NOT_FOUND. */
async function getTargetMembership(
  tx: Tx,
  companyId: string,
  membershipId: string,
) {
  const membership = await tx.companyMembership.findFirst({
    where: { id: membershipId, companyId },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { role: true } },
    },
  });
  if (!membership) {
    throw new CompanyTeamMutationError("NOT_FOUND");
  }
  return membership;
}

function countCompanyOwners(tx: Tx, companyId: string) {
  return tx.companyMembership.count({
    where: { companyId, role: "OWNER" },
  });
}

function createMembershipEvent(
  tx: Tx,
  data: {
    companyId: string;
    type: CompanyMembershipEventType;
    actorUserId?: string | null;
    subjectUserId?: string | null;
    invitationId?: string | null;
    fromRole?: CompanyMembershipRole | null;
    toRole?: CompanyMembershipRole | null;
  },
) {
  return tx.companyMembershipEvent.create({ data, select: { id: true } });
}

/**
 * Finalizes a PENDING invitation that is past its expiry: compare-and-set to
 * EXPIRED, clear the activeKey, and write exactly one INVITATION_EXPIRED audit
 * event (only the transition winner records it — the actor is null because
 * expiry is a system transition, not a user action). Returns whether this call
 * performed the transition.
 */
async function finalizeExpiredInvitation(
  tx: Tx,
  invitation: { id: string; companyId: string; inviteeUserId: string },
) {
  const result = await tx.companyInvitation.updateMany({
    where: { id: invitation.id, status: "PENDING" },
    data: { status: "EXPIRED", activeKey: null },
  });
  if (result.count !== 1) return false;

  await createMembershipEvent(tx, {
    companyId: invitation.companyId,
    type: "INVITATION_EXPIRED",
    actorUserId: null,
    subjectUserId: invitation.inviteeUserId,
    invitationId: invitation.id,
  });
  return true;
}

/**
 * Lazily finalizes expired invitations for one authorized read scope. This is
 * intentionally bounded to either an invitee or a Company; callers must
 * authorize that scope before invoking it. Compare-and-set updates make the
 * sweep safe when two page requests observe the same expired row.
 */
export async function expireCompanyInvitations(
  prisma: PrismaClient,
  scope: { companyId: string } | { inviteeUserId: string },
  now: Date = new Date(),
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const expired = await tx.companyInvitation.findMany({
      where: {
        ...scope,
        status: "PENDING",
        expiresAt: { lte: now },
      },
      select: { id: true, companyId: true, inviteeUserId: true },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
      take: 100,
    });

    let finalizedCount = 0;
    for (const invitation of expired) {
      if (await finalizeExpiredInvitation(tx, invitation)) {
        finalizedCount += 1;
      }
    }
    return finalizedCount;
  });
}

// ---------------------------------------------------------------------------
// Invitation creation
// ---------------------------------------------------------------------------

/**
 * OWNER-only invitation of an existing Recruiter account by normalized email.
 * The invitee is resolved server-side; a missing account, a Candidate account,
 * and an Admin account are all rejected with the same INVITEE_NOT_ELIGIBLE
 * code so the form cannot be used to probe which emails hold which kinds of
 * account. Invitation row, audit event, and the invitee's notification are
 * created in one transaction; the activeKey unique constraint is the
 * database-backed guard against concurrent duplicate invitations.
 */
export async function createCompanyInvitation(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  input: ValidatedInviteRecruiter,
): Promise<{ invitationId: string }> {
  assertRecruiter(actor);

  try {
    return await prisma.$transaction(async (tx) => {
      const company = await requireOwnedCompany(tx, actor.userId, companyId);

      const invitee = await tx.user.findUnique({
        where: { email: input.email },
        select: { id: true, role: true },
      });
      if (!invitee || !isInvitablePlatformRole(invitee.role)) {
        throw new CompanyTeamMutationError("INVITEE_NOT_ELIGIBLE");
      }
      if (invitee.id === actor.userId) {
        throw new CompanyTeamMutationError("SELF_INVITE");
      }

      const existingMembership = await tx.companyMembership.findUnique({
        where: {
          userId_companyId: { userId: invitee.id, companyId },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new CompanyTeamMutationError("ALREADY_MEMBER");
      }

      const now = new Date();
      const existingPending = await tx.companyInvitation.findFirst({
        where: { companyId, inviteeUserId: invitee.id, status: "PENDING" },
        select: {
          id: true,
          companyId: true,
          inviteeUserId: true,
          status: true,
          expiresAt: true,
        },
      });
      if (existingPending) {
        if (!isInvitationExpired(existingPending, now)) {
          throw new CompanyTeamMutationError("DUPLICATE_INVITATION");
        }
        // Replace the stale invitation: finalize it as EXPIRED first. Losing
        // the compare-and-set means a concurrent transition beat this
        // transaction — bail out instead of guessing at the new state.
        const finalized = await finalizeExpiredInvitation(tx, existingPending);
        if (!finalized) {
          throw new CompanyTeamMutationError("CONFLICT");
        }
      }

      const invitation = await tx.companyInvitation.create({
        data: {
          companyId,
          inviteeUserId: invitee.id,
          invitedByUserId: actor.userId,
          status: "PENDING",
          activeKey: buildInvitationActiveKey(companyId, invitee.id),
          expiresAt: computeInvitationExpiry(now),
        },
        select: { id: true },
      });

      await createMembershipEvent(tx, {
        companyId,
        type: "INVITATION_CREATED",
        actorUserId: actor.userId,
        subjectUserId: invitee.id,
        invitationId: invitation.id,
      });

      await emitCompanyInvitationReceivedNotification(tx, {
        invitationId: invitation.id,
        companyId,
        companyName: company.name,
        inviteeUserId: invitee.id,
        invitedByUserId: actor.userId,
      });

      return { invitationId: invitation.id };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw new CompanyTeamMutationError("DUPLICATE_INVITATION");
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Invitation responses (invitee) and revocation (owner)
// ---------------------------------------------------------------------------

/**
 * The invited Recruiter accepts their own active invitation. Ownership of the
 * invitation is part of the lookup (another user's invitation is
 * indistinguishable from a missing one), the platform role is re-read inside
 * the transaction, and the PENDING compare-and-set plus the CompanyMembership
 * unique constraint guarantee one membership under concurrent accepts.
 * Acceptance always grants MEMBER — the browser cannot choose a role.
 */
export async function acceptCompanyInvitation(
  prisma: PrismaClient,
  actor: RecruiterActor,
  invitationId: string,
): Promise<{ companyId: string }> {
  assertRecruiter(actor);

  try {
    return await prisma.$transaction(async (tx) => {
      const invitation = await tx.companyInvitation.findFirst({
        where: { id: invitationId, inviteeUserId: actor.userId },
        select: {
          id: true,
          companyId: true,
          inviteeUserId: true,
          status: true,
          expiresAt: true,
        },
      });
      if (!invitation) {
        throw new CompanyTeamMutationError("NOT_FOUND");
      }
      if (invitation.status !== "PENDING") {
        throw new CompanyTeamMutationError("INVITATION_NOT_ACTIVE");
      }

      const now = new Date();
      if (isInvitationExpired(invitation, now)) {
        throw new CompanyTeamMutationError("INVITATION_EXPIRED");
      }

      // The account's platform role may have changed since the invitation was
      // sent; only a current Recruiter can join a Company team.
      const user = await tx.user.findUnique({
        where: { id: actor.userId },
        select: { role: true },
      });
      if (!user || !isInvitablePlatformRole(user.role)) {
        throw new CompanyTeamMutationError("FORBIDDEN");
      }

      const existingMembership = await tx.companyMembership.findUnique({
        where: {
          userId_companyId: {
            userId: actor.userId,
            companyId: invitation.companyId,
          },
        },
        select: { id: true },
      });
      if (existingMembership) {
        throw new CompanyTeamMutationError("ALREADY_MEMBER");
      }

      const updated = await tx.companyInvitation.updateMany({
        where: { id: invitation.id, status: "PENDING" },
        data: { status: "ACCEPTED", respondedAt: now, activeKey: null },
      });
      if (updated.count !== 1) {
        throw new CompanyTeamMutationError("CONFLICT");
      }

      await tx.companyMembership.create({
        data: {
          userId: actor.userId,
          companyId: invitation.companyId,
          role: INVITATION_ACCEPTANCE_ROLE,
        },
        select: { id: true },
      });

      await createMembershipEvent(tx, {
        companyId: invitation.companyId,
        type: "INVITATION_ACCEPTED",
        actorUserId: actor.userId,
        subjectUserId: actor.userId,
        invitationId: invitation.id,
        toRole: INVITATION_ACCEPTANCE_ROLE,
      });

      return { companyId: invitation.companyId };
    });
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      throw new CompanyTeamMutationError("CONFLICT");
    }
    throw error;
  }
}

/**
 * The invited Recruiter declines their own active invitation. No membership is
 * created; the compare-and-set makes a repeated decline a no-op error rather
 * than a duplicate audit event.
 */
export async function declineCompanyInvitation(
  prisma: PrismaClient,
  actor: RecruiterActor,
  invitationId: string,
): Promise<void> {
  assertRecruiter(actor);

  await prisma.$transaction(async (tx) => {
    const invitation = await tx.companyInvitation.findFirst({
      where: { id: invitationId, inviteeUserId: actor.userId },
      select: {
        id: true,
        companyId: true,
        inviteeUserId: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!invitation) {
      throw new CompanyTeamMutationError("NOT_FOUND");
    }
    if (invitation.status !== "PENDING") {
      throw new CompanyTeamMutationError("INVITATION_NOT_ACTIVE");
    }

    const now = new Date();
    if (isInvitationExpired(invitation, now)) {
      throw new CompanyTeamMutationError("INVITATION_EXPIRED");
    }

    const updated = await tx.companyInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "DECLINED", respondedAt: now, activeKey: null },
    });
    if (updated.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId: invitation.companyId,
      type: "INVITATION_DECLINED",
      actorUserId: actor.userId,
      subjectUserId: actor.userId,
      invitationId: invitation.id,
    });
  });
}

/**
 * A Company OWNER revokes an active invitation belonging to that Company.
 * Invitations of other Companies are invisible; terminal invitations cannot be
 * revoked, and an expired one is reported as expired rather than revoked.
 */
export async function revokeCompanyInvitation(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  invitationId: string,
): Promise<void> {
  assertRecruiter(actor);

  await prisma.$transaction(async (tx) => {
    await requireOwnedCompany(tx, actor.userId, companyId);

    const invitation = await tx.companyInvitation.findFirst({
      where: { id: invitationId, companyId },
      select: {
        id: true,
        companyId: true,
        inviteeUserId: true,
        status: true,
        expiresAt: true,
      },
    });
    if (!invitation) {
      throw new CompanyTeamMutationError("NOT_FOUND");
    }
    if (invitation.status !== "PENDING") {
      throw new CompanyTeamMutationError("INVITATION_NOT_ACTIVE");
    }

    const now = new Date();
    if (isInvitationExpired(invitation, now)) {
      throw new CompanyTeamMutationError("INVITATION_EXPIRED");
    }

    const updated = await tx.companyInvitation.updateMany({
      where: { id: invitation.id, status: "PENDING" },
      data: { status: "REVOKED", respondedAt: now, activeKey: null },
    });
    if (updated.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: "INVITATION_REVOKED",
      actorUserId: actor.userId,
      subjectUserId: invitation.inviteeUserId,
      invitationId: invitation.id,
    });
  });
}

// ---------------------------------------------------------------------------
// Membership administration (owner-only)
// ---------------------------------------------------------------------------

/**
 * Promotes a same-Company MEMBER with a Recruiter account to OWNER. The
 * compare-and-set on the current role means a concurrent role change or
 * removal fails cleanly instead of applying twice.
 */
export async function promoteCompanyMember(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  membershipId: string,
): Promise<void> {
  assertRecruiter(actor);

  await runSerializable(prisma, async (tx) => {
    await requireOwnerMembership(tx, actor.userId, companyId);
    const target = await getTargetMembership(tx, companyId, membershipId);

    const block = getPromotionBlock({
      targetMembershipRole: target.role,
      targetPlatformRole: target.user.role,
    });
    if (block) {
      throw new CompanyTeamMutationError(block.code, block.message);
    }

    const updated = await tx.companyMembership.updateMany({
      where: { id: target.id, companyId, role: "MEMBER" },
      data: { role: "OWNER" },
    });
    if (updated.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: "MEMBER_PROMOTED_TO_OWNER",
      actorUserId: actor.userId,
      subjectUserId: target.userId,
      fromRole: "MEMBER",
      toRole: "OWNER",
    });
  });
}

/**
 * Demotes a same-Company OWNER to MEMBER. The owner count is read fresh inside
 * the Serializable transaction, so concurrent demotions cannot write-skew the
 * Company down to zero OWNERs.
 */
export async function demoteCompanyOwner(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  membershipId: string,
): Promise<void> {
  assertRecruiter(actor);

  await runSerializable(prisma, async (tx) => {
    await requireOwnerMembership(tx, actor.userId, companyId);
    const target = await getTargetMembership(tx, companyId, membershipId);
    const ownerCount = await countCompanyOwners(tx, companyId);

    const block = getDemotionBlock({
      targetMembershipRole: target.role,
      ownerCount,
    });
    if (block) {
      throw new CompanyTeamMutationError(block.code, block.message);
    }

    const updated = await tx.companyMembership.updateMany({
      where: { id: target.id, companyId, role: "OWNER" },
      data: { role: "MEMBER" },
    });
    if (updated.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: "OWNER_DEMOTED_TO_MEMBER",
      actorUserId: actor.userId,
      subjectUserId: target.userId,
      fromRole: "OWNER",
      toRole: "MEMBER",
    });
  });
}

/**
 * Removes another member of the same Company. Removing an OWNER requires that
 * at least one OWNER remains; self-removal is rejected in favor of the
 * explicit leave flow so the audit history stays truthful.
 */
export async function removeCompanyMember(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  membershipId: string,
): Promise<void> {
  assertRecruiter(actor);

  await runSerializable(prisma, async (tx) => {
    await requireOwnerMembership(tx, actor.userId, companyId);
    const target = await getTargetMembership(tx, companyId, membershipId);
    const ownerCount = await countCompanyOwners(tx, companyId);

    const block = getRemovalBlock({
      isSelf: target.userId === actor.userId,
      targetMembershipRole: target.role,
      ownerCount,
    });
    if (block) {
      throw new CompanyTeamMutationError(block.code, block.message);
    }

    const deleted = await tx.companyMembership.deleteMany({
      where: { id: target.id, companyId, role: target.role },
    });
    if (deleted.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: target.role === "OWNER" ? "OWNER_REMOVED" : "MEMBER_REMOVED",
      actorUserId: actor.userId,
      subjectUserId: target.userId,
      fromRole: target.role,
    });
  });
}

/**
 * Transfers ownership to an existing same-Company MEMBER with a Recruiter
 * account: the target is promoted first and the acting OWNER demoted second,
 * so the Company holds at least one OWNER at every point inside the
 * transaction. Both role changes and both audit events are atomic.
 */
export async function transferCompanyOwnership(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
  membershipId: string,
): Promise<void> {
  assertRecruiter(actor);

  await runSerializable(prisma, async (tx) => {
    const acting = await requireOwnerMembership(tx, actor.userId, companyId);
    const target = await getTargetMembership(tx, companyId, membershipId);

    const block = getOwnershipTransferBlock({
      isSelf: target.userId === actor.userId,
      targetMembershipRole: target.role,
      targetPlatformRole: target.user.role,
    });
    if (block) {
      throw new CompanyTeamMutationError(block.code, block.message);
    }

    const promoted = await tx.companyMembership.updateMany({
      where: { id: target.id, companyId, role: "MEMBER" },
      data: { role: "OWNER" },
    });
    if (promoted.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    const demoted = await tx.companyMembership.updateMany({
      where: { id: acting.id, companyId, role: "OWNER" },
      data: { role: "MEMBER" },
    });
    if (demoted.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: "MEMBER_PROMOTED_TO_OWNER",
      actorUserId: actor.userId,
      subjectUserId: target.userId,
      fromRole: "MEMBER",
      toRole: "OWNER",
    });
    await createMembershipEvent(tx, {
      companyId,
      type: "OWNER_DEMOTED_TO_MEMBER",
      actorUserId: actor.userId,
      subjectUserId: actor.userId,
      fromRole: "OWNER",
      toRole: "MEMBER",
    });
  });
}

/**
 * The authenticated user leaves their own membership, derived strictly from
 * the session. A MEMBER may always leave; an OWNER only while another OWNER
 * remains — the final OWNER can never leave. Personal notifications stay with
 * the user; every Company surface re-authorizes independently afterwards.
 */
export async function leaveCompany(
  prisma: PrismaClient,
  actor: RecruiterActor,
  companyId: string,
): Promise<void> {
  assertRecruiter(actor);

  await runSerializable(prisma, async (tx) => {
    const membership = await tx.companyMembership.findUnique({
      where: {
        userId_companyId: { userId: actor.userId, companyId },
      },
      select: { id: true, role: true },
    });
    if (!membership) {
      throw new CompanyTeamMutationError("NOT_FOUND");
    }

    const ownerCount = await countCompanyOwners(tx, companyId);
    const block = getLeaveBlock({
      membershipRole: membership.role,
      ownerCount,
    });
    if (block) {
      throw new CompanyTeamMutationError(block.code, block.message);
    }

    const deleted = await tx.companyMembership.deleteMany({
      where: {
        id: membership.id,
        userId: actor.userId,
        role: membership.role,
      },
    });
    if (deleted.count !== 1) {
      throw new CompanyTeamMutationError("CONFLICT");
    }

    await createMembershipEvent(tx, {
      companyId,
      type: membership.role === "OWNER" ? "OWNER_LEFT" : "MEMBER_LEFT",
      actorUserId: actor.userId,
      subjectUserId: actor.userId,
      fromRole: membership.role,
    });
  });
}
