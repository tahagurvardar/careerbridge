"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getDashboardPathForRole,
  getSafeInternalPath,
  isDashboardPathAllowedForRole,
  platformRoleSchema,
} from "@/features/auth/roles";
import { registrationSchema, signInSchema } from "@/features/auth/schemas";
import {
  AuthRequestError,
  executeAuthRequest,
} from "@/features/auth/server/auth-request";
import { logAuthFailure } from "@/features/auth/server/logging";
import { requireGuest, requireUser } from "@/features/auth/server/session";
import { getAuth } from "@/lib/auth";

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

  const parsed = registrationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
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
        message: "We could not create your account. Please try again.",
      };
    }

    return {
      success: true,
      redirectTo: getDashboardPathForRole(storedRole.data),
      message: "Your CareerBridge account is ready.",
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
        message: "Too many attempts. Please wait a minute and try again.",
      };
    }

    if (statusCode && [409, 422].includes(statusCode)) {
      return {
        success: false,
        message:
          "We could not create an account with that email. Try signing in or use another email.",
        fieldErrors: {
          email: "This email cannot be used for a new account.",
        },
      };
    }

    logAuthFailure("registration.unexpected_failure", error, {
      category: "infrastructure",
    });

    return {
      success: false,
      message: "We could not create your account. Please try again shortly.",
    };
  }
}

export async function signInUserAction(
  input: unknown,
): Promise<AuthActionResult> {
  await requireGuest();

  const parsed = signInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields and try again.",
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
        message: "Email or password is incorrect.",
      };
    }

    const dashboardPath = getDashboardPathForRole(storedRole.data);
    const callbackPath = getSafeInternalPath(
      parsed.data.callbackPath,
      dashboardPath,
    );

    return {
      success: true,
      redirectTo: isDashboardPathAllowedForRole(storedRole.data, callbackPath)
        ? callbackPath
        : dashboardPath,
      message: "Signed in successfully.",
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
        message: "Too many attempts. Please wait a minute and try again.",
      };
    }

    if (statusCode && [400, 401, 403, 422].includes(statusCode)) {
      return {
        success: false,
        message: "Email or password is incorrect.",
      };
    }

    logAuthFailure("sign_in.unexpected_failure", error, {
      category: "infrastructure",
    });

    return {
      success: false,
      message: "We could not sign you in. Please try again shortly.",
    };
  }
}

export async function signOutAction() {
  await requireUser();

  await getAuth().api.signOut({
    headers: await headers(),
  });

  redirect("/");
}
