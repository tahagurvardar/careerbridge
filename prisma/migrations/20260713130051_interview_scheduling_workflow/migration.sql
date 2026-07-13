-- CreateEnum
CREATE TYPE "InterviewFormat" AS ENUM ('VIDEO', 'PHONE', 'ONSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('PENDING_RESPONSE', 'ACCEPTED', 'DECLINED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InterviewEventType" AS ENUM ('CREATED', 'ACCEPTED', 'DECLINED', 'RESCHEDULED', 'CANCELED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmailEventType" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "EmailEventType" ADD VALUE 'INTERVIEW_RESCHEDULED';
ALTER TYPE "EmailEventType" ADD VALUE 'INTERVIEW_CANCELED';
ALTER TYPE "EmailEventType" ADD VALUE 'INTERVIEW_RESPONSE_RECEIVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INTERVIEW_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'INTERVIEW_RESCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'INTERVIEW_CANCELED';
ALTER TYPE "NotificationType" ADD VALUE 'INTERVIEW_RESPONSE_RECEIVED';

-- CreateTable
CREATE TABLE "interview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "organizerUserId" TEXT,
    "title" VARCHAR(120) NOT NULL,
    "format" "InterviewFormat" NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'PENDING_RESPONSE',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "timeZone" VARCHAR(100) NOT NULL,
    "location" VARCHAR(300),
    "meetingUrl" VARCHAR(1000),
    "instructions" VARCHAR(3000),
    "version" INTEGER NOT NULL DEFAULT 1,
    "candidateRespondedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_event" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "InterviewEventType" NOT NULL,
    "fromStatus" "InterviewStatus",
    "toStatus" "InterviewStatus" NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "timeZone" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interview_applicationId_startAt_idx" ON "interview"("applicationId", "startAt");

-- CreateIndex
CREATE INDEX "interview_organizerUserId_status_startAt_idx" ON "interview"("organizerUserId", "status", "startAt");

-- CreateIndex
CREATE INDEX "interview_status_startAt_idx" ON "interview"("status", "startAt");

-- CreateIndex
CREATE INDEX "interview_createdAt_idx" ON "interview"("createdAt");

-- CreateIndex
CREATE INDEX "interview_event_interviewId_createdAt_idx" ON "interview_event"("interviewId", "createdAt");

-- CreateIndex
CREATE INDEX "interview_event_actorUserId_createdAt_idx" ON "interview_event"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview" ADD CONSTRAINT "interview_organizerUserId_fkey" FOREIGN KEY ("organizerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_event" ADD CONSTRAINT "interview_event_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_event" ADD CONSTRAINT "interview_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
