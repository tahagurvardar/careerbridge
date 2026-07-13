import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getRetryDelayMs } from "@/features/email/server/dispatcher";

describe("email retry schedule", () => {
  it("uses bounded exponential backoff", () => {
    expect([1, 2, 3, 4, 5, 20].map(getRetryDelayMs)).toEqual([
      60_000, 300_000, 1_800_000, 7_200_000, 43_200_000, 43_200_000,
    ]);
  });
});
