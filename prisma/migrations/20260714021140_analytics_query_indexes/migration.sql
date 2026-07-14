-- CreateIndex
CREATE INDEX "company_createdAt_idx" ON "company"("createdAt");

-- CreateIndex
CREATE INDEX "interview_applicationId_createdAt_idx" ON "interview"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "job_createdAt_idx" ON "job"("createdAt");

-- CreateIndex
CREATE INDEX "job_application_createdAt_idx" ON "job_application"("createdAt");

-- CreateIndex
CREATE INDEX "job_application_candidateId_createdAt_idx" ON "job_application"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "job_application_jobId_createdAt_idx" ON "job_application"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "job_application_status_createdAt_idx" ON "job_application"("status", "createdAt");
