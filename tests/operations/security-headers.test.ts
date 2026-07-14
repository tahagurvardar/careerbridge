import { describe, expect, it } from "vitest";

import { getSecurityHeaders } from "@/lib/security-headers";

describe("production security headers", () => {
  it("sets conservative global browser protections", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders({}).map(({ key, value }) => [key, value]),
    );
    expect(headers).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers).not.toHaveProperty("Strict-Transport-Security");
    expect(headers).not.toHaveProperty("Content-Security-Policy");
  });

  it("adds HSTS only to a Vercel production deployment", () => {
    const headers = Object.fromEntries(
      getSecurityHeaders({ VERCEL_ENV: "production" }).map(({ key, value }) => [
        key,
        value,
      ]),
    );
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
  });
});
