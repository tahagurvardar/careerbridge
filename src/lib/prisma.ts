import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prisma = globalForPrisma.prisma;

function getHardenedConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  // pg currently treats these values as verify-full and warns that their
  // semantics will weaken in its next major version. Preserve strict TLS now.
  if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

export function createPrismaClientForConnectionString(
  connectionString: string,
) {
  const adapter = new PrismaPg({
    connectionString: getHardenedConnectionString(connectionString),
  });

  return new PrismaClient({ adapter });
}

function createRuntimePrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env and provide a PostgreSQL connection string.",
    );
  }

  return createPrismaClientForConnectionString(connectionString);
}

/**
 * Returns a lazy Prisma singleton.
 *
 * Lazy creation keeps static builds independent from runtime database
 * configuration, while the development global avoids extra pools during HMR.
 */
export function getPrismaClient() {
  prisma ??= createRuntimePrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
