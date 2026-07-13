import "server-only";

import { safeEmailDestination } from "@/features/email/email";

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : fallback;
}

export function getEmailBatchSize(): number {
  return boundedInteger(process.env.EMAIL_BATCH_SIZE, 20, 1, 100);
}

export function getEmailMaxAttempts(): number {
  return boundedInteger(process.env.EMAIL_MAX_ATTEMPTS, 5, 1, 10);
}

export function getEmailAppBaseUrl(): URL {
  const raw = process.env.EMAIL_APP_BASE_URL?.trim();
  if (!raw && process.env.NODE_ENV !== "production") {
    return new URL("http://localhost:3000");
  }
  if (!raw) throw new Error("EMAIL_CONFIG_MISSING_APP_BASE_URL");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("EMAIL_CONFIG_INVALID_APP_BASE_URL");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("EMAIL_CONFIG_INVALID_APP_BASE_URL");
  }
  const localhost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  if (
    (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
    (!localhost && url.protocol !== "https:")
  ) {
    throw new Error("EMAIL_CONFIG_HTTPS_REQUIRED");
  }
  return url;
}

export function buildAbsoluteEmailDestination(path: string): string {
  const safePath = safeEmailDestination(path);
  return new URL(safePath, getEmailAppBaseUrl()).toString();
}
