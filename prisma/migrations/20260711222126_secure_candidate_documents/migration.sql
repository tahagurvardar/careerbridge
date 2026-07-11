-- CreateEnum
CREATE TYPE "CandidateDocumentKind" AS ENUM ('RESUME');

-- CreateEnum
CREATE TYPE "CandidateDocumentAccessType" AS ENUM ('OWNER_DOWNLOAD', 'RECRUITER_APPLICATION_DOWNLOAD');

-- AlterTable
ALTER TABLE "job_application" ADD COLUMN     "resumeDocumentId" TEXT;

-- CreateTable
CREATE TABLE "candidate_document" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "kind" "CandidateDocumentKind" NOT NULL DEFAULT 'RESUME',
    "storageKey" VARCHAR(255) NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedFromProfileAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_resume" (
    "candidateId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_resume_pkey" PRIMARY KEY ("candidateId")
);

-- CreateTable
CREATE TABLE "candidate_document_access_log" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "applicationId" TEXT,
    "accessType" "CandidateDocumentAccessType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_document_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_document_storageKey_key" ON "candidate_document"("storageKey");

-- CreateIndex
CREATE INDEX "candidate_document_candidateId_kind_uploadedAt_idx" ON "candidate_document"("candidateId", "kind", "uploadedAt");

-- CreateIndex
CREATE INDEX "candidate_document_candidateId_createdAt_idx" ON "candidate_document"("candidateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_resume_documentId_key" ON "candidate_resume"("documentId");

-- CreateIndex
CREATE INDEX "candidate_document_access_log_documentId_createdAt_idx" ON "candidate_document_access_log"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "candidate_document_access_log_actorUserId_createdAt_idx" ON "candidate_document_access_log"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "job_application_resumeDocumentId_idx" ON "job_application"("resumeDocumentId");

-- AddForeignKey
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "candidate_document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document" ADD CONSTRAINT "candidate_document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resume" ADD CONSTRAINT "candidate_resume_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_resume" ADD CONSTRAINT "candidate_resume_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "candidate_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document_access_log" ADD CONSTRAINT "candidate_document_access_log_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "candidate_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document_access_log" ADD CONSTRAINT "candidate_document_access_log_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_document_access_log" ADD CONSTRAINT "candidate_document_access_log_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "job_application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
