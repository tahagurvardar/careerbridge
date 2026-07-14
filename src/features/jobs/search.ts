import type { Prisma } from "@/generated/prisma/client";
import { PUBLIC_JOB_VISIBILITY_WHERE } from "@/features/admin/moderation";
import type { PublicJobSearch } from "@/features/jobs/schemas";

const INSENSITIVE = "insensitive" as const;

/**
 * Builds the Prisma filter for public job discovery. Only published jobs whose
 * company is also published are ever eligible; free-text search spans the job
 * title, company name, and required skills. Kept pure for unit testing.
 */
export function buildPublishedJobWhere(
  search: PublicJobSearch,
): Prisma.JobWhereInput {
  const where: Prisma.JobWhereInput = {
    ...PUBLIC_JOB_VISIBILITY_WHERE,
  };

  if (search.employmentType) where.employmentType = search.employmentType;
  if (search.workplaceType) where.workplaceType = search.workplaceType;
  if (search.experienceLevel) where.experienceLevel = search.experienceLevel;
  if (search.location) {
    where.location = { contains: search.location, mode: INSENSITIVE };
  }
  if (search.q) {
    where.OR = [
      { title: { contains: search.q, mode: INSENSITIVE } },
      { company: { name: { contains: search.q, mode: INSENSITIVE } } },
      {
        skills: {
          some: { skill: { name: { contains: search.q, mode: INSENSITIVE } } },
        },
      },
    ];
  }

  return where;
}
