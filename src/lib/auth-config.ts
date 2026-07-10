import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { isPublicRole } from "@/features/auth/roles";
import { getPrismaClient } from "@/lib/prisma";

function getAuthEnvironment() {
  const baseURL = process.env.BETTER_AUTH_URL;
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!baseURL || !secret) {
    throw new Error(
      "Better Auth is not configured. Set BETTER_AUTH_URL and BETTER_AUTH_SECRET.",
    );
  }

  const parsedBaseURL = new URL(baseURL);

  if (
    process.env.NODE_ENV === "production" &&
    parsedBaseURL.protocol !== "https:"
  ) {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.");
  }

  return { baseURL: parsedBaseURL.origin, secret };
}

export function createAuth({
  enableNextCookies = true,
  prismaClient,
}: {
  enableNextCookies?: boolean;
  prismaClient?: ReturnType<typeof getPrismaClient>;
} = {}) {
  const { baseURL, secret } = getAuthEnvironment();
  const isProduction = process.env.NODE_ENV === "production";
  const developmentOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

  return betterAuth({
    appName: "CareerBridge",
    baseURL,
    secret,
    database: prismaAdapter(prismaClient ?? getPrismaClient(), {
      provider: "postgresql",
    }),
    trustedOrigins: isProduction
      ? [baseURL]
      : Array.from(new Set([baseURL, ...developmentOrigins])),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: "CANDIDATE",
          input: true,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isPublicRole(user.role)) {
              throw new APIError("BAD_REQUEST", {
                message: "This account type is not available for registration.",
              });
            }
          },
        },
        update: {
          before: async (user) => {
            if (Object.prototype.hasOwnProperty.call(user, "role")) {
              throw new APIError("FORBIDDEN", {
                code: "ROLE_UPDATE_FORBIDDEN",
                message: "Platform roles cannot be changed through auth APIs.",
              });
            }
          },
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: "memory",
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      cookiePrefix: "careerbridge",
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
      },
    },
    plugins: enableNextCookies ? [nextCookies()] : [],
  });
}

export type CareerBridgeAuth = ReturnType<typeof createAuth>;
