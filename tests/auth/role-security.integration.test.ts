import "dotenv/config";

import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { PublicRole } from "@/features/auth/roles";
import type { CareerBridgeAuth } from "@/lib/auth-config";
import type { createPrismaClientForConnectionString } from "@/lib/prisma";

vi.mock("server-only", () => ({}));

type Prisma = ReturnType<typeof createPrismaClientForConnectionString>;
type RoutePost = typeof import("@/app/api/auth/[...all]/route").POST;

type TestIdentity = {
  cookie: string;
  id: string;
  role: PublicRole;
};

const testPrefix = `cb-security-${Date.now()}-${randomBytes(4).toString("hex")}`;
const testPassword = `${randomBytes(18).toString("base64url")}Aa1!`;

let auth: CareerBridgeAuth;
let prisma: Prisma;
let routePost: RoutePost;
let candidate: TestIdentity;
let recruiter: TestIdentity;

const databaseIntegrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);
const databaseDescribe = databaseIntegrationEnabled
  ? describe.sequential
  : describe.skip;

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
      (applicationURL) =>
        applicationURL && process.env.TEST_DATABASE_URL === applicationURL,
    )
  ) {
    throw new Error(
      "TEST_DATABASE_URL must not match an application database URL.",
    );
  }

  let url: URL;

  try {
    url = new URL(process.env.TEST_DATABASE_URL);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }

  return process.env.TEST_DATABASE_URL;
}

function requireAuthEnvironment() {
  for (const name of ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
    if (!process.env[name]) {
      throw new Error(`Missing required integration-test variable: ${name}`);
    }
  }
}

function getEmail(label: string) {
  return `${testPrefix}-${label}@example.test`;
}

async function register(role: PublicRole): Promise<TestIdentity> {
  const result = await auth.api.signUpEmail({
    returnHeaders: true,
    body: {
      email: getEmail(role.toLowerCase()),
      password: testPassword,
      name: `${role === "CANDIDATE" ? "Candidate" : "Recruiter"} Security Test`,
      role,
    },
  });
  const cookie = result.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");

  return { cookie, id: result.response.user.id, role };
}

function createUpdateRequest(cookie: string, body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/update-user", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

async function expectRoleMutationRejected(
  identity: TestIdentity,
  targetRole: string,
) {
  const allowedName = `${identity.role} ${targetRole} positive control`;
  const allowedResponse = await auth.handler(
    createUpdateRequest(identity.cookie, { name: allowedName }),
  );
  expect(allowedResponse.status).toBe(200);

  const allowedStored = await prisma.user.findUniqueOrThrow({
    where: { id: identity.id },
    select: { name: true, role: true },
  });
  expect(allowedStored).toEqual({ name: allowedName, role: identity.role });

  const hookResponse = await auth.handler(
    createUpdateRequest(identity.cookie, { role: targetRole }),
  );
  expect(hookResponse.status).toBe(403);
  await expect(hookResponse.json()).resolves.toMatchObject({
    code: "ROLE_UPDATE_FORBIDDEN",
  });

  const stored = await prisma.user.findUniqueOrThrow({
    where: { id: identity.id },
    select: { name: true, role: true },
  });
  expect(stored).toEqual({ name: allowedName, role: identity.role });
}

databaseDescribe(
  databaseIntegrationEnabled
    ? "Better Auth role security"
    : "Better Auth role security (skipped: set TEST_DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=true)",
  () => {
    beforeAll(async () => {
      requireAuthEnvironment();

      const [{ createAuth }, prismaModule, routeModule] = await Promise.all([
        import("@/lib/auth-config"),
        import("@/lib/prisma"),
        import("@/app/api/auth/[...all]/route"),
      ]);

      prisma =
        prismaModule.createPrismaClientForConnectionString(
          getTestDatabaseURL(),
        );
      auth = createAuth({ enableNextCookies: false, prismaClient: prisma });
      routePost = routeModule.POST;
      candidate = await register("CANDIDATE");
      recruiter = await register("RECRUITER");
    }, 30_000);

    afterAll(async () => {
      if (prisma) {
        await prisma.user.deleteMany({
          where: { email: { startsWith: testPrefix } },
        });
        await prisma.$disconnect();
      }
    }, 30_000);

    it("stores Candidate registration as CANDIDATE", async () => {
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: candidate.id },
        select: { role: true },
      });

      expect(stored.role).toBe("CANDIDATE");
    });

    it("stores Recruiter registration as RECRUITER", async () => {
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: recruiter.id },
        select: { role: true },
      });

      expect(stored.role).toBe("RECRUITER");
    });

    it("rejects public ADMIN registration", async () => {
      const email = getEmail("admin-attempt");

      await expect(
        auth.api.signUpEmail({
          body: {
            email,
            password: testPassword,
            name: "Admin Registration Attempt",
            role: "ADMIN",
          },
        }),
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    });

    it("returns 404 from the mounted public update-user endpoint", async () => {
      const publicResponse = await routePost(
        createUpdateRequest(candidate.cookie, {
          name: "Blocked public update",
        }),
      );

      expect(publicResponse.status).toBe(404);
    });

    it("prevents Candidate from updating role to ADMIN", async () => {
      await expectRoleMutationRejected(candidate, "ADMIN");
    });

    it("prevents Recruiter from updating role to ADMIN", async () => {
      await expectRoleMutationRejected(recruiter, "ADMIN");
    });

    it("prevents Candidate from updating role to RECRUITER", async () => {
      await expectRoleMutationRejected(candidate, "RECRUITER");
    });

    it("prevents Recruiter from updating role to CANDIDATE", async () => {
      await expectRoleMutationRejected(recruiter, "CANDIDATE");
    });

    it.each([
      ["accountStatus", "SUSPENDED"],
      ["moderationVersion", 99],
      ["suspendedAt", new Date().toISOString()],
      ["restoredAt", new Date().toISOString()],
      ["preferredLocale", "RU"],
    ])("prevents public updates to %s", async (field, value) => {
      const response = await auth.handler(
        createUpdateRequest(candidate.cookie, { [field]: value }),
      );

      expect(response.status).toBe(400);
      await expect(
        prisma.user.findUniqueOrThrow({
          where: { id: candidate.id },
          select: {
            accountStatus: true,
            moderationVersion: true,
            suspendedAt: true,
            restoredAt: true,
            preferredLocale: true,
          },
        }),
      ).resolves.toEqual({
        accountStatus: "ACTIVE",
        moderationVersion: 1,
        suspendedAt: null,
        restoredAt: null,
        preferredLocale: "EN",
      });
    });
  },
);
