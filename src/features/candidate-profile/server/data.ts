import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

const profileInclude = {
  education: {
    orderBy: [{ startYear: "desc" as const }, { createdAt: "desc" as const }],
  },
  experience: {
    orderBy: [{ startDate: "desc" as const }, { createdAt: "desc" as const }],
  },
  skills: {
    include: { skill: true },
    orderBy: { skill: { normalizedName: "asc" as const } },
  },
};

export function getCandidateProfile(prisma: PrismaClient, userId: string) {
  return prisma.candidateProfile.findUnique({
    where: { userId },
    include: profileInclude,
  });
}

export function getOwnedEducation(
  prisma: PrismaClient,
  userId: string,
  educationId: string,
) {
  return prisma.education.findFirst({
    where: {
      id: educationId,
      candidateProfile: { userId },
    },
  });
}

export function getOwnedExperience(
  prisma: PrismaClient,
  userId: string,
  experienceId: string,
) {
  return prisma.experience.findFirst({
    where: {
      id: experienceId,
      candidateProfile: { userId },
    },
  });
}
