-- CreateEnum
CREATE TYPE "CompanyInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CompanyMembershipEventType" AS ENUM ('INVITATION_CREATED', 'INVITATION_ACCEPTED', 'INVITATION_DECLINED', 'INVITATION_REVOKED', 'INVITATION_EXPIRED', 'MEMBER_PROMOTED_TO_OWNER', 'OWNER_DEMOTED_TO_MEMBER', 'MEMBER_REMOVED', 'OWNER_REMOVED', 'MEMBER_LEFT', 'OWNER_LEFT');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMPANY_INVITATION_RECEIVED';

-- CreateTable
CREATE TABLE "company_invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inviteeUserId" TEXT NOT NULL,
    "invitedByUserId" TEXT,
    "status" "CompanyInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "activeKey" VARCHAR(130),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_membership_event" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "subjectUserId" TEXT,
    "invitationId" TEXT,
    "type" "CompanyMembershipEventType" NOT NULL,
    "fromRole" "CompanyMembershipRole",
    "toRole" "CompanyMembershipRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_membership_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_invitation_activeKey_key" ON "company_invitation"("activeKey");

-- CreateIndex
CREATE INDEX "company_invitation_inviteeUserId_status_createdAt_idx" ON "company_invitation"("inviteeUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "company_invitation_companyId_status_createdAt_idx" ON "company_invitation"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "company_invitation_status_expiresAt_idx" ON "company_invitation"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "company_membership_event_companyId_createdAt_idx" ON "company_membership_event"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "company_membership_event_actorUserId_createdAt_idx" ON "company_membership_event"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "company_membership_event_invitationId_idx" ON "company_membership_event"("invitationId");

-- AddForeignKey
ALTER TABLE "company_invitation" ADD CONSTRAINT "company_invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitation" ADD CONSTRAINT "company_invitation_inviteeUserId_fkey" FOREIGN KEY ("inviteeUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_invitation" ADD CONSTRAINT "company_invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership_event" ADD CONSTRAINT "company_membership_event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership_event" ADD CONSTRAINT "company_membership_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership_event" ADD CONSTRAINT "company_membership_event_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership_event" ADD CONSTRAINT "company_membership_event_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "company_invitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
