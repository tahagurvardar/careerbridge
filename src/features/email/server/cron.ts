import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import type { DispatchResult } from "@/features/email/server/dispatcher";

type CronEnvironment = Record<string, string | undefined>;
type Dispatch = () => Promise<DispatchResult>;

const RESPONSE_HEADERS = {
  "cache-control": "private, no-store",
  "content-type": "application/json; charset=utf-8",
} as const;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isCronRequestAuthorized(
  request: Request,
  env: CronEnvironment,
): boolean {
  const configured = env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  return timingSafeEqual(digest(configured), digest(supplied));
}

export function createCronDispatchHandler(
  dispatch: Dispatch,
  env: CronEnvironment = process.env,
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (!isCronRequestAuthorized(request, env)) {
      return Response.json(
        { ok: false },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    try {
      const result = await dispatch();
      return Response.json(
        {
          ok: true,
          claimed: result.claimed,
          sent: result.sent,
          retryScheduled: result.retryScheduled,
          deadLettered: result.deadLettered,
          skipped: result.skipped,
        },
        { status: 200, headers: RESPONSE_HEADERS },
      );
    } catch {
      return Response.json(
        { ok: false },
        { status: 503, headers: RESPONSE_HEADERS },
      );
    }
  };
}
