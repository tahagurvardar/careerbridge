import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  canModerateContent,
  canModerateUser,
  isModerationTargetActionCompatible,
  isStaleModerationVersion,
  type AdminAuditActionValue,
  type ContentModerationAction,
  type ModerationTargetType,
  type UserModerationAction,
} from "@/features/admin/moderation";
import type { ModerationMutationInput } from "@/features/admin/schemas";

export type AdminActor = {
  userId: string;
  role: "CANDIDATE" | "RECRUITER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED";
};

export type ModerationMutationErrorCode =
  "FORBIDDEN" | "NOT_FOUND" | "INVALID_TRANSITION" | "CONFLICT";

export class ModerationMutationError extends Error {
  constructor(readonly code: ModerationMutationErrorCode) {
    super("Admin moderation mutation failed.");
    this.name = "ModerationMutationError";
  }
}

function assertAdmin(actor: AdminActor) {
  if (actor.role !== "ADMIN" || actor.accountStatus !== "ACTIVE") {
    throw new ModerationMutationError("FORBIDDEN");
  }
}

async function assertActiveAdminInTransaction(
  transaction: Prisma.TransactionClient,
  actor: AdminActor,
) {
  assertAdmin(actor);

  const storedActor = await transaction.user.findUnique({
    where: { id: actor.userId },
    select: { role: true, accountStatus: true },
  });

  if (storedActor?.role !== "ADMIN" || storedActor.accountStatus !== "ACTIVE") {
    throw new ModerationMutationError("FORBIDDEN");
  }
}

function auditData(
  actorUserId: string,
  action: AdminAuditActionValue,
  targetType: ModerationTargetType,
  targetId: string,
  input: ModerationMutationInput,
): Prisma.AdminAuditEventUncheckedCreateInput {
  if (!isModerationTargetActionCompatible(action, targetType)) {
    throw new ModerationMutationError("INVALID_TRANSITION");
  }

  return {
    actorAdminUserId: actorUserId,
    action,
    reasonCode: input.reasonCode,
    reasonNote: input.reasonNote ?? null,
    ...(targetType === "USER" ? { targetUserId: targetId } : {}),
    ...(targetType === "COMPANY" ? { targetCompanyId: targetId } : {}),
    ...(targetType === "JOB" ? { targetJobId: targetId } : {}),
  };
}

export async function moderateUserAccount(
  prisma: PrismaClient,
  actor: AdminActor,
  action: UserModerationAction,
  input: ModerationMutationInput,
) {
  assertAdmin(actor);

  return prisma.$transaction(async (transaction) => {
    await assertActiveAdminInTransaction(transaction, actor);

    const target = await transaction.user.findUnique({
      where: { id: input.targetId },
      select: {
        id: true,
        role: true,
        accountStatus: true,
        moderationVersion: true,
      },
    });

    // Admin/self targets deliberately share the same safe result as an unknown
    // identifier so the operation does not become a moderation IDOR oracle.
    if (!target || target.role === "ADMIN" || target.id === actor.userId) {
      throw new ModerationMutationError("NOT_FOUND");
    }
    if (
      isStaleModerationVersion(input.expectedVersion, target.moderationVersion)
    ) {
      throw new ModerationMutationError("CONFLICT");
    }
    if (
      !canModerateUser({
        actorAdminUserId: actor.userId,
        targetUserId: target.id,
        targetRole: target.role,
        currentStatus: target.accountStatus,
        action,
      })
    ) {
      throw new ModerationMutationError("INVALID_TRANSITION");
    }

    const now = new Date();
    const nextStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
    const result = await transaction.user.updateMany({
      where: {
        id: target.id,
        role: { in: ["CANDIDATE", "RECRUITER"] },
        accountStatus: target.accountStatus,
        moderationVersion: input.expectedVersion,
      },
      data: {
        accountStatus: nextStatus,
        moderationVersion: { increment: 1 },
        suspendedAt: action === "SUSPEND" ? now : null,
        restoredAt: action === "RESTORE" ? now : null,
      },
    });
    if (result.count !== 1) {
      throw new ModerationMutationError("CONFLICT");
    }

    await transaction.adminAuditEvent.create({
      data: auditData(
        actor.userId,
        action === "SUSPEND" ? "USER_SUSPENDED" : "USER_RESTORED",
        "USER",
        target.id,
        input,
      ),
      select: { id: true },
    });

    if (action === "SUSPEND") {
      await transaction.session.deleteMany({ where: { userId: target.id } });
    }

    return {
      status: nextStatus,
      moderationVersion: target.moderationVersion + 1,
    };
  });
}

export async function moderateCompany(
  prisma: PrismaClient,
  actor: AdminActor,
  action: ContentModerationAction,
  input: ModerationMutationInput,
) {
  assertAdmin(actor);

  return prisma.$transaction(async (transaction) => {
    await assertActiveAdminInTransaction(transaction, actor);

    const target = await transaction.company.findUnique({
      where: { id: input.targetId },
      select: { id: true, moderationStatus: true, moderationVersion: true },
    });
    if (!target) throw new ModerationMutationError("NOT_FOUND");
    if (
      isStaleModerationVersion(input.expectedVersion, target.moderationVersion)
    ) {
      throw new ModerationMutationError("CONFLICT");
    }
    if (!canModerateContent(target.moderationStatus, action)) {
      throw new ModerationMutationError("INVALID_TRANSITION");
    }

    const nextStatus = action === "HIDE" ? "HIDDEN" : "VISIBLE";
    const result = await transaction.company.updateMany({
      where: {
        id: target.id,
        moderationStatus: target.moderationStatus,
        moderationVersion: input.expectedVersion,
      },
      data: {
        moderationStatus: nextStatus,
        moderationVersion: { increment: 1 },
        moderatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new ModerationMutationError("CONFLICT");
    }

    await transaction.adminAuditEvent.create({
      data: auditData(
        actor.userId,
        action === "HIDE" ? "COMPANY_HIDDEN" : "COMPANY_RESTORED",
        "COMPANY",
        target.id,
        input,
      ),
      select: { id: true },
    });

    return {
      status: nextStatus,
      moderationVersion: target.moderationVersion + 1,
    };
  });
}

export async function moderateJob(
  prisma: PrismaClient,
  actor: AdminActor,
  action: ContentModerationAction,
  input: ModerationMutationInput,
) {
  assertAdmin(actor);

  return prisma.$transaction(async (transaction) => {
    await assertActiveAdminInTransaction(transaction, actor);

    const target = await transaction.job.findUnique({
      where: { id: input.targetId },
      select: { id: true, moderationStatus: true, moderationVersion: true },
    });
    if (!target) throw new ModerationMutationError("NOT_FOUND");
    if (
      isStaleModerationVersion(input.expectedVersion, target.moderationVersion)
    ) {
      throw new ModerationMutationError("CONFLICT");
    }
    if (!canModerateContent(target.moderationStatus, action)) {
      throw new ModerationMutationError("INVALID_TRANSITION");
    }

    const nextStatus = action === "HIDE" ? "HIDDEN" : "VISIBLE";
    const result = await transaction.job.updateMany({
      where: {
        id: target.id,
        moderationStatus: target.moderationStatus,
        moderationVersion: input.expectedVersion,
      },
      data: {
        moderationStatus: nextStatus,
        moderationVersion: { increment: 1 },
        moderatedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new ModerationMutationError("CONFLICT");
    }

    await transaction.adminAuditEvent.create({
      data: auditData(
        actor.userId,
        action === "HIDE" ? "JOB_HIDDEN" : "JOB_RESTORED",
        "JOB",
        target.id,
        input,
      ),
      select: { id: true },
    });

    return {
      status: nextStatus,
      moderationVersion: target.moderationVersion + 1,
    };
  });
}
