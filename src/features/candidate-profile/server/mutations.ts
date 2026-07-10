import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";
import {
  getSkillLookupName,
  type ValidatedBasicProfile,
  type ValidatedEducation,
  type ValidatedExperience,
} from "@/features/candidate-profile/schemas";

export type ProfileActor = {
  userId: string;
  role: PlatformRole;
};

export class CandidateProfileMutationError extends Error {
  constructor(readonly code: "FORBIDDEN" | "NOT_FOUND" | "DUPLICATE_SKILL") {
    super("Candidate profile mutation failed.");
    this.name = "CandidateProfileMutationError";
  }
}

function assertCandidate(actor: ProfileActor) {
  if (actor.role !== "CANDIDATE") {
    throw new CandidateProfileMutationError("FORBIDDEN");
  }
}

function nullable(value: string) {
  return value || null;
}

function profileData(input: ValidatedBasicProfile) {
  return {
    headline: nullable(input.headline),
    location: nullable(input.location),
    bio: nullable(input.bio),
    websiteUrl: nullable(input.websiteUrl),
    linkedinUrl: nullable(input.linkedinUrl),
    githubUrl: nullable(input.githubUrl),
  };
}

function educationData(input: ValidatedEducation) {
  return {
    school: input.school,
    degree: nullable(input.degree),
    fieldOfStudy: nullable(input.fieldOfStudy),
    startYear: input.startYear,
    endYear: input.isCurrent ? null : input.endYear,
    isCurrent: input.isCurrent,
    description: nullable(input.description),
  };
}

function experienceData(input: ValidatedExperience) {
  return {
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    employmentType: input.employmentType,
    location: nullable(input.location),
    startDate: new Date(`${input.startDate}T00:00:00.000Z`),
    endDate:
      input.isCurrent || !input.endDate
        ? null
        : new Date(`${input.endDate}T00:00:00.000Z`),
    isCurrent: input.isCurrent,
    description: nullable(input.description),
  };
}

async function getOrCreateProfileId(
  prisma: Prisma.TransactionClient,
  userId: string,
) {
  const profile = await prisma.candidateProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { id: true },
  });

  return profile.id;
}

export async function upsertCandidateProfile(
  prisma: PrismaClient,
  actor: ProfileActor,
  input: ValidatedBasicProfile,
) {
  assertCandidate(actor);

  return prisma.candidateProfile.upsert({
    where: { userId: actor.userId },
    create: { userId: actor.userId, ...profileData(input) },
    update: profileData(input),
  });
}

export async function createCandidateEducation(
  prisma: PrismaClient,
  actor: ProfileActor,
  input: ValidatedEducation,
) {
  assertCandidate(actor);

  return prisma.$transaction(async (transaction) => {
    const candidateProfileId = await getOrCreateProfileId(
      transaction,
      actor.userId,
    );

    return transaction.education.create({
      data: { candidateProfileId, ...educationData(input) },
    });
  });
}

export async function updateCandidateEducation(
  prisma: PrismaClient,
  actor: ProfileActor,
  educationId: string,
  input: ValidatedEducation,
) {
  assertCandidate(actor);

  const result = await prisma.education.updateMany({
    where: {
      id: educationId,
      candidateProfile: { userId: actor.userId },
    },
    data: educationData(input),
  });

  if (result.count !== 1) {
    throw new CandidateProfileMutationError("NOT_FOUND");
  }
}

export async function deleteCandidateEducation(
  prisma: PrismaClient,
  actor: ProfileActor,
  educationId: string,
) {
  assertCandidate(actor);

  const result = await prisma.education.deleteMany({
    where: {
      id: educationId,
      candidateProfile: { userId: actor.userId },
    },
  });

  if (result.count !== 1) {
    throw new CandidateProfileMutationError("NOT_FOUND");
  }
}

export async function createCandidateExperience(
  prisma: PrismaClient,
  actor: ProfileActor,
  input: ValidatedExperience,
) {
  assertCandidate(actor);

  return prisma.$transaction(async (transaction) => {
    const candidateProfileId = await getOrCreateProfileId(
      transaction,
      actor.userId,
    );

    return transaction.experience.create({
      data: { candidateProfileId, ...experienceData(input) },
    });
  });
}

export async function updateCandidateExperience(
  prisma: PrismaClient,
  actor: ProfileActor,
  experienceId: string,
  input: ValidatedExperience,
) {
  assertCandidate(actor);

  const result = await prisma.experience.updateMany({
    where: {
      id: experienceId,
      candidateProfile: { userId: actor.userId },
    },
    data: experienceData(input),
  });

  if (result.count !== 1) {
    throw new CandidateProfileMutationError("NOT_FOUND");
  }
}

export async function deleteCandidateExperience(
  prisma: PrismaClient,
  actor: ProfileActor,
  experienceId: string,
) {
  assertCandidate(actor);

  const result = await prisma.experience.deleteMany({
    where: {
      id: experienceId,
      candidateProfile: { userId: actor.userId },
    },
  });

  if (result.count !== 1) {
    throw new CandidateProfileMutationError("NOT_FOUND");
  }
}

export async function addCandidateSkill(
  prisma: PrismaClient,
  actor: ProfileActor,
  name: string,
) {
  assertCandidate(actor);
  const normalizedName = getSkillLookupName(name);

  return prisma.$transaction(async (transaction) => {
    const candidateProfileId = await getOrCreateProfileId(
      transaction,
      actor.userId,
    );
    const skill = await transaction.skill.upsert({
      where: { normalizedName },
      create: { name, normalizedName },
      update: {},
      select: { id: true },
    });
    const assignment = await transaction.candidateSkill.createMany({
      data: [{ candidateProfileId, skillId: skill.id }],
      skipDuplicates: true,
    });

    if (assignment.count !== 1) {
      throw new CandidateProfileMutationError("DUPLICATE_SKILL");
    }
  });
}

export async function removeCandidateSkill(
  prisma: PrismaClient,
  actor: ProfileActor,
  skillId: string,
) {
  assertCandidate(actor);

  const result = await prisma.candidateSkill.deleteMany({
    where: {
      skillId,
      candidateProfile: { userId: actor.userId },
    },
  });

  if (result.count !== 1) {
    throw new CandidateProfileMutationError("NOT_FOUND");
  }
}
