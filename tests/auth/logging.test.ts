import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { logAuthFailure } from "@/features/auth/server/logging";

describe("auth diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs only allow-listed metadata and omits error messages", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const error = Object.assign(
      new Error("sensitive-user@example.test secret-session-value"),
      { code: "ECONNREFUSED" },
    );

    logAuthFailure("sign_in.unexpected_failure", error, {
      category: "infrastructure",
    });

    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith("[careerbridge.auth]", {
      event: "sign_in.unexpected_failure",
      category: "infrastructure",
      errorType: "Error",
      code: "ECONNREFUSED",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sensitive-user",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "secret-session-value",
    );
  });

  it("drops unsafe error codes instead of logging arbitrary values", () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const error = Object.assign(new Error("do not log me"), {
      code: "unsafe code containing details",
    });

    logAuthFailure("registration.rate_limited", error, {
      category: "rate_limit",
      level: "warn",
    });

    expect(consoleWarn).toHaveBeenCalledWith("[careerbridge.auth]", {
      event: "registration.rate_limited",
      category: "rate_limit",
      errorType: "Error",
    });
  });

  it("retains safe status metadata for handler failures", () => {
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const error = Object.assign(new Error("response body must stay private"), {
      name: "AuthRequestError",
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
    });

    logAuthFailure("sign_in.rate_limited", error, {
      category: "rate_limit",
      level: "warn",
    });

    expect(consoleWarn).toHaveBeenCalledWith("[careerbridge.auth]", {
      event: "sign_in.rate_limited",
      category: "rate_limit",
      errorType: "AuthRequestError",
      statusCode: 429,
      code: "TOO_MANY_REQUESTS",
    });
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain(
      "response body",
    );
  });
});
