import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const smokeScript = path.resolve("scripts/smoke-production.ts");
const fetchMock = pathToFileURL(
  path.resolve("tests/fixtures/smoke-production-fetch-mock.mjs"),
).href;

function cleanEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.SMOKE_TEST_BASE_URL;
  delete env.VERCEL_AUTOMATION_BYPASS_SECRET;
  delete env.SMOKE_TEST_EXPECTED_BYPASS_SECRET;
  delete env.SMOKE_TEST_EXPECT_NO_BYPASS;
  delete env.SMOKE_TEST_FAIL_REQUEST;
  return env;
}

function runSmoke(env: NodeJS.ProcessEnv) {
  const nodeOptions = [env.NODE_OPTIONS, `--import=${fetchMock}`]
    .filter(Boolean)
    .join(" ");

  return spawnSync(
    process.execPath,
    [require.resolve("tsx/cli"), smokeScript, "https://smoke.example.test"],
    {
      cwd: path.resolve("."),
      encoding: "utf8",
      env: { ...env, NODE_OPTIONS: nodeOptions },
    },
  );
}

function outputOf(result: ReturnType<typeof spawnSync>) {
  return `${result.stdout}\n${result.stderr}`;
}

describe("production smoke script", () => {
  it("sends the Vercel protection bypass header on every request when configured", () => {
    const secret = "test-vercel-automation-bypass-secret";
    const result = runSmoke({
      ...cleanEnvironment(),
      VERCEL_AUTOMATION_BYPASS_SECRET: secret,
      SMOKE_TEST_EXPECTED_BYPASS_SECRET: secret,
    });

    expect(result.error).toBeUndefined();
    expect(result.status, outputOf(result)).toBe(0);
  });

  it("omits the Vercel protection bypass header when the secret is missing", () => {
    const result = runSmoke({
      ...cleanEnvironment(),
      SMOKE_TEST_EXPECT_NO_BYPASS: "true",
    });

    expect(result.error).toBeUndefined();
    expect(result.status, outputOf(result)).toBe(0);
  });

  it("never includes the bypass secret in error output", () => {
    const secret = "secret-that-must-not-appear-in-output";
    const result = runSmoke({
      ...cleanEnvironment(),
      VERCEL_AUTOMATION_BYPASS_SECRET: secret,
      SMOKE_TEST_EXPECTED_BYPASS_SECRET: secret,
      SMOKE_TEST_FAIL_REQUEST: "true",
    });
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toContain("Simulated smoke request failure.");
    expect(output).not.toContain(secret);
  });

  it("reaches runtime validation when executed through tsx", () => {
    const env = cleanEnvironment();

    const result = spawnSync(
      process.execPath,
      [require.resolve("tsx/cli"), smokeScript],
      {
        cwd: path.resolve("."),
        encoding: "utf8",
        env,
      },
    );
    const output = outputOf(result);

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(output).toContain(
      "Production smoke checks require a deployment URL argument or SMOKE_TEST_BASE_URL.",
    );
    expect(output).not.toContain("Top-level await");
    expect(output).not.toContain("TransformError");
  });
});
