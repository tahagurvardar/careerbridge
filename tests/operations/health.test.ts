import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createHealthHandler,
  runReadinessCheck,
} from "@/features/operations/health";

describe("health and readiness", () => {
  it("returns a minimal healthy response", async () => {
    const response = await createHealthHandler(async () => 1)();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 503 without database failure details", async () => {
    const privateValue = "database-host.example.test private-table-name";
    const response = await createHealthHandler(async () => {
      throw new Error(privateValue);
    })();
    const body = await response.text();
    expect(response.status).toBe(503);
    expect(body).toBe('{"status":"unavailable"}');
    expect(body).not.toContain(privateValue);
  });

  it("bounds readiness checks with a timeout", async () => {
    const startedAt = Date.now();
    const healthy = await runReadinessCheck(
      () => new Promise(() => undefined),
      10,
    );
    expect(healthy).toBe(false);
    expect(Date.now() - startedAt).toBeLessThan(250);
  });
});
