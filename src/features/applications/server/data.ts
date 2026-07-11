import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type {
  ApplicationStatusValue,
  CandidateApplicationSearch,
  RecruiterApplicationSearch,
} from "@/features/applications/schemas";
import {
  buildCandidateApplicationWhere,
  buildRecruiterApplicationWhere,
} from "@/features/applications/search";

const MAX_RECRUITER_RESULTS = 100;

/** Every recruiter query is scoped to jobs whose company the user OWNS. */
function ownedApplicationWhere(
  userId: string,
): Prisma.JobApplicationWhereInput {
  return {
    job: { company: { memberships: { some: { userId, role: "OWNER" } } } },
  };
}

function emptyStatusCounts(): Record<ApplicationStatusValue, number> {
  return {
    SUBMITTED: 0,
    UNDER_REVIEW: 0,
    INTERVIEW: 0,
    OFFER: 0,
    HIRED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };
}

async function countByStatus(
  prisma: PrismaClient,
  where: Prisma.JobApplicationWhereInput,
) {
  const grouped = await prisma.jobApplication.groupBy({
    by: ["status"],
    where,
    _count: { _all: true },
  });
  const counts = emptyStatusCounts();
  let total = 0;
  for (const row of grouped) {
    counts[row.status] = row._count._all;
    total += row._count._all;
  }
  return { counts, total };
}

const candidateSkillPreview = {
  select: { skill: { select: { name: true } } },
  orderBy: { skill: { normalizedName: "asc" as const } },
} satisfies Prisma.CandidateProfile$skillsArgs;

// ---------------------------------------------------------------------------
// Apply-eligibility reads (server-only; used by the public job page + mutation)
// ---------------------------------------------------------------------------

export function getJobForApplication(prisma: PrismaClient, slug: string) {
  return prisma.job.findFirst({
    where: { slug, status: "PUBLISHED", company: { isPublished: true } },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      location: true,
      employmentType: true,
      workplaceType: true,
      applicationDeadline: true,
      company: { select: { id: true, name: true, slug: true } },
    },
  });
}

export function getCandidateApplicationForJob(
  prisma: PrismaClient,
  candidateId: string,
  jobId: string,
) {
  return prisma.jobApplication.findUnique({
    where: { jobId_candidateId: { jobId, candidateId } },
    select: { id: true, status: true },
  });
}

export async function getCandidateApplyProfile(
  prisma: PrismaClient,
  userId: string,
) {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: {
      headline: true,
      location: true,
      _count: { select: { skills: true } },
    },
  });
  return {
    exists: Boolean(profile),
    headline: profile?.headline ?? null,
    location: profile?.location ?? null,
    skillCount: profile?._count.skills ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Candidate application reads
// ---------------------------------------------------------------------------

export async function getCandidateApplications(
  prisma: PrismaClient,
  candidateId: string,
  search: CandidateApplicationSearch,
) {
  const rows = await prisma.jobApplication.findMany({
    where: buildCandidateApplicationWhere(candidateId, search),
    select: {
      id: true,
      status: true,
      submittedAt: true,
      withdrawnAt: true,
      resumeDocumentId: true,
      job: {
        select: {
          title: true,
          slug: true,
          status: true,
          company: { select: { name: true, slug: true, isPublished: true } },
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
  });

  return rows.map(({ resumeDocumentId, ...application }) => ({
    ...application,
    hasResume: Boolean(resumeDocumentId),
  }));
}

export async function getCandidateApplicationStatusCounts(
  prisma: PrismaClient,
  candidateId: string,
) {
  return countByStatus(prisma, { candidateId });
}

export function getCandidateRecentApplications(
  prisma: PrismaClient,
  candidateId: string,
  take = 4,
) {
  return prisma.jobApplication.findMany({
    where: { candidateId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      job: {
        select: { title: true, company: { select: { name: true } } },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take,
  });
}

export function getCandidateApplication(
  prisma: PrismaClient,
  candidateId: string,
  applicationId: string,
) {
  return prisma.jobApplication.findFirst({
    where: { id: applicationId, candidateId },
    select: {
      id: true,
      status: true,
      coverLetter: true,
      submittedAt: true,
      withdrawnAt: true,
      job: {
        select: {
          title: true,
          slug: true,
          status: true,
          summary: true,
          location: true,
          employmentType: true,
          workplaceType: true,
          company: { select: { name: true, slug: true, isPublished: true } },
        },
      },
      // The exact CV version snapshotted onto this application, if any. Only
      // display-safe fields — never the storage key, hash, or MIME type.
      resumeDocument: {
        select: {
          id: true,
          originalFilename: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
      // Candidate-safe history: status changes and dates only, never the actor.
      history: {
        select: { fromStatus: true, toStatus: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Recruiter application reads (OWNER-scoped)
// ---------------------------------------------------------------------------

export async function getRecruiterApplications(
  prisma: PrismaClient,
  userId: string,
  search: RecruiterApplicationSearch,
) {
  const rows = await prisma.jobApplication.findMany({
    where: buildRecruiterApplicationWhere(userId, search),
    select: {
      id: true,
      status: true,
      submittedAt: true,
      // Selected only to derive an attachment indicator; the id is dropped
      // before the data leaves the server so lists expose state, not document
      // identifiers.
      resumeDocumentId: true,
      candidate: {
        select: {
          name: true,
          email: true,
          candidateProfile: {
            select: { headline: true, location: true },
          },
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          slug: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    take: MAX_RECRUITER_RESULTS,
  });

  return rows.map(({ resumeDocumentId, ...application }) => ({
    ...application,
    hasResume: Boolean(resumeDocumentId),
  }));
}

export async function getRecruiterApplicationStatusCounts(
  prisma: PrismaClient,
  userId: string,
) {
  return countByStatus(prisma, ownedApplicationWhere(userId));
}

export function getRecruiterApplication(
  prisma: PrismaClient,
  userId: string,
  applicationId: string,
) {
  return prisma.jobApplication.findFirst({
    where: {
      id: applicationId,
      job: { company: { memberships: { some: { userId, role: "OWNER" } } } },
    },
    select: {
      id: true,
      status: true,
      coverLetter: true,
      submittedAt: true,
      withdrawnAt: true,
      // The exact CV attached to this application. The recruiter needs the id
      // to build an authorized download link; the download route re-checks
      // OWNER access. Storage key, hash, and MIME type are never selected.
      resumeDocument: {
        select: {
          id: true,
          originalFilename: true,
          sizeBytes: true,
          uploadedAt: true,
        },
      },
      job: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          summary: true,
          location: true,
          employmentType: true,
          workplaceType: true,
          company: {
            select: { id: true, name: true, slug: true, isPublished: true },
          },
        },
      },
      candidate: {
        select: {
          name: true,
          email: true,
          candidateProfile: {
            select: {
              headline: true,
              location: true,
              bio: true,
              skills: candidateSkillPreview,
              education: {
                select: {
                  id: true,
                  school: true,
                  degree: true,
                  fieldOfStudy: true,
                  startYear: true,
                  endYear: true,
                  isCurrent: true,
                },
                orderBy: [{ startYear: "desc" }, { createdAt: "desc" }],
              },
              experience: {
                select: {
                  id: true,
                  companyName: true,
                  jobTitle: true,
                  employmentType: true,
                  location: true,
                  startDate: true,
                  endDate: true,
                  isCurrent: true,
                },
                orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
              },
            },
          },
        },
      },
      history: {
        select: {
          fromStatus: true,
          toStatus: true,
          createdAt: true,
          changedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getJobApplicantPipeline(
  prisma: PrismaClient,
  userId: string,
  jobId: string,
) {
  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      company: { memberships: { some: { userId, role: "OWNER" } } },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      company: { select: { id: true, name: true } },
    },
  });
  if (!job) return null;

  const applicationWhere: Prisma.JobApplicationWhereInput = {
    jobId,
    job: {
      company: { memberships: { some: { userId, role: "OWNER" } } },
    },
  };

  const [applications, statusCounts] = await Promise.all([
    prisma.jobApplication.findMany({
      where: applicationWhere,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        candidate: {
          select: {
            name: true,
            candidateProfile: {
              select: {
                headline: true,
                location: true,
                skills: { ...candidateSkillPreview, take: 6 },
              },
            },
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
    }),
    countByStatus(prisma, applicationWhere),
  ]);

  return {
    job,
    applications,
    statusCounts: statusCounts.counts,
    total: statusCounts.total,
  };
}

export async function getJobApplicationSummary(
  prisma: PrismaClient,
  userId: string,
  jobId: string,
) {
  const where: Prisma.JobApplicationWhereInput = {
    jobId,
    job: { company: { memberships: { some: { userId, role: "OWNER" } } } },
  };
  const [{ counts, total }, recent] = await Promise.all([
    countByStatus(prisma, where),
    prisma.jobApplication.findMany({
      where,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        candidate: {
          select: {
            name: true,
            candidateProfile: { select: { headline: true } },
          },
        },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);
  return { statusCounts: counts, total, recent };
}

export async function getCompanyApplicationOverview(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
) {
  const where: Prisma.JobApplicationWhereInput = {
    job: {
      companyId,
      company: { memberships: { some: { userId, role: "OWNER" } } },
    },
  };
  const [{ counts, total }, recent] = await Promise.all([
    countByStatus(prisma, where),
    prisma.jobApplication.findMany({
      where,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        candidate: { select: { name: true } },
        job: { select: { title: true } },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: 5,
    }),
  ]);
  const active =
    counts.SUBMITTED + counts.UNDER_REVIEW + counts.INTERVIEW + counts.OFFER;
  return { statusCounts: counts, total, active, recent };
}

export async function getRecruiterApplicationDashboard(
  prisma: PrismaClient,
  userId: string,
) {
  const where = ownedApplicationWhere(userId);
  const [{ counts, total }, recent] = await Promise.all([
    countByStatus(prisma, where),
    prisma.jobApplication.findMany({
      where,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        candidate: { select: { name: true } },
        job: { select: { title: true, company: { select: { name: true } } } },
      },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      take: 6,
    }),
  ]);
  return { statusCounts: counts, total, recent };
}
