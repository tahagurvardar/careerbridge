import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import type {
  CompanyInvitationStatus,
  CompanyMembershipEventType,
  CompanyMembershipRole,
} from "@/generated/prisma/enums";
import { getInvitationDisplayStatus } from "@/features/company-team/team";
import { expireCompanyInvitations } from "@/features/company-team/server/mutations";

// Every query here is scoped by trusted session identity: team administration
// data (roster with emails, pending invitations, audit history) only behind an
// OWNER-membership predicate, incoming invitations only by
// `inviteeUserId = session user`. Projections are explicit selects — member
// emails appear exclusively in the OWNER-scoped team query, and no query ever
// exposes auth provider data, sessions, notification dedupe keys, or
// invitation activeKeys.

// Bounded reads: teams and their recent history are small, but no query is
// ever unbounded.
const TEAM_MEMBERS_MAX = 200;
const TEAM_PENDING_INVITATIONS_MAX = 50;
const TEAM_AUDIT_EVENTS_MAX = 20;
const INCOMING_INVITATIONS_MAX = 50;

export interface TeamMemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: CompanyMembershipRole;
  joinedAt: Date;
}

export interface TeamPendingInvitationItem {
  id: string;
  status: CompanyInvitationStatus;
  inviteeName: string;
  inviteeEmail: string;
  invitedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export interface TeamAuditEventItem {
  id: string;
  type: CompanyMembershipEventType;
  actorName: string | null;
  subjectName: string | null;
  fromRole: CompanyMembershipRole | null;
  toRole: CompanyMembershipRole | null;
  createdAt: Date;
}

export interface OwnedCompanyTeam {
  company: {
    id: string;
    name: string;
    tagline: string | null;
    isPublished: boolean;
  };
  members: TeamMemberItem[];
  ownerCount: number;
  memberCount: number;
  pendingInvitations: TeamPendingInvitationItem[];
  auditEvents: TeamAuditEventItem[];
}

/**
 * The full team-administration payload for a Company the caller OWNS, or null
 * when the Company does not exist or the caller is not one of its OWNERs (the
 * two cases are indistinguishable). This is the only place member emails are
 * ever projected.
 */
export async function getOwnedCompanyTeam(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
): Promise<OwnedCompanyTeam | null> {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      memberships: { some: { userId, role: "OWNER" } },
    },
    select: { id: true, name: true, tagline: true, isPublished: true },
  });
  if (!company) return null;

  const now = new Date();
  await expireCompanyInvitations(prisma, { companyId }, now);

  const [memberships, invitations, events] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { companyId },
      select: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      take: TEAM_MEMBERS_MAX,
    }),
    prisma.companyInvitation.findMany({
      where: { companyId, status: "PENDING", expiresAt: { gt: now } },
      select: {
        id: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        invitee: { select: { name: true, email: true } },
        invitedBy: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: TEAM_PENDING_INVITATIONS_MAX,
    }),
    prisma.companyMembershipEvent.findMany({
      where: { companyId },
      select: {
        id: true,
        type: true,
        fromRole: true,
        toRole: true,
        createdAt: true,
        actor: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: TEAM_AUDIT_EVENTS_MAX,
    }),
  ]);

  const members: TeamMemberItem[] = memberships.map((membership) => ({
    membershipId: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  }));

  return {
    company,
    members,
    ownerCount: members.filter(({ role }) => role === "OWNER").length,
    memberCount: members.filter(({ role }) => role === "MEMBER").length,
    pendingInvitations: invitations.map((invitation) => ({
      id: invitation.id,
      status: invitation.status,
      inviteeName: invitation.invitee.name,
      inviteeEmail: invitation.invitee.email,
      invitedByName: invitation.invitedBy?.name ?? null,
      createdAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    })),
    auditEvents: events.map((event) => ({
      id: event.id,
      type: event.type,
      actorName: event.actor?.name ?? null,
      subjectName: event.subject?.name ?? null,
      fromRole: event.fromRole,
      toRole: event.toRole,
      createdAt: event.createdAt,
    })),
  };
}

export interface IncomingInvitationItem {
  id: string;
  status: CompanyInvitationStatus;
  companyId: string;
  companyName: string;
  companyTagline: string | null;
  invitedByName: string | null;
  createdAt: Date;
  expiresAt: Date;
  respondedAt: Date | null;
}

/**
 * The caller's own incoming invitations, newest first. Scoped strictly to
 * `inviteeUserId = session user`; the projection carries only the Company's
 * public identity (name, tagline) and the inviter's display name — never
 * membership records, member emails, or audit data.
 */
export async function getIncomingInvitations(
  prisma: PrismaClient,
  inviteeUserId: string,
): Promise<IncomingInvitationItem[]> {
  const now = new Date();
  await expireCompanyInvitations(prisma, { inviteeUserId }, now);

  const invitations = await prisma.companyInvitation.findMany({
    where: { inviteeUserId },
    select: {
      id: true,
      status: true,
      companyId: true,
      createdAt: true,
      expiresAt: true,
      respondedAt: true,
      company: { select: { name: true, tagline: true } },
      invitedBy: { select: { name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: INCOMING_INVITATIONS_MAX,
  });

  return invitations.map((invitation) => ({
    id: invitation.id,
    status: getInvitationDisplayStatus(invitation, now),
    companyId: invitation.companyId,
    companyName: invitation.company.name,
    companyTagline: invitation.company.tagline,
    invitedByName: invitation.invitedBy?.name ?? null,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    respondedAt: invitation.respondedAt,
  }));
}

/**
 * How many actionable (pending, unexpired) invitations the caller has — for
 * the Recruiter dashboard. Recipient identity is always the session user.
 */
export function getPendingIncomingInvitationCount(
  prisma: PrismaClient,
  inviteeUserId: string,
  now: Date = new Date(),
): Promise<number> {
  return prisma.companyInvitation.count({
    where: { inviteeUserId, status: "PENDING", expiresAt: { gt: now } },
  });
}

export interface OwnerTeamSummary {
  ownerCount: number;
  memberCount: number;
  pendingInvitationCount: number;
}

/**
 * Compact team counts for the OWNER's Company workspace card, or null when the
 * caller does not own the Company. Counts only — no names, emails, or
 * invitation details leave this query.
 */
export async function getOwnerTeamSummary(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
  now: Date = new Date(),
): Promise<OwnerTeamSummary | null> {
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      memberships: { some: { userId, role: "OWNER" } },
    },
    select: { id: true },
  });
  if (!company) return null;

  await expireCompanyInvitations(prisma, { companyId }, now);

  const [ownerCount, memberCount, pendingInvitationCount] = await Promise.all([
    prisma.companyMembership.count({ where: { companyId, role: "OWNER" } }),
    prisma.companyMembership.count({ where: { companyId, role: "MEMBER" } }),
    prisma.companyInvitation.count({
      where: { companyId, status: "PENDING", expiresAt: { gt: now } },
    }),
  ]);

  return { ownerCount, memberCount, pendingInvitationCount };
}

export interface OwnMembershipSummary {
  role: CompanyMembershipRole;
  joinedAt: Date;
  ownerCount: number;
}

/**
 * The caller's own membership in a Company plus the current owner count, used
 * to render truthful leave eligibility. Returns null when the caller is not a
 * member. Exposes nothing about other members.
 */
export async function getOwnMembershipSummary(
  prisma: PrismaClient,
  userId: string,
  companyId: string,
): Promise<OwnMembershipSummary | null> {
  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { role: true, createdAt: true },
  });
  if (!membership) return null;

  const ownerCount = await prisma.companyMembership.count({
    where: { companyId, role: "OWNER" },
  });

  return {
    role: membership.role,
    joinedAt: membership.createdAt,
    ownerCount,
  };
}
