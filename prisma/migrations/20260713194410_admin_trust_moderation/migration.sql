-- CreateEnum
CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ContentModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ModerationReasonCode" AS ENUM ('SPAM', 'FRAUD', 'ABUSE', 'IMPERSONATION', 'POLICY_VIOLATION', 'SECURITY_RISK', 'OTHER');

-- CreateEnum
CREATE TYPE "AdminAuditAction" AS ENUM ('USER_SUSPENDED', 'USER_RESTORED', 'COMPANY_HIDDEN', 'COMPANY_RESTORED', 'JOB_HIDDEN', 'JOB_RESTORED');

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "moderationVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "job" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderationStatus" "ContentModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN     "moderationVersion" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "moderationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "restoredAt" TIMESTAMP(3),
ADD COLUMN     "suspendedAt" TIMESTAMP(3);

-- Moderation versions are server-owned optimistic concurrency tokens.
ALTER TABLE "user"
ADD CONSTRAINT "user_moderationVersion_positive" CHECK ("moderationVersion" >= 1),
ADD CONSTRAINT "user_moderation_timestamps_consistent" CHECK (
  ("accountStatus" = 'ACTIVE' AND "suspendedAt" IS NULL)
  OR
  ("accountStatus" = 'SUSPENDED' AND "suspendedAt" IS NOT NULL AND "restoredAt" IS NULL)
);

ALTER TABLE "company"
ADD CONSTRAINT "company_moderationVersion_positive" CHECK ("moderationVersion" >= 1),
ADD CONSTRAINT "company_hidden_timestamp_present" CHECK (
  "moderationStatus" = 'VISIBLE' OR "moderatedAt" IS NOT NULL
);

ALTER TABLE "job"
ADD CONSTRAINT "job_moderationVersion_positive" CHECK ("moderationVersion" >= 1),
ADD CONSTRAINT "job_hidden_timestamp_present" CHECK (
  "moderationStatus" = 'VISIBLE' OR "moderatedAt" IS NOT NULL
);

-- CreateTable
CREATE TABLE "admin_audit_event" (
    "id" TEXT NOT NULL,
    "actorAdminUserId" TEXT,
    "targetUserId" TEXT,
    "targetCompanyId" TEXT,
    "targetJobId" TEXT,
    "action" "AdminAuditAction" NOT NULL,
    "reasonCode" "ModerationReasonCode" NOT NULL,
    "reasonNote" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_event_pkey" PRIMARY KEY ("id")
);

-- A live target must match its action. The all-null case is retained solely so
-- SetNull foreign keys can preserve an immutable event after a target is later
-- deleted outside the moderation workflow.
ALTER TABLE "admin_audit_event"
ADD CONSTRAINT "admin_audit_event_target_matches_action" CHECK (
  (
    "action" IN ('USER_SUSPENDED', 'USER_RESTORED')
    AND "targetUserId" IS NOT NULL
    AND "targetCompanyId" IS NULL
    AND "targetJobId" IS NULL
  )
  OR
  (
    "action" IN ('COMPANY_HIDDEN', 'COMPANY_RESTORED')
    AND "targetUserId" IS NULL
    AND "targetCompanyId" IS NOT NULL
    AND "targetJobId" IS NULL
  )
  OR
  (
    "action" IN ('JOB_HIDDEN', 'JOB_RESTORED')
    AND "targetUserId" IS NULL
    AND "targetCompanyId" IS NULL
    AND "targetJobId" IS NOT NULL
  )
  OR
  (
    "targetUserId" IS NULL
    AND "targetCompanyId" IS NULL
    AND "targetJobId" IS NULL
  )
);

-- CreateIndex
CREATE INDEX "admin_audit_event_createdAt_idx" ON "admin_audit_event"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_event_actorAdminUserId_createdAt_idx" ON "admin_audit_event"("actorAdminUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_event_targetUserId_createdAt_idx" ON "admin_audit_event"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_event_targetCompanyId_createdAt_idx" ON "admin_audit_event"("targetCompanyId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_event_targetJobId_createdAt_idx" ON "admin_audit_event"("targetJobId", "createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_event_action_createdAt_idx" ON "admin_audit_event"("action", "createdAt");

-- CreateIndex
CREATE INDEX "company_moderationStatus_idx" ON "company"("moderationStatus");

-- CreateIndex
CREATE INDEX "company_moderationStatus_createdAt_idx" ON "company"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "job_moderationStatus_idx" ON "job"("moderationStatus");

-- CreateIndex
CREATE INDEX "job_moderationStatus_createdAt_idx" ON "job"("moderationStatus", "createdAt");

-- CreateIndex
CREATE INDEX "user_accountStatus_idx" ON "user"("accountStatus");

-- CreateIndex
CREATE INDEX "user_role_accountStatus_idx" ON "user"("role", "accountStatus");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- AddForeignKey
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_actorAdminUserId_fkey" FOREIGN KEY ("actorAdminUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_event" ADD CONSTRAINT "admin_audit_event_targetJobId_fkey" FOREIGN KEY ("targetJobId") REFERENCES "job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
