import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  JobStatusValue,
  PublicJobSearch,
  RecruiterJobFilters,
} from "@/features/jobs/schemas";
import { buildPublishedJobWhere } from "@/features/jobs/search";

const MAX_PUBLIC_RESULTS = 60;

/**
 * Every recruiter-facing query is scoped to companies the user OWNS. This is
 * the single ownership boundary that prevents cross-recruiter job access.
 */
function ownerScope(userId: string): Prisma.JobWhereInput {
  return { company: { memberships: { some: { userId, role: "OWNER" } } } };
}

const skillInclude = {
  include: { skill: true },
  orderBy: { skill: { normalizedName: "asc" as const } },
} satisfies Prisma.Job$skillsArgs;

function emptyStatusCounts(): Record<JobStatusValue, number> {
  return { DRAFT: 0, PUBLISHED: 0, CLOSED: 0, ARCHIVED: 0 };
}

export function getOwnedCompaniesForRecruiter(
  prisma: PrismaClient,
  userId: string,
) {
  return prisma.company.findMany({
    where: { memberships: { some: { userId, role: "OWNER" } } },
    select: { id: true, name: true, isPublished: true },
    orderBy: { name: "asc" },
  });
}

export function getRecruiterJobs(
  prisma: PrismaClient,
  userId: string,
  filters: RecruiterJobFilters,
) {
  return prisma.job.findMany({
    where: {
      ...ownerScope(userId),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.q
        ? { title: { contains: filters.q, mode: "insensitive" as const } }
        : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      location: true,
      employmentType: true,
      workplaceType: true,
      createdAt: true,
      publishedAt: true,
      company: { select: { id: true, name: true, isPublished: true } },
      _count: { select: { skills: true, applications: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

export async function getRecruiterJobStatusCounts(
  prisma: PrismaClient,
  userId: string,
) {
  const grouped = await prisma.job.groupBy({
    by: ["status"],
    where: ownerScope(userId),
    _count: { _all: true },
  });

  const counts = emptyStatusCounts();
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }
  return counts;
}

export function getRecruiterJob(
  prisma: PrismaClient,
  userId: string,
  jobId: string,
) {
  return prisma.job.findFirst({
    where: { id: jobId, ...ownerScope(userId) },
    include: {
      company: {
        select: { id: true, name: true, slug: true, isPublished: true },
      },
      skills: skillInclude,
    },
  });
}

export async function getCompanyJobsOverview(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
) {
  const where: Prisma.JobWhereInput = { companyId, ...ownerScope(userId) };
  const [grouped, recentJobs] = await Promise.all([
    prisma.job.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        publishedAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);

  const statusCounts = emptyStatusCounts();
  let total = 0;
  for (const row of grouped) {
    statusCounts[row.status] = row._count._all;
    total += row._count._all;
  }

  return { statusCounts, total, recentJobs };
}

const publicJobCardSelect = {
  slug: true,
  title: true,
  summary: true,
  location: true,
  employmentType: true,
  workplaceType: true,
  experienceLevel: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  publishedAt: true,
  company: { select: { name: true, slug: true } },
  skills: {
    select: { skill: { select: { name: true } } },
    orderBy: { skill: { normalizedName: "asc" as const } },
    take: 6,
  },
} satisfies Prisma.JobSelect;

const publicJobDetailSelect = {
  slug: true,
  title: true,
  summary: true,
  description: true,
  responsibilities: true,
  requirements: true,
  location: true,
  employmentType: true,
  workplaceType: true,
  experienceLevel: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  applicationDeadline: true,
  publishedAt: true,
  company: { select: { name: true, slug: true } },
  skills: {
    select: { skill: { select: { name: true } } },
    orderBy: { skill: { normalizedName: "asc" as const } },
  },
} satisfies Prisma.JobSelect;

export type PublicJobCard = Prisma.JobGetPayload<{
  select: typeof publicJobCardSelect;
}>;
export type PublicJobDetail = Prisma.JobGetPayload<{
  select: typeof publicJobDetailSelect;
}>;

export function getPublishedJobs(
  prisma: PrismaClient,
  search: PublicJobSearch,
) {
  return prisma.job.findMany({
    where: buildPublishedJobWhere(search),
    select: publicJobCardSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: MAX_PUBLIC_RESULTS,
  });
}

export function getFeaturedPublishedJobs(prisma: PrismaClient, take = 3) {
  return prisma.job.findMany({
    where: { status: "PUBLISHED", company: { isPublished: true } },
    select: publicJobCardSelect,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take,
  });
}

export function getPublishedJobBySlug(prisma: PrismaClient, slug: string) {
  return prisma.job.findFirst({
    where: { slug, status: "PUBLISHED", company: { isPublished: true } },
    select: publicJobDetailSelect,
  });
}
