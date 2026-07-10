import "server-only";

import { isAPIError } from "better-auth/api";

type AuthFailureCategory = "rate_limit" | "infrastructure" | "integrity";

function getSafeCode(error: unknown) {
  const candidate = isAPIError(error)
    ? error.body?.code
    : typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined;

  return typeof candidate === "string" && /^[A-Z0-9_]{1,64}$/.test(candidate)
    ? candidate
    : undefined;
}

function getSafeErrorType(error: unknown) {
  if (isAPIError(error)) return "APIError";
  if (!(error instanceof Error)) return typeof error;

  return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(error.name)
    ? error.name
    : "Error";
}

function getSafeStatusCode(error: unknown) {
  if (isAPIError(error)) return error.statusCode;

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number" &&
    Number.isInteger(error.statusCode) &&
    error.statusCode >= 400 &&
    error.statusCode <= 599
  ) {
    return error.statusCode;
  }

  return undefined;
}

export function logAuthFailure(
  event: string,
  error: unknown,
  options: {
    category: AuthFailureCategory;
    level?: "error" | "warn";
  },
) {
  const statusCode = getSafeStatusCode(error);
  const code = getSafeCode(error);
  const diagnostic = {
    event,
    category: options.category,
    errorType: getSafeErrorType(error),
    ...(statusCode ? { statusCode } : {}),
    ...(code ? { code } : {}),
  };

  if (options.level === "warn") {
    console.warn("[careerbridge.auth]", diagnostic);
    return;
  }

  console.error("[careerbridge.auth]", diagnostic);
}
