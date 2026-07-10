-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY', 'FREELANCE');

-- CreateTable
CREATE TABLE "candidate_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "headline" VARCHAR(160),
    "location" VARCHAR(120),
    "bio" VARCHAR(2000),
    "websiteUrl" VARCHAR(2048),
    "linkedinUrl" VARCHAR(2048),
    "githubUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "school" VARCHAR(160) NOT NULL,
    "degree" VARCHAR(120),
    "fieldOfStudy" VARCHAR(120),
    "startYear" SMALLINT NOT NULL,
    "endYear" SMALLINT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience" (
    "id" TEXT NOT NULL,
    "candidateProfileId" TEXT NOT NULL,
    "companyName" VARCHAR(160) NOT NULL,
    "jobTitle" VARCHAR(160) NOT NULL,
    "employmentType" "EmploymentType" NOT NULL,
    "location" VARCHAR(120),
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "normalizedName" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_skill" (
    "candidateProfileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_skill_pkey" PRIMARY KEY ("candidateProfileId","skillId")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profile_userId_key" ON "candidate_profile"("userId");

-- CreateIndex
CREATE INDEX "education_candidateProfileId_idx" ON "education"("candidateProfileId");

-- CreateIndex
CREATE INDEX "experience_candidateProfileId_idx" ON "experience"("candidateProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_normalizedName_key" ON "skill"("normalizedName");

-- CreateIndex
CREATE INDEX "candidate_skill_skillId_idx" ON "candidate_skill"("skillId");

-- AddForeignKey
ALTER TABLE "candidate_profile" ADD CONSTRAINT "candidate_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience" ADD CONSTRAINT "experience_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skill" ADD CONSTRAINT "candidate_skill_candidateProfileId_fkey" FOREIGN KEY ("candidateProfileId") REFERENCES "candidate_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_skill" ADD CONSTRAINT "candidate_skill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
