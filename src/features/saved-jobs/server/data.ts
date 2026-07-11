import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { SavedJobSearch } from "@/features/saved-jobs/schemas";
import {
  buildCandidateSavedJobWhere,
  openSavedJobWhere,
} from "@/features/saved-jobs/search";

const MAX_SAVED_RESULTS = 100;

const savedJobSelect = {
  createdAt: true,
  job: {
    select: {
      slug: true,
      title: true,
      status: true,
      location: true,
      employmentType: true,
      workplaceType: true,
      experienceLevel: true,
      company: { select: { name: true, isPublished: true } },
      skills: {
        select: { skill: { select: { name: true } } },
        orderBy: { skill: { normalizedName: "asc" as const } },
      },
      applications: {
        select: { status: true },
        take: 1,
      },
    },
  },
} satisfies Prisma.SavedJobSelect;

export type CandidateSavedJob = Prisma.SavedJobGetPayload<{
  select: typeof savedJobSelect;
}>;

export function getCandidateSavedJobs(
  prisma: PrismaClient,
  candidateId: string,
  search: SavedJobSearch,
) {
  return prisma.savedJob.findMany({
    where: buildCandidateSavedJobWhere(candidateId, search),
    select: {
      ...savedJobSelect,
      job: {
        ...savedJobSelect.job,
        select: {
          ...savedJobSelect.job.select,
          applications: {
            where: { candidateId },
            select: { status: true },
            take: 1,
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_SAVED_RESULTS,
  });
}

export function countCandidateSavedJobs(
  prisma: PrismaClient,
  candidateId: string,
) {
  return prisma.savedJob.count({ where: { candidateId } });
}

export async function getSavedJobSlugs(
  prisma: PrismaClient,
  candidateId: string,
  slugs: readonly string[],
) {
  if (slugs.length === 0) return new Set<string>();

  const rows = await prisma.savedJob.findMany({
    where: { candidateId, job: { slug: { in: [...slugs] } } },
    select: { job: { select: { slug: true } } },
  });
  return new Set(rows.map(({ job }) => job.slug));
}

export async function isJobSavedByCandidate(
  prisma: PrismaClient,
  candidateId: string,
  slug: string,
) {
  const row = await prisma.savedJob.findFirst({
    where: { candidateId, job: { slug } },
    select: { id: true },
  });
  return Boolean(row);
}

export async function getCandidateSavedJobDashboard(
  prisma: PrismaClient,
  candidateId: string,
) {
  const [total, openUnapplied, recent] = await Promise.all([
    prisma.savedJob.count({ where: { candidateId } }),
    prisma.savedJob.count({
      where: {
        candidateId,
        ...openSavedJobWhere,
        job: {
          status: "PUBLISHED",
          company: { isPublished: true },
          applications: { none: { candidateId } },
        },
      },
    }),
    prisma.savedJob.findMany({
      where: { candidateId },
      select: {
        createdAt: true,
        job: {
          select: {
            slug: true,
            title: true,
            status: true,
            company: { select: { name: true, isPublished: true } },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 4,
    }),
  ]);

  return { total, openUnapplied, recent };
}
