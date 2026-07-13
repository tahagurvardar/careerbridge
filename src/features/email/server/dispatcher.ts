import "server-only";

import { randomUUID } from "node:crypto";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  buildAbsoluteEmailDestination,
  getEmailBatchSize,
} from "@/features/email/config";
import { renderEmailDestination } from "@/features/email/email";
import {
  getEmailDeliveryProvider,
  sanitizeProviderFailure,
  type EmailDeliveryProvider,
} from "@/features/email/server/provider";

const STALE_LOCK_MS = 10 * 60 * 1_000;
const RETRY_DELAYS_MS = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  12 * 60 * 60_000,
] as const;

type ClaimRow = {
  id: string;
  recipientEmail: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  destinationPath: string;
  dedupeKey: string;
  attemptCount: number;
  maxAttempts: number;
};

type ClaimedEmail = ClaimRow & { lockToken: string };

export type DispatchResult = {
  claimed: number;
  sent: number;
  retryScheduled: number;
  deadLettered: number;
  skipped: number;
};

export function getRetryDelayMs(attemptNumber: number): number {
  const index = Math.min(
    RETRY_DELAYS_MS.length - 1,
    Math.max(0, attemptNumber - 1),
  );
  return RETRY_DELAYS_MS[index];
}

export async function claimDueEmails(
  prisma: PrismaClient,
  batchSize = getEmailBatchSize(),
  now = new Date(),
): Promise<ClaimedEmail[]> {
  const limit = Math.min(100, Math.max(1, batchSize));
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);

  return prisma.$transaction(async (tx) => {
    await tx.emailOutbox.updateMany({
      where: { status: "PROCESSING", lockedAt: { lt: staleBefore } },
      data: {
        status: "RETRY_SCHEDULED",
        nextAttemptAt: now,
        lockedAt: null,
        lockToken: null,
        lastErrorCode: "STALE_LOCK_RECOVERED",
      },
    });

    const rows = await tx.$queryRaw<ClaimRow[]>(Prisma.sql`
      SELECT
        "id", "recipientEmail", "subject", "textBody", "htmlBody",
        "destinationPath", "dedupeKey", "attemptCount", "maxAttempts"
      FROM "email_outbox"
      WHERE "status" IN (
        CAST('PENDING' AS "EmailOutboxStatus"),
        CAST('RETRY_SCHEDULED' AS "EmailOutboxStatus")
      )
        AND "nextAttemptAt" <= ${now}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `);

    const claimed: ClaimedEmail[] = [];
    for (const row of rows) {
      const lockToken = randomUUID();
      await tx.emailOutbox.update({
        where: { id: row.id },
        data: { status: "PROCESSING", lockedAt: now, lockToken },
      });
      claimed.push({ ...row, lockToken });
    }
    return claimed;
  });
}

async function finalizeSuccess(
  prisma: PrismaClient,
  email: ClaimedEmail,
  provider: string,
  providerMessageId: string | null,
  startedAt: Date,
): Promise<boolean> {
  const attemptNumber = email.attemptCount + 1;
  const finishedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const update = await tx.emailOutbox.updateMany({
      where: {
        id: email.id,
        status: "PROCESSING",
        lockToken: email.lockToken,
      },
      data: {
        status: "SENT",
        sentAt: finishedAt,
        providerMessageId,
        attemptCount: attemptNumber,
        lockedAt: null,
        lockToken: null,
        lastErrorCode: null,
      },
    });
    if (update.count !== 1) return false;
    await tx.emailDeliveryAttempt.create({
      data: {
        outboxId: email.id,
        attemptNumber,
        status: "SENT",
        provider,
        providerMessageId,
        startedAt,
        finishedAt,
      },
    });
    return true;
  });
}

async function finalizeFailure(
  prisma: PrismaClient,
  email: ClaimedEmail,
  provider: string,
  failure: { code: string; retryable: boolean },
  startedAt: Date,
): Promise<"retry" | "dead" | "skipped"> {
  const attemptNumber = email.attemptCount + 1;
  const terminal = !failure.retryable || attemptNumber >= email.maxAttempts;
  const finishedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const update = await tx.emailOutbox.updateMany({
      where: {
        id: email.id,
        status: "PROCESSING",
        lockToken: email.lockToken,
      },
      data: {
        status: terminal ? "DEAD_LETTER" : "RETRY_SCHEDULED",
        attemptCount: attemptNumber,
        nextAttemptAt: terminal
          ? finishedAt
          : new Date(finishedAt.getTime() + getRetryDelayMs(attemptNumber)),
        lockedAt: null,
        lockToken: null,
        lastErrorCode: failure.code.slice(0, 120),
      },
    });
    if (update.count !== 1) return "skipped" as const;
    await tx.emailDeliveryAttempt.create({
      data: {
        outboxId: email.id,
        attemptNumber,
        status: failure.retryable ? "RETRYABLE_FAILURE" : "PERMANENT_FAILURE",
        provider,
        errorCode: failure.code.slice(0, 120),
        startedAt,
        finishedAt,
      },
    });
    return terminal ? ("dead" as const) : ("retry" as const);
  });
}

export async function dispatchEmailBatch(
  prisma: PrismaClient,
  provider: EmailDeliveryProvider = getEmailDeliveryProvider(),
  batchSize = getEmailBatchSize(),
): Promise<DispatchResult> {
  const claimed = await claimDueEmails(prisma, batchSize);
  const result: DispatchResult = {
    claimed: claimed.length,
    sent: 0,
    retryScheduled: 0,
    deadLettered: 0,
    skipped: 0,
  };

  for (const email of claimed) {
    const startedAt = new Date();
    try {
      const destination = buildAbsoluteEmailDestination(email.destinationPath);
      const delivery = await provider.send({
        to: email.recipientEmail,
        subject: email.subject,
        text: renderEmailDestination(email.textBody, destination),
        html: renderEmailDestination(email.htmlBody, destination),
        idempotencyKey: email.dedupeKey,
      });
      if (
        await finalizeSuccess(
          prisma,
          email,
          delivery.provider,
          delivery.providerMessageId,
          startedAt,
        )
      ) {
        result.sent += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      const outcome = await finalizeFailure(
        prisma,
        email,
        provider.name,
        sanitizeProviderFailure(error),
        startedAt,
      );
      if (outcome === "retry") result.retryScheduled += 1;
      if (outcome === "dead") result.deadLettered += 1;
      if (outcome === "skipped") result.skipped += 1;
    }
  }

  console.info(
    `Email batch complete: driver=${provider.name} claimed=${result.claimed} sent=${result.sent} retry=${result.retryScheduled} dead=${result.deadLettered} skipped=${result.skipped}`,
  );
  return result;
}
