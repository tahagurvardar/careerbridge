import "server-only";

import { parseSetCookieHeader, toCookieOptions } from "better-auth/cookies";
import { cookies, headers } from "next/headers";

import { getAuth } from "@/lib/auth";
import { resolveAuthRuntimeConfiguration } from "@/lib/env/server";

type AuthEndpointPath = "/sign-in/email" | "/sign-up/email";

export class AuthRequestError extends Error {
  readonly code?: string;
  readonly statusCode: number;

  constructor(statusCode: number, code?: string) {
    super("The authentication request failed.");
    this.name = "AuthRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getResponseCode(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof body.code === "string" &&
    /^[A-Z0-9_]{1,64}$/.test(body.code)
  ) {
    return body.code;
  }

  return undefined;
}

async function applyResponseCookies(response: Response) {
  const setCookie = response.headers.get("set-cookie");

  if (!setCookie) return;

  const cookieStore = await cookies();

  parseSetCookieHeader(setCookie).forEach((attributes, name) => {
    cookieStore.set(name, attributes.value, toCookieOptions(attributes));
  });
}

/**
 * Runs credential endpoints through Better Auth's HTTP handler so its origin
 * checks and rate limiter remain active, then forwards only response cookies.
 */
export async function executeAuthRequest<T>(
  path: AuthEndpointPath,
  body: Record<string, unknown>,
): Promise<T> {
  let baseURL: string;
  try {
    baseURL = resolveAuthRuntimeConfiguration().baseURL;
  } catch {
    throw new AuthRequestError(500);
  }

  const base = new URL(baseURL);
  const incomingHeaders = await headers();
  const requestHeaders = new Headers({
    "content-type": "application/json",
    origin: base.origin,
  });

  for (const name of ["cookie", "user-agent", "x-forwarded-for", "x-real-ip"]) {
    const value = incomingHeaders.get(name);
    if (value) requestHeaders.set(name, value);
  }

  const response = await getAuth().handler(
    new Request(new URL(`/api/auth${path}`, base), {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(body),
    }),
  );
  const responseBody: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new AuthRequestError(response.status, getResponseCode(responseBody));
  }

  await applyResponseCookies(response);
  return responseBody as T;
}
