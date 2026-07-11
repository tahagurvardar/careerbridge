-- CreateTable
CREATE TABLE "saved_job" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_job_candidateId_createdAt_id_idx" ON "saved_job"("candidateId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "saved_job_jobId_idx" ON "saved_job"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "saved_job_candidateId_jobId_key" ON "saved_job"("candidateId", "jobId");

-- AddForeignKey
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_job" ADD CONSTRAINT "saved_job_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
