-- CreateEnum
CREATE TYPE "EmailEventType" AS ENUM ('COMPANY_INVITATION_RECEIVED', 'APPLICATION_SUBMITTED', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY_SCHEDULED', 'SENT', 'DEAD_LETTER', 'SUPPRESSED');

-- CreateEnum
CREATE TYPE "EmailDeliveryAttemptStatus" AS ENUM ('SENT', 'RETRYABLE_FAILURE', 'PERMANENT_FAILURE');

-- CreateTable
CREATE TABLE "user_email_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_email_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_outbox" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientEmail" VARCHAR(320) NOT NULL,
    "eventType" "EmailEventType" NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "textBody" TEXT NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "destinationPath" VARCHAR(512) NOT NULL,
    "dedupeKey" VARCHAR(200) NOT NULL,
    "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockToken" VARCHAR(64),
    "sentAt" TIMESTAMP(3),
    "lastErrorCode" VARCHAR(120),
    "providerMessageId" VARCHAR(255),
    "applicationId" TEXT,
    "companyId" TEXT,
    "invitationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_attempt" (
    "id" TEXT NOT NULL,
    "outboxId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "EmailDeliveryAttemptStatus" NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "providerMessageId" VARCHAR(255),
    "errorCode" VARCHAR(120),
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_delivery_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_email_preference_userId_idx" ON "user_email_preference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_preference_userId_eventType_key" ON "user_email_preference"("userId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "email_outbox_dedupeKey_key" ON "email_outbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "email_outbox_status_nextAttemptAt_createdAt_idx" ON "email_outbox"("status", "nextAttemptAt", "createdAt");

-- CreateIndex
CREATE INDEX "email_outbox_status_lockedAt_idx" ON "email_outbox"("status", "lockedAt");

-- CreateIndex
CREATE INDEX "email_outbox_recipientUserId_createdAt_idx" ON "email_outbox"("recipientUserId", "createdAt");

-- CreateIndex
CREATE INDEX "email_outbox_applicationId_idx" ON "email_outbox"("applicationId");

-- CreateIndex
CREATE INDEX "email_outbox_companyId_idx" ON "email_outbox"("companyId");

-- CreateIndex
CREATE INDEX "email_outbox_invitationId_idx" ON "email_outbox"("invitationId");

-- CreateIndex
CREATE INDEX "email_delivery_attempt_outboxId_createdAt_idx" ON "email_delivery_attempt"("outboxId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_delivery_attempt_outboxId_attemptNumber_key" ON "email_delivery_attempt"("outboxId", "attemptNumber");

-- AddForeignKey
ALTER TABLE "user_email_preference" ADD CONSTRAINT "user_email_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_outbox" ADD CONSTRAINT "email_outbox_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "company_invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_attempt" ADD CONSTRAINT "email_delivery_attempt_outboxId_fkey" FOREIGN KEY ("outboxId") REFERENCES "email_outbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
