import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createCronDispatchHandler } from "@/features/email/server/cron";

const result = {
  claimed: 2,
  sent: 1,
  retryScheduled: 1,
  deadLettered: 0,
  skipped: 0,
};

function cronRequest(secret?: string) {
  return new Request(
    "https://careerbridge.example.invalid/api/internal/email-dispatch/cron",
    {
      headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
    },
  );
}

describe("Vercel Cron email dispatcher adapter", () => {
  it("rejects a missing configured secret", async () => {
    const dispatch = vi.fn(async () => result);
    const response = await createCronDispatchHandler(
      dispatch,
      {},
    )(cronRequest("supplied"));
    expect(response.status).toBe(401);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("rejects invalid authorization", async () => {
    const dispatch = vi.fn(async () => result);
    const response = await createCronDispatchHandler(dispatch, {
      CRON_SECRET: "configured",
    })(cronRequest("invalid"));
    expect(response.status).toBe(401);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("invokes the existing dispatcher directly for valid authorization", async () => {
    const dispatch = vi.fn(async () => result);
    const response = await createCronDispatchHandler(dispatch, {
      CRON_SECRET: "configured",
    })(cronRequest("configured"));
    expect(response.status).toBe(200);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(await response.json()).toEqual({ ok: true, ...result });
  });

  it("returns only minimal aggregates and never leaks queue/provider detail", async () => {
    const privateValue = "recipient@example.test provider-private-body";
    const response = await createCronDispatchHandler(
      async () => {
        throw new Error(privateValue);
      },
      { CRON_SECRET: "configured" },
    )(cronRequest("configured"));
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toBe('{"ok":false}');
    expect(body).not.toContain(privateValue);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
