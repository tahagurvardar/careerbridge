import "dotenv/config";

import { z } from "zod";

import { createAuth } from "@/lib/auth-config";
import { createPrismaClientForConnectionString } from "@/lib/prisma";

const bootstrapSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(80),
  databaseURL: z
    .string()
    .min(1)
    .refine(
      (value) => {
        try {
          return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
        } catch {
          return false;
        }
      },
      { message: "A PostgreSQL bootstrap database URL is required." },
    ),
  betterAuthURL: z.string().url(),
  betterAuthSecret: z.string().min(32),
});

let prisma:
  ReturnType<typeof createPrismaClientForConnectionString> | undefined;

class BootstrapError extends Error {}

async function bootstrapAdmin() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new BootstrapError("Admin bootstrap is disabled in production.");
  }

  if (process.env.ADMIN_BOOTSTRAP_ENABLED !== "true") {
    throw new BootstrapError(
      "Admin bootstrap is disabled. Set ADMIN_BOOTSTRAP_ENABLED=true for an intentional development run.",
    );
  }

  const parsed = bootstrapSchema.safeParse({
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
    name: process.env.ADMIN_BOOTSTRAP_NAME,
    databaseURL: process.env.ADMIN_BOOTSTRAP_DATABASE_URL,
    betterAuthURL: process.env.BETTER_AUTH_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  });

  if (!parsed.success) {
    throw new BootstrapError(
      "Admin bootstrap values are missing or invalid. Check the documented ADMIN_BOOTSTRAP_* variables.",
    );
  }

  prisma = createPrismaClientForConnectionString(parsed.data.databaseURL);
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { role: true },
  });

  if (existing?.role === "ADMIN") {
    console.info("Development admin already exists; no changes were made.");
    return;
  }

  if (existing) {
    throw new BootstrapError(
      "The bootstrap email belongs to a non-admin account. Refusing to elevate an existing public account.",
    );
  }

  const auth = createAuth({
    enableNextCookies: false,
    prismaClient: prisma,
  });
  const result = await auth.api.signUpEmail({
    body: {
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      role: "CANDIDATE",
    },
  });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: result.user.id },
      data: { role: "ADMIN" },
    }),
    prisma.session.deleteMany({ where: { userId: result.user.id } }),
  ]);

  console.info("Development admin bootstrap completed successfully.");
}

bootstrapAdmin()
  .catch((error: unknown) => {
    const message =
      error instanceof BootstrapError
        ? error.message
        : "Development admin bootstrap failed safely.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
