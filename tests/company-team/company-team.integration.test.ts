import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { PlatformRole } from "@/features/auth/roles";

vi.mock("server-only", () => ({}));

const testPrefix = `cb-team-${Date.now()}-${randomBytes(4).toString("hex")}`;
const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

let prisma: PrismaClient;
let mutations: typeof import("@/features/company-team/server/mutations");
let data: typeof import("@/features/company-team/server/data");
const users: Record<string, { id: string; email: string; role: PlatformRole }> =
  {};
const companyIds = new Set<string>();

function getTestDatabaseURL() {
  if (
    process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true" ||
    !process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Database integration tests require explicit opt-in and TEST_DATABASE_URL.",
    );
  }
  if (
    [process.env.DATABASE_URL, process.env.DIRECT_URL].some(
      (url) => url && url === process.env.TEST_DATABASE_URL,
    )
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not match an application database URL.",
    );
  }
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }
  return process.env.TEST_DATABASE_URL;
}

function actor(label: string) {
  const user = users[label];
  return { userId: user.id, role: user.role };
}

async function createCompany(ownerLabel: string, label: string) {
  const owner = users[ownerLabel];
  const company = await prisma.company.create({
    data: {
      name: `${testPrefix} ${label}`,
      slug: `${testPrefix}-${label}`.toLowerCase(),
      memberships: {
        create: { userId: owner.id, role: "OWNER" },
      },
    },
    select: { id: true, slug: true },
  });
  companyIds.add(company.id);
  return company;
}

async function membership(
  companyId: string,
  label: string,
  role = "MEMBER" as const,
) {
  return prisma.companyMembership.create({
    data: { companyId, userId: users[label].id, role },
  });
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Company team invitation and membership boundaries"
    : "Company team invitation and membership boundaries (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      const [prismaModule, mutationModule, dataModule] = await Promise.all([
        import("@/lib/prisma"),
        import("@/features/company-team/server/mutations"),
        import("@/features/company-team/server/data"),
      ]);
      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      mutations = mutationModule;
      data = dataModule;

      const definitions: Array<[string, PlatformRole]> = [
        ["ownerA", "RECRUITER"],
        ["ownerB", "RECRUITER"],
        ["member", "RECRUITER"],
        ["inviteeA", "RECRUITER"],
        ["inviteeB", "RECRUITER"],
        ["inviteeC", "RECRUITER"],
        ["inviteeD", "RECRUITER"],
        ["candidate", "CANDIDATE"],
        ["admin", "ADMIN"],
      ];
      for (const [label, role] of definitions) {
        const user = await prisma.user.create({
          data: {
            id: `${testPrefix}-${label}`,
            name: `Team Test ${label}`,
            email: `${testPrefix}-${label}@example.test`.toLowerCase(),
            role,
          },
          select: { id: true, email: true, role: true },
        });
        users[label] = user;
      }
    }, 30_000);

    afterAll(async () => {
      if (prisma) {
        await prisma.company.deleteMany({
          where: { id: { in: [...companyIds] } },
        });
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
        await prisma.$disconnect();
      }
    }, 30_000);

    it("allows only a same-company OWNER to invite an existing Recruiter", async () => {
      const company = await createCompany("ownerA", "authorization");
      const other = await createCompany("ownerB", "cross-company");
      await membership(company.id, "member");

      const created = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeA.email },
      );
      await expect(
        prisma.companyInvitation.findUnique({
          where: { id: created.invitationId },
        }),
      ).resolves.toMatchObject({
        companyId: company.id,
        inviteeUserId: users.inviteeA.id,
        status: "PENDING",
      });

      await expect(
        mutations.createCompanyInvitation(prisma, actor("member"), company.id, {
          email: users.inviteeB.email,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        mutations.createCompanyInvitation(prisma, actor("ownerA"), other.id, {
          email: users.inviteeB.email,
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        mutations.createCompanyInvitation(
          prisma,
          actor("candidate"),
          company.id,
          { email: users.inviteeB.email },
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        mutations.createCompanyInvitation(prisma, actor("admin"), company.id, {
          email: users.inviteeB.email,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("rejects non-Recruiter, missing, self, existing-member, and duplicate invitees", async () => {
      const company = await createCompany("ownerA", "eligibility");
      await membership(company.id, "member");

      for (const email of [
        users.candidate.email,
        users.admin.email,
        `${testPrefix}-missing@example.test`,
      ]) {
        await expect(
          mutations.createCompanyInvitation(
            prisma,
            actor("ownerA"),
            company.id,
            { email },
          ),
        ).rejects.toMatchObject({ code: "INVITEE_NOT_ELIGIBLE" });
      }
      await expect(
        mutations.createCompanyInvitation(prisma, actor("ownerA"), company.id, {
          email: users.ownerA.email,
        }),
      ).rejects.toMatchObject({ code: "SELF_INVITE" });
      await expect(
        mutations.createCompanyInvitation(prisma, actor("ownerA"), company.id, {
          email: users.member.email,
        }),
      ).rejects.toMatchObject({ code: "ALREADY_MEMBER" });

      await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeB.email },
      );
      await expect(
        mutations.createCompanyInvitation(prisma, actor("ownerA"), company.id, {
          email: users.inviteeB.email,
        }),
      ).rejects.toMatchObject({ code: "DUPLICATE_INVITATION" });
    });

    it("replaces an expired invitation and emits one invitee-owned notification", async () => {
      const company = await createCompany("ownerA", "expiry-notification");
      const first = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeC.email },
      );
      await prisma.companyInvitation.update({
        where: { id: first.invitationId },
        data: { expiresAt: new Date(Date.now() - 1_000) },
      });

      const replacement = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeC.email },
      );
      expect(replacement.invitationId).not.toBe(first.invitationId);
      await expect(
        prisma.companyInvitation.findUnique({
          where: { id: first.invitationId },
        }),
      ).resolves.toMatchObject({ status: "EXPIRED", activeKey: null });
      expect(
        await prisma.notification.count({
          where: {
            recipientUserId: users.inviteeC.id,
            type: "COMPANY_INVITATION_RECEIVED",
            companyId: company.id,
          },
        }),
      ).toBe(2);
      expect(
        await prisma.notification.count({
          where: {
            recipientUserId: users.ownerA.id,
            type: "COMPANY_INVITATION_RECEIVED",
            companyId: company.id,
          },
        }),
      ).toBe(0);
    });

    it("accepts exactly once under concurrency and creates one MEMBER plus audit event", async () => {
      const company = await createCompany("ownerA", "concurrent-accept");
      const invitation = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeD.email },
      );

      const results = await Promise.allSettled([
        mutations.acceptCompanyInvitation(
          prisma,
          actor("inviteeD"),
          invitation.invitationId,
        ),
        mutations.acceptCompanyInvitation(
          prisma,
          actor("inviteeD"),
          invitation.invitationId,
        ),
      ]);
      expect(
        results.filter(({ status }) => status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        await prisma.companyMembership.count({
          where: {
            companyId: company.id,
            userId: users.inviteeD.id,
            role: "MEMBER",
          },
        }),
      ).toBe(1);
      expect(
        await prisma.companyMembershipEvent.count({
          where: {
            invitationId: invitation.invitationId,
            type: "INVITATION_ACCEPTED",
          },
        }),
      ).toBe(1);
    });

    it("supports decline and OWNER revocation while enforcing invitee ownership", async () => {
      const declineCompany = await createCompany("ownerA", "decline");
      const declineInvite = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        declineCompany.id,
        { email: users.inviteeA.email },
      );
      await expect(
        mutations.declineCompanyInvitation(
          prisma,
          actor("inviteeB"),
          declineInvite.invitationId,
        ),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await mutations.declineCompanyInvitation(
        prisma,
        actor("inviteeA"),
        declineInvite.invitationId,
      );

      const revokeCompany = await createCompany("ownerA", "revoke");
      const revokeInvite = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        revokeCompany.id,
        { email: users.inviteeB.email },
      );
      await mutations.revokeCompanyInvitation(
        prisma,
        actor("ownerA"),
        revokeCompany.id,
        revokeInvite.invitationId,
      );
      const statuses = await prisma.companyInvitation.findMany({
        where: {
          id: { in: [declineInvite.invitationId, revokeInvite.invitationId] },
        },
        orderBy: { status: "asc" },
        select: { status: true },
      });
      expect(statuses.map(({ status }) => status).sort()).toEqual([
        "DECLINED",
        "REVOKED",
      ]);
    });

    it("promotes, demotes, removes, transfers ownership, and retains audit history", async () => {
      const company = await createCompany("ownerA", "membership-lifecycle");
      const promoted = await membership(company.id, "inviteeA");
      const removed = await membership(company.id, "inviteeB");
      const transferTarget = await membership(company.id, "inviteeC");

      await mutations.promoteCompanyMember(
        prisma,
        actor("ownerA"),
        company.id,
        promoted.id,
      );
      await mutations.demoteCompanyOwner(
        prisma,
        actor("ownerA"),
        company.id,
        promoted.id,
      );
      await mutations.removeCompanyMember(
        prisma,
        actor("ownerA"),
        company.id,
        removed.id,
      );
      await mutations.transferCompanyOwnership(
        prisma,
        actor("ownerA"),
        company.id,
        transferTarget.id,
      );

      await expect(
        prisma.companyMembership.findUnique({
          where: { id: transferTarget.id },
        }),
      ).resolves.toMatchObject({ role: "OWNER" });
      await expect(
        prisma.companyMembership.findUnique({
          where: {
            userId_companyId: {
              userId: users.ownerA.id,
              companyId: company.id,
            },
          },
        }),
      ).resolves.toMatchObject({ role: "MEMBER" });
      expect(
        await prisma.companyMembershipEvent.count({
          where: { companyId: company.id },
        }),
      ).toBe(5);

      await mutations.leaveCompany(prisma, actor("ownerA"), company.id);
      expect(
        await prisma.companyMembership.count({
          where: { companyId: company.id, userId: users.ownerA.id },
        }),
      ).toBe(0);
      expect(
        await prisma.companyMembershipEvent.count({
          where: { companyId: company.id, type: "MEMBER_LEFT" },
        }),
      ).toBe(1);
    });

    it("protects the final OWNER from demotion, removal, and leaving", async () => {
      const company = await createCompany("ownerB", "final-owner");
      const ownerMembership = await prisma.companyMembership.findUniqueOrThrow({
        where: {
          userId_companyId: { userId: users.ownerB.id, companyId: company.id },
        },
      });
      await expect(
        mutations.demoteCompanyOwner(
          prisma,
          actor("ownerB"),
          company.id,
          ownerMembership.id,
        ),
      ).rejects.toMatchObject({ code: "LAST_OWNER" });
      await expect(
        mutations.removeCompanyMember(
          prisma,
          actor("ownerB"),
          company.id,
          ownerMembership.id,
        ),
      ).rejects.toMatchObject({ code: "SELF_TARGET" });
      await expect(
        mutations.leaveCompany(prisma, actor("ownerB"), company.id),
      ).rejects.toMatchObject({ code: "LAST_OWNER" });
      expect(
        await prisma.companyMembership.count({
          where: { companyId: company.id, role: "OWNER" },
        }),
      ).toBe(1);
    });

    it("keeps team data OWNER-only and notifications do not grant Company access", async () => {
      const company = await createCompany("ownerA", "privacy");
      await membership(company.id, "member");
      const invitation = await mutations.createCompanyInvitation(
        prisma,
        actor("ownerA"),
        company.id,
        { email: users.inviteeA.email },
      );

      const ownerView = await data.getOwnedCompanyTeam(
        prisma,
        users.ownerA.id,
        company.id,
      );
      expect(
        ownerView?.members.some(({ email }) => email === users.member.email),
      ).toBe(true);
      expect(
        await data.getOwnedCompanyTeam(prisma, users.member.id, company.id),
      ).toBeNull();
      expect(
        await data.getOwnedCompanyTeam(prisma, users.inviteeA.id, company.id),
      ).toBeNull();

      const incoming = await data.getIncomingInvitations(
        prisma,
        users.inviteeA.id,
      );
      expect(incoming.some(({ id }) => id === invitation.invitationId)).toBe(
        true,
      );
      expect(
        await prisma.companyMembership.count({
          where: { companyId: company.id, userId: users.inviteeA.id },
        }),
      ).toBe(0);
      expect(
        await prisma.notification.count({
          where: {
            recipientUserId: users.inviteeA.id,
            companyId: company.id,
            type: "COMPANY_INVITATION_RECEIVED",
          },
        }),
      ).toBe(1);
    });
  },
);
