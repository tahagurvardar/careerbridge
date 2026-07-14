import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  PUBLIC_COMPANY_VISIBILITY_WHERE,
  PUBLIC_JOB_VISIBILITY_WHERE,
  isJobPubliclyVisible,
} from "@/features/admin/moderation";
import {
  ADMIN_PAGE_SIZE,
  type AdminAuditSearch,
  type AdminCompanySearch,
  type AdminJobSearch,
  type AdminUserSearch,
} from "@/features/admin/schemas";

const auditSummarySelect = {
  id: true,
  action: true,
  reasonCode: true,
  createdAt: true,
  targetUserId: true,
  targetCompanyId: true,
  targetJobId: true,
  actor: { select: { name: true } },
  targetUser: { select: { name: true } },
  targetCompany: { select: { name: true } },
  targetJob: { select: { title: true } },
} satisfies Prisma.AdminAuditEventSelect;

const auditDetailSelect = {
  ...auditSummarySelect,
  reasonNote: true,
} satisfies Prisma.AdminAuditEventSelect;

function pagination(page: number) {
  return { skip: (page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE };
}

function pageResult<T>(items: T[], total: number, page: number) {
  return {
    items,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

export async function getAdminDashboard(prisma: PrismaClient) {
  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    candidates,
    recruiters,
    publicCompanies,
    hiddenCompanies,
    publicJobs,
    hiddenJobs,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { accountStatus: "ACTIVE" } }),
    prisma.user.count({ where: { accountStatus: "SUSPENDED" } }),
    prisma.user.count({ where: { role: "CANDIDATE" } }),
    prisma.user.count({ where: { role: "RECRUITER" } }),
    prisma.company.count({ where: PUBLIC_COMPANY_VISIBILITY_WHERE }),
    prisma.company.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.job.count({ where: PUBLIC_JOB_VISIBILITY_WHERE }),
    prisma.job.count({ where: { moderationStatus: "HIDDEN" } }),
    prisma.adminAuditEvent.findMany({
      select: auditSummarySelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
    }),
  ]);

  return {
    counts: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      candidates,
      recruiters,
      publicCompanies,
      hiddenCompanies,
      publicJobs,
      hiddenJobs,
    },
    recentAudit,
  };
}

export async function getAdminUsers(
  prisma: PrismaClient,
  search: AdminUserSearch,
) {
  const where: Prisma.UserWhereInput = {
    ...(search.q
      ? {
          OR: [
            { name: { contains: search.q, mode: "insensitive" } },
            {
              email: { contains: search.q.toLowerCase(), mode: "insensitive" },
            },
          ],
        }
      : {}),
    ...(search.role ? { role: search.role } : {}),
    ...(search.status ? { accountStatus: search.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        moderationVersion: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...pagination(search.page),
    }),
    prisma.user.count({ where }),
  ]);

  return pageResult(items, total, search.page);
}

export async function getAdminUserDetail(prisma: PrismaClient, userId: string) {
  const [user, audit] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        moderationVersion: true,
        suspendedAt: true,
        restoredAt: true,
        createdAt: true,
      },
    }),
    prisma.adminAuditEvent.findMany({
      where: { targetUserId: userId },
      select: auditDetailSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
    }),
  ]);
  return user ? { user, audit } : null;
}

export async function getAdminCompanies(
  prisma: PrismaClient,
  search: AdminCompanySearch,
) {
  const where: Prisma.CompanyWhereInput = {
    ...(search.q ? { name: { contains: search.q, mode: "insensitive" } } : {}),
    ...(search.status ? { moderationStatus: search.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        moderationStatus: true,
        moderationVersion: true,
        createdAt: true,
        _count: {
          select: { memberships: { where: { role: "OWNER" } } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...pagination(search.page),
    }),
    prisma.company.count({ where }),
  ]);
  return pageResult(items, total, search.page);
}

export async function getAdminCompanyDetail(
  prisma: PrismaClient,
  companyId: string,
) {
  const [company, audit] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        headquarters: true,
        isPublished: true,
        moderationStatus: true,
        moderationVersion: true,
        moderatedAt: true,
        createdAt: true,
        _count: { select: { jobs: true, memberships: true } },
      },
    }),
    prisma.adminAuditEvent.findMany({
      where: { targetCompanyId: companyId },
      select: auditDetailSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
    }),
  ]);
  return company ? { company, audit } : null;
}

export async function getAdminJobs(
  prisma: PrismaClient,
  search: AdminJobSearch,
) {
  const where: Prisma.JobWhereInput = {
    ...(search.q ? { title: { contains: search.q, mode: "insensitive" } } : {}),
    ...(search.lifecycle ? { status: search.lifecycle } : {}),
    ...(search.status ? { moderationStatus: search.status } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
        moderationVersion: true,
        createdAt: true,
        company: {
          select: {
            name: true,
            isPublished: true,
            moderationStatus: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...pagination(search.page),
    }),
    prisma.job.count({ where }),
  ]);
  return pageResult(items, total, search.page);
}

export async function getAdminJobDetail(prisma: PrismaClient, jobId: string) {
  const [job, audit] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
        moderationVersion: true,
        moderatedAt: true,
        publishedAt: true,
        closedAt: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            isPublished: true,
            moderationStatus: true,
          },
        },
      },
    }),
    prisma.adminAuditEvent.findMany({
      where: { targetJobId: jobId },
      select: auditDetailSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 25,
    }),
  ]);
  if (!job) return null;
  return {
    job: {
      ...job,
      isPubliclyAvailable: isJobPubliclyVisible({
        status: job.status,
        moderationStatus: job.moderationStatus,
        companyIsPublished: job.company.isPublished,
        companyModerationStatus: job.company.moderationStatus,
      }),
    },
    audit,
  };
}

export async function getAdminAudit(
  prisma: PrismaClient,
  search: AdminAuditSearch,
) {
  const where: Prisma.AdminAuditEventWhereInput = {
    ...(search.action ? { action: search.action } : {}),
    ...(search.reason ? { reasonCode: search.reason } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.adminAuditEvent.findMany({
      where,
      select: auditDetailSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...pagination(search.page),
    }),
    prisma.adminAuditEvent.count({ where }),
  ]);
  return pageResult(items, total, search.page);
}

export type AdminAuditRow = Awaited<
  ReturnType<typeof getAdminAudit>
>["items"][number];

export type AdminAuditSummaryRow = Awaited<
  ReturnType<typeof getAdminDashboard>
>["recentAudit"][number];
