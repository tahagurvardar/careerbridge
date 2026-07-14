import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { redactLogMetadata } from "@/lib/server-logging";

describe("structured server log redaction", () => {
  it("redacts sensitive keys and unsafe free-form strings", () => {
    expect(
      redactLogMetadata({
        authorization: "Bearer private",
        databaseUrl: "postgresql://private",
        recipientEmail: "candidate@example.test",
        detail: "free form private detail with spaces",
        status: "unavailable",
        count: 2,
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      databaseUrl: "[REDACTED]",
      recipientEmail: "[REDACTED]",
      detail: "[REDACTED]",
      status: "unavailable",
      count: 2,
    });
  });
});
