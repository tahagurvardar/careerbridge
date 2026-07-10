-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('ONSITE', 'HYBRID', 'REMOTE');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD');

-- CreateTable
CREATE TABLE "job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "summary" VARCHAR(320),
    "description" VARCHAR(8000),
    "responsibilities" VARCHAR(6000),
    "requirements" VARCHAR(6000),
    "location" VARCHAR(160),
    "employmentType" "EmploymentType",
    "workplaceType" "WorkplaceType",
    "experienceLevel" "ExperienceLevel",
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "salaryCurrency" CHAR(3),
    "applicationDeadline" DATE,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_skill" (
    "jobId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_skill_pkey" PRIMARY KEY ("jobId","skillId")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_slug_key" ON "job"("slug");

-- CreateIndex
CREATE INDEX "job_companyId_status_createdAt_idx" ON "job"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "job_status_publishedAt_id_idx" ON "job"("status", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "job_skill_skillId_idx" ON "job_skill"("skillId");

-- AddForeignKey
ALTER TABLE "job" ADD CONSTRAINT "job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_skill" ADD CONSTRAINT "job_skill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
