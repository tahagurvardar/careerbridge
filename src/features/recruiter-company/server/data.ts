import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PublicCompanySearch } from "@/features/recruiter-company/schemas";

export function getRecruiterProfile(prisma: PrismaClient, userId: string) {
  return prisma.recruiterProfile.findUnique({ where: { userId } });
}

export function getRecruiterCompanies(prisma: PrismaClient, userId: string) {
  return prisma.companyMembership.findMany({
    where: { userId },
    include: { company: true },
    orderBy: { company: { name: "asc" } },
  });
}

export function getRecruiterProfileWorkspace(
  prisma: PrismaClient,
  userId: string,
) {
  return Promise.all([
    getRecruiterProfile(prisma, userId),
    getRecruiterCompanies(prisma, userId),
  ]);
}

export function getCompanyWorkspace(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
) {
  return prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { company: true },
  });
}

export function getOwnedCompany(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
) {
  return prisma.company.findFirst({
    where: {
      id: companyId,
      memberships: { some: { userId, role: "OWNER" } },
    },
  });
}

export function getPublishedCompanies(
  prisma: PrismaClient,
  search: PublicCompanySearch,
) {
  return prisma.company.findMany({
    where: {
      isPublished: true,
      ...(search.q
        ? { name: { contains: search.q, mode: "insensitive" as const } }
        : {}),
      ...(search.industry
        ? {
            industry: {
              contains: search.industry,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(search.headquarters
        ? {
            headquarters: {
              contains: search.headquarters,
              mode: "insensitive" as const,
            },
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export function getPublishedCompanyBySlug(prisma: PrismaClient, slug: string) {
  return prisma.company.findFirst({
    where: { slug, isPublished: true },
  });
}
