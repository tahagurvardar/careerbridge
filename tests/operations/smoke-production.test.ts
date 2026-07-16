import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("production smoke script", () => {
  it("reaches runtime validation when executed through tsx", () => {
    const env = { ...process.env };
    delete env.SMOKE_TEST_BASE_URL;

    const result = spawnSync(
      process.execPath,
      [require.resolve("tsx/cli"), path.resolve("scripts/smoke-production.ts")],
      {
        cwd: path.resolve("."),
        encoding: "utf8",
        env,
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toContain(
      "Production smoke checks require a deployment URL argument or SMOKE_TEST_BASE_URL.",
    );
    expect(output).not.toContain("Top-level await");
    expect(output).not.toContain("TransformError");
  });
});
