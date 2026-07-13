import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Server-only Interview reads. Candidate queries are always scoped through
// `application.candidateId = session user`; Recruiter queries through OWNER
// membership on the Application's Job's Company. Unknown and unauthorized ids
// return null/empty, indistinguishable from absence. Every projection is an
// explicit safe selection: Candidate reads never include membership data or
// Recruiter emails, Recruiter reads include only Application-scoped Candidate
// display data already authorized elsewhere, and nothing here selects dedupe
// keys, EmailOutbox rows, or delivery attempts.

const MAX_AGENDA_RESULTS = 100;

/** OWNER-scoped predicate shared by every Recruiter interview read. */
function ownedInterviewWhere(userId: string): Prisma.InterviewWhereInput {
  return {
    application: {
      job: {
        company: { memberships: { some: { userId, role: "OWNER" } } },
      },
    },
  };
}

const candidateListSelect = {
  id: true,
  title: true,
  format: true,
  status: true,
  startAt: true,
  endAt: true,
  timeZone: true,
  application: {
    select: {
      id: true,
      job: { select: { title: true, company: { select: { name: true } } } },
    },
  },
} satisfies Prisma.InterviewSelect;

const recruiterListSelect = {
  id: true,
  title: true,
  format: true,
  status: true,
  startAt: true,
  endAt: true,
  timeZone: true,
  application: {
    select: {
      id: true,
      candidate: { select: { name: true } },
      job: { select: { title: true, company: { select: { name: true } } } },
    },
  },
} satisfies Prisma.InterviewSelect;

// History timeline projection: event facts, schedule snapshots, and the
// actor's display name only (with an "account removed" null fallback).
const eventTimelineSelect = {
  select: {
    id: true,
    type: true,
    fromStatus: true,
    toStatus: true,
    startAt: true,
    endAt: true,
    timeZone: true,
    createdAt: true,
    actor: { select: { name: true } },
  },
  orderBy: { createdAt: "asc" as const },
} satisfies Prisma.Interview$eventsArgs;

// ---------------------------------------------------------------------------
// Candidate reads (scoped through application.candidateId)
// ---------------------------------------------------------------------------

/**
 * The Candidate's agenda: upcoming interviews (soonest first), past
 * interviews (most recent first), and the actionable pending-response count.
 */
export async function getCandidateInterviews(
  prisma: PrismaClient,
  candidateId: string,
  now: Date,
) {
  const scope = { application: { candidateId } };
  const [upcoming, past, pendingResponseCount] = await Promise.all([
    prisma.interview.findMany({
      where: { ...scope, endAt: { gte: now } },
      select: candidateListSelect,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: MAX_AGENDA_RESULTS,
    }),
    prisma.interview.findMany({
      where: { ...scope, endAt: { lt: now } },
      select: candidateListSelect,
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      take: MAX_AGENDA_RESULTS,
    }),
    prisma.interview.count({
      where: { ...scope, status: "PENDING_RESPONSE", endAt: { gte: now } },
    }),
  ]);
  return { upcoming, past, pendingResponseCount };
}

/** One interview owned by the Candidate, with full details and history. */
export function getCandidateInterview(
  prisma: PrismaClient,
  candidateId: string,
  interviewId: string,
) {
  return prisma.interview.findFirst({
    where: { id: interviewId, application: { candidateId } },
    select: {
      id: true,
      title: true,
      format: true,
      status: true,
      startAt: true,
      endAt: true,
      timeZone: true,
      location: true,
      meetingUrl: true,
      instructions: true,
      version: true,
      candidateRespondedAt: true,
      canceledAt: true,
      completedAt: true,
      createdAt: true,
      application: {
        select: {
          id: true,
          status: true,
          job: {
            select: { title: true, company: { select: { name: true } } },
          },
        },
      },
      events: eventTimelineSelect,
    },
  });
}

/**
 * The Candidate's next active interviews for the dashboard: PENDING_RESPONSE
 * or ACCEPTED and not yet ended, soonest first.
 */
export async function getCandidateUpcomingInterviews(
  prisma: PrismaClient,
  candidateId: string,
  now: Date,
  take = 1,
) {
  const scope = { application: { candidateId } };
  const [next, pendingResponseCount] = await Promise.all([
    prisma.interview.findMany({
      where: {
        ...scope,
        status: { in: ["PENDING_RESPONSE", "ACCEPTED"] },
        endAt: { gte: now },
      },
      select: candidateListSelect,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take,
    }),
    prisma.interview.count({
      where: { ...scope, status: "PENDING_RESPONSE", endAt: { gte: now } },
    }),
  ]);
  return { next, pendingResponseCount };
}

/** Interviews attached to one Application the Candidate owns, newest first. */
export function getCandidateApplicationInterviews(
  prisma: PrismaClient,
  candidateId: string,
  applicationId: string,
) {
  return prisma.interview.findMany({
    where: { applicationId, application: { candidateId } },
    select: candidateListSelect,
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: MAX_AGENDA_RESULTS,
  });
}

// ---------------------------------------------------------------------------
// Recruiter reads (scoped through Company OWNER membership)
// ---------------------------------------------------------------------------

/**
 * The OWNER's Company-wide agenda: upcoming interviews (soonest first), past
 * interviews (most recent first), and the count still awaiting a Candidate
 * response.
 */
export async function getRecruiterInterviews(
  prisma: PrismaClient,
  userId: string,
  now: Date,
) {
  const scope = ownedInterviewWhere(userId);
  const [upcoming, past, pendingResponseCount] = await Promise.all([
    prisma.interview.findMany({
      where: { ...scope, endAt: { gte: now } },
      select: recruiterListSelect,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: MAX_AGENDA_RESULTS,
    }),
    prisma.interview.findMany({
      where: { ...scope, endAt: { lt: now } },
      select: recruiterListSelect,
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      take: MAX_AGENDA_RESULTS,
    }),
    prisma.interview.count({
      where: { ...scope, status: "PENDING_RESPONSE", endAt: { gte: now } },
    }),
  ]);
  return { upcoming, past, pendingResponseCount };
}

/**
 * One interview on an Application whose Company the Recruiter OWNS, with full
 * management details, organizer, and history.
 */
export function getRecruiterInterview(
  prisma: PrismaClient,
  userId: string,
  interviewId: string,
) {
  return prisma.interview.findFirst({
    where: { id: interviewId, ...ownedInterviewWhere(userId) },
    select: {
      id: true,
      title: true,
      format: true,
      status: true,
      startAt: true,
      endAt: true,
      timeZone: true,
      location: true,
      meetingUrl: true,
      instructions: true,
      version: true,
      candidateRespondedAt: true,
      canceledAt: true,
      completedAt: true,
      createdAt: true,
      organizer: { select: { name: true } },
      application: {
        select: {
          id: true,
          status: true,
          candidate: {
            select: {
              name: true,
              candidateProfile: { select: { headline: true } },
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              company: { select: { id: true, name: true } },
            },
          },
        },
      },
      events: eventTimelineSelect,
    },
  });
}

/**
 * The OWNER's next active interviews for the dashboard: PENDING_RESPONSE or
 * ACCEPTED and not yet ended, soonest first.
 */
export async function getRecruiterUpcomingInterviews(
  prisma: PrismaClient,
  userId: string,
  now: Date,
  take = 1,
) {
  const scope = ownedInterviewWhere(userId);
  const [next, pendingResponseCount] = await Promise.all([
    prisma.interview.findMany({
      where: {
        ...scope,
        status: { in: ["PENDING_RESPONSE", "ACCEPTED"] },
        endAt: { gte: now },
      },
      select: recruiterListSelect,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take,
    }),
    prisma.interview.count({
      where: { ...scope, status: "PENDING_RESPONSE", endAt: { gte: now } },
    }),
  ]);
  return { next, pendingResponseCount };
}

/** Interviews attached to one Application the Recruiter OWNS, newest first. */
export function getRecruiterApplicationInterviews(
  prisma: PrismaClient,
  userId: string,
  applicationId: string,
) {
  return prisma.interview.findMany({
    where: { applicationId, ...ownedInterviewWhere(userId) },
    select: {
      ...recruiterListSelect,
      version: true,
    },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: MAX_AGENDA_RESULTS,
  });
}
