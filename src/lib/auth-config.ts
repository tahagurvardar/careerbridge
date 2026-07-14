import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { isPublicRole } from "@/features/auth/roles";
import { resolveAuthRuntimeConfiguration } from "@/lib/env/server";
import { getPrismaClient } from "@/lib/prisma";

const serverOwnedModerationFields = [
  "accountStatus",
  "moderationVersion",
  "suspendedAt",
  "restoredAt",
] as const;

// preferredLocale is mutable only through the dedicated validated locale
// action (src/i18n/actions.ts) — never through generic auth user updates.
const serverOwnedPreferenceFields = ["preferredLocale"] as const;

export function createAuth({
  enableNextCookies = true,
  prismaClient,
}: {
  enableNextCookies?: boolean;
  prismaClient?: ReturnType<typeof getPrismaClient>;
} = {}) {
  const { baseURL, secret, trustedOrigins, secureCookies } =
    resolveAuthRuntimeConfiguration();
  const databaseClient = prismaClient ?? getPrismaClient();

  return betterAuth({
    appName: "CareerBridge",
    baseURL,
    secret,
    database: prismaAdapter(databaseClient, {
      provider: "postgresql",
    }),
    trustedOrigins,
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
            if (
              serverOwnedModerationFields.some((field) =>
                Object.prototype.hasOwnProperty.call(user, field),
              )
            ) {
              throw new APIError("FORBIDDEN", {
                code: "ACCOUNT_MODERATION_UPDATE_FORBIDDEN",
                message:
                  "Account moderation cannot be changed through auth APIs.",
              });
            }
            if (
              serverOwnedPreferenceFields.some((field) =>
                Object.prototype.hasOwnProperty.call(user, field),
              )
            ) {
              throw new APIError("FORBIDDEN", {
                code: "LOCALE_PREFERENCE_UPDATE_FORBIDDEN",
                message:
                  "Language preference is changed through the dedicated locale action.",
              });
            }
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await databaseClient.user.findUnique({
              where: { id: session.userId },
              select: { accountStatus: true },
            });

            if (user?.accountStatus !== "ACTIVE") {
              throw new APIError("FORBIDDEN", {
                message: "The authentication request could not be completed.",
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
      useSecureCookies: secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
      },
    },
    plugins: enableNextCookies ? [nextCookies()] : [],
  });
}

export type CareerBridgeAuth = ReturnType<typeof createAuth>;
