import type { Prisma } from "@/generated/prisma/client";
import type { SavedJobSearch } from "@/features/saved-jobs/schemas";

const INSENSITIVE = "insensitive" as const;

export const openSavedJobWhere = {
  job: { status: "PUBLISHED", company: { isPublished: true } },
} satisfies Prisma.SavedJobWhereInput;

export function buildCandidateSavedJobWhere(
  candidateId: string,
  search: SavedJobSearch,
): Prisma.SavedJobWhereInput {
  const where: Prisma.SavedJobWhereInput = { candidateId };

  if (search.availability === "OPEN") {
    where.job = { status: "PUBLISHED", company: { isPublished: true } };
  } else if (search.availability === "UNAVAILABLE") {
    where.OR = [
      { job: { status: { not: "PUBLISHED" } } },
      { job: { company: { isPublished: false } } },
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
