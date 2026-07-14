import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { PUBLIC_COMPANY_VISIBILITY_WHERE } from "@/features/admin/moderation";
import type { PublicCompanySearch } from "@/features/recruiter-company/schemas";

const publicCompanySelect = {
  id: true,
  name: true,
  slug: true,
  tagline: true,
  description: true,
  industry: true,
  headquarters: true,
  websiteUrl: true,
  companySize: true,
  foundedYear: true,
  isPublished: true,
} satisfies Prisma.CompanySelect;

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
      ...PUBLIC_COMPANY_VISIBILITY_WHERE,
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
    select: publicCompanySelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
}

export function getPublishedCompanyBySlug(prisma: PrismaClient, slug: string) {
  return prisma.company.findFirst({
    where: { slug, ...PUBLIC_COMPANY_VISIBILITY_WHERE },
    select: publicCompanySelect,
  });
}
