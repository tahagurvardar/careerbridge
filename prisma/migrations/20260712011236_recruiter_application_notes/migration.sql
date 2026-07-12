-- CreateEnum
CREATE TYPE "ApplicationNoteRevisionAction" AS ENUM ('CREATED', 'EDITED', 'DELETED');

-- CreateTable
CREATE TABLE "application_note" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" VARCHAR(5000) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "application_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_note_revision" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" "ApplicationNoteRevisionAction" NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_note_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_note_applicationId_deletedAt_createdAt_idx" ON "application_note"("applicationId", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "application_note_authorUserId_idx" ON "application_note"("authorUserId");

-- CreateIndex
CREATE INDEX "application_note_revision_noteId_version_idx" ON "application_note_revision"("noteId", "version");

-- CreateIndex
CREATE INDEX "application_note_revision_actorUserId_createdAt_idx" ON "application_note_revision"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "application_note_revision_noteId_version_key" ON "application_note_revision"("noteId", "version");

-- AddForeignKey
ALTER TABLE "application_note" ADD CONSTRAINT "application_note_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_note" ADD CONSTRAINT "application_note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_note_revision" ADD CONSTRAINT "application_note_revision_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "application_note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_note_revision" ADD CONSTRAINT "application_note_revision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
