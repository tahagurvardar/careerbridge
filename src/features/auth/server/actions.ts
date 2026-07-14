"use server";

import { isAPIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getDashboardPathForRole,
  getSafeInternalPath,
  isDashboardPathAllowedForRole,
  platformRoleSchema,
} from "@/features/auth/roles";
import {
  createRegistrationSchema,
  createSignInSchema,
} from "@/features/auth/schemas";
import {
  AuthRequestError,
  executeAuthRequest,
} from "@/features/auth/server/auth-request";
import { logAuthFailure } from "@/features/auth/server/logging";
import { requireGuest, requireUser } from "@/features/auth/server/session";
import { dbLocaleToRoute, routeLocaleToDb } from "@/i18n/config";
import { getLocaleCookieOptions, LOCALE_COOKIE_NAME } from "@/i18n/cookie";
import { canonicalizeInternalPath, localizeInternalPath } from "@/i18n/paths";
import { getRequestDictionary } from "@/i18n/server";
import { getAuth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

type FieldErrors = Record<string, string | undefined>;

export type AuthActionResult =
  | { success: true; redirectTo: string; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: FieldErrors;
    };

function getFieldErrors(error: {
  flatten(): { fieldErrors: Record<string, string[] | undefined> };
}) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
      field,
      messages?.[0],
    ]),
  );
}

function getAuthStatusCode(error: unknown) {
  if (error instanceof AuthRequestError || isAPIError(error)) {
    return error.statusCode;
  }

  return undefined;
}

export async function registerUserAction(
  input: unknown,
): Promise<AuthActionResult> {
  await requireGuest();

  const { locale, dictionary } = await getRequestDictionary();
  const messages = dictionary.auth.serverMessages;
  const parsed = createRegistrationSchema(dictionary.validation).safeParse(
    input,
  );

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  const { role, fullName, email, password } = parsed.data;

  try {
    const result = await executeAuthRequest<{ user: { role: unknown } }>(
      "/sign-up/email",
      {
        name: fullName,
        email,
        password,
        role,
      },
    );
    const storedRole = platformRoleSchema.safeParse(result.user.role);

    if (!storedRole.success) {
      logAuthFailure("registration.invalid_persisted_role", undefined, {
        category: "integrity",
      });
      return {
        success: false,
        message: messages.registrationFailed,
      };
    }

    // Adopt the registration UI language as the initial stored preference and
    // mirror it into the locale cookie. The value is the server-validated
    // request locale — never a browser-supplied field — and later changes go
    // through the dedicated locale action only.
    try {
      await getPrismaClient().user.update({
        where: { email },
        data: { preferredLocale: routeLocaleToDb(locale) },
        select: { id: true },
      });
    } catch {
      // Preference initialization is best-effort; the account stays at the
      // migration default (EN) if this write races account state.
    }
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, locale, getLocaleCookieOptions());

    return {
      success: true,
      redirectTo: localizeInternalPath(
        getDashboardPathForRole(storedRole.data),
        locale,
      ),
      message: messages.accountReady,
    };
  } catch (error) {
    const statusCode = getAuthStatusCode(error);

    if (statusCode === 429) {
      logAuthFailure("registration.rate_limited", error, {
        category: "rate_limit",
        level: "warn",
      });
      return {
        success: false,
        message: messages.tooManyAttempts,
      };
    }

    if (statusCode && [409, 422].includes(statusCode)) {
      return {
        success: false,
        message: messages.emailUnavailable,
        fieldErrors: {
          email: messages.emailUnavailableField,
        },
      };
    }

    logAuthFailure("registration.unexpected_failure", error, {
      category: "infrastructure",
    });

    return {
      success: false,
      message: messages.registrationFailedRetry,
    };
  }
}

export async function signInUserAction(
  input: unknown,
): Promise<AuthActionResult> {
  await requireGuest();

  const { dictionary } = await getRequestDictionary();
  const messages = dictionary.auth.serverMessages;
  const parsed = createSignInSchema(dictionary.validation).safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: messages.checkFields,
      fieldErrors: getFieldErrors(parsed.error),
    };
  }

  try {
    const result = await executeAuthRequest<{ user: { role: unknown } }>(
      "/sign-in/email",
      {
        email: parsed.data.email,
        password: parsed.data.password,
        rememberMe: true,
      },
    );
    const storedRole = platformRoleSchema.safeParse(result.user.role);

    if (!storedRole.success) {
      logAuthFailure("sign_in.invalid_persisted_role", undefined, {
        category: "integrity",
      });
      return {
        success: false,
        message: messages.invalidCredentials,
      };
    }

    // Locale source-of-truth tier 1: the authenticated user's stored
    // preference. Sign-in mirrors it into the device cookie so every later
    // locale-neutral request resolves to it without database reads.
    const account = await getPrismaClient().user.findUnique({
      where: { email: parsed.data.email },
      select: { preferredLocale: true },
    });
    const preferredLocale = dbLocaleToRoute(account?.preferredLocale);
    const cookieStore = await cookies();
    cookieStore.set(
      LOCALE_COOKIE_NAME,
      preferredLocale,
      getLocaleCookieOptions(),
    );

    const dashboardPath = getDashboardPathForRole(storedRole.data);
    // Callback paths are stored canonical (locale-neutral); strip any locale
    // prefix before validating so the role-dashboard check stays exact, then
    // localize the final destination once.
    const callbackPath = canonicalizeInternalPath(
      getSafeInternalPath(parsed.data.callbackPath, dashboardPath),
      dashboardPath,
    );

    return {
      success: true,
      redirectTo: localizeInternalPath(
        isDashboardPathAllowedForRole(storedRole.data, callbackPath)
          ? callbackPath
          : dashboardPath,
        preferredLocale,
      ),
      message: messages.signedIn,
    };
  } catch (error) {
    const statusCode = getAuthStatusCode(error);

    if (statusCode === 429) {
      logAuthFailure("sign_in.rate_limited", error, {
        category: "rate_limit",
        level: "warn",
      });
      return {
        success: false,
        message: messages.tooManyAttempts,
      };
    }

    if (statusCode && [400, 401, 403, 422].includes(statusCode)) {
      return {
        success: false,
        message: messages.invalidCredentials,
      };
    }

    logAuthFailure("sign_in.unexpected_failure", error, {
      category: "infrastructure",
    });

    return {
      success: false,
      message: messages.signInFailed,
    };
  }
}

export async function signOutAction() {
  await requireUser();
  const { locale } = await getRequestDictionary();

  await getAuth().api.signOut({
    headers: await headers(),
  });

  redirect(localizeInternalPath("/", locale));
}
