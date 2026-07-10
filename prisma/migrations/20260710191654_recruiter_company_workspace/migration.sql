-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('SOLO', 'TWO_TO_TEN', 'ELEVEN_TO_FIFTY', 'FIFTY_ONE_TO_TWO_HUNDRED', 'TWO_HUNDRED_ONE_TO_FIVE_HUNDRED', 'FIVE_HUNDRED_ONE_TO_ONE_THOUSAND', 'ONE_THOUSAND_PLUS');

-- CreateEnum
CREATE TYPE "CompanyMembershipRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "recruiter_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobTitle" VARCHAR(160),
    "bio" VARCHAR(2000),
    "linkedinUrl" VARCHAR(2048),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "tagline" VARCHAR(240),
    "description" VARCHAR(4000),
    "industry" VARCHAR(120),
    "headquarters" VARCHAR(160),
    "websiteUrl" VARCHAR(2048),
    "companySize" "CompanySize",
    "foundedYear" SMALLINT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "CompanyMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profile_userId_key" ON "recruiter_profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "company_slug_key" ON "company"("slug");

-- CreateIndex
CREATE INDEX "company_isPublished_name_idx" ON "company"("isPublished", "name");

-- CreateIndex
CREATE INDEX "company_membership_companyId_role_idx" ON "company_membership"("companyId", "role");

-- CreateIndex
CREATE INDEX "company_membership_userId_role_idx" ON "company_membership"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "company_membership_userId_companyId_key" ON "company_membership"("userId", "companyId");

-- AddForeignKey
ALTER TABLE "recruiter_profile" ADD CONSTRAINT "recruiter_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership" ADD CONSTRAINT "company_membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_membership" ADD CONSTRAINT "company_membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
