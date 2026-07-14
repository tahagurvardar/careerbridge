import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { PrismaClient } from "@/generated/prisma/client";
import { runReadinessCheck } from "@/features/operations/health";

const integrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" &&
  Boolean(process.env.TEST_DATABASE_URL);

function testDatabaseUrl(): string {
  const value = process.env.TEST_DATABASE_URL;
  if (process.env.RUN_DATABASE_INTEGRATION_TESTS !== "true" || !value) {
    throw new Error(
      "Database integration tests require explicit opt-in and TEST_DATABASE_URL.",
    );
  }
  if ([process.env.DATABASE_URL, process.env.DIRECT_URL].includes(value)) {
    throw new Error(
      "TEST_DATABASE_URL must not match an application database URL.",
    );
  }
  const url = new URL(value);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a PostgreSQL connection URL.");
  }
  return value;
}

describe.skipIf(!integrationEnabled)("health database readiness", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    const prismaModule = await import("@/lib/prisma");
    prisma =
      prismaModule.createPrismaClientForConnectionString(testDatabaseUrl());
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("performs a bounded, read-only readiness probe", async () => {
    const healthy = await runReadinessCheck(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    expect(healthy).toBe(true);
  });
});
