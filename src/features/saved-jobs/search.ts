import type { Prisma } from "@/generated/prisma/client";
import { PUBLIC_JOB_VISIBILITY_WHERE } from "@/features/admin/moderation";
import type { SavedJobSearch } from "@/features/saved-jobs/schemas";

const INSENSITIVE = "insensitive" as const;

export const openSavedJobWhere = {
  job: PUBLIC_JOB_VISIBILITY_WHERE,
} satisfies Prisma.SavedJobWhereInput;

export function buildCandidateSavedJobWhere(
  candidateId: string,
  search: SavedJobSearch,
): Prisma.SavedJobWhereInput {
  const where: Prisma.SavedJobWhereInput = { candidateId };

  if (search.availability === "OPEN") {
    where.job = openSavedJobWhere.job;
  } else if (search.availability === "UNAVAILABLE") {
    where.OR = [
      { job: { status: { not: "PUBLISHED" } } },
      { job: { moderationStatus: "HIDDEN" } },
      { job: { company: { isPublished: false } } },
      { job: { company: { moderationStatus: "HIDDEN" } } },
    ];
  }

  if (search.q) {
    const searchWhere: Prisma.SavedJobWhereInput = {
      job: {
        OR: [
          { title: { contains: search.q, mode: INSENSITIVE } },
          { location: { contains: search.q, mode: INSENSITIVE } },
          {
            company: {
              name: { contains: search.q, mode: INSENSITIVE },
            },
          },
          {
            skills: {
              some: {
                skill: { name: { contains: search.q, mode: INSENSITIVE } },
              },
            },
          },
        ],
      },
    };
    where.AND = [searchWhere];
  }

  return where;
}
