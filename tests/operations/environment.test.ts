import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  EnvironmentValidationError,
  resolveApplicationOrigin,
  resolveAuthRuntimeConfiguration,
  validateServerEnvironment,
  type EnvironmentSource,
} from "@/lib/env/server";

function productionEnvironment(
  overrides: EnvironmentSource = {},
): EnvironmentSource {
  return {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    APP_BASE_URL: "https://careerbridge.example.invalid",
    DATABASE_URL:
      "postgresql://runtime:runtime@prod-pooler.example.invalid/app?sslmode=verify-full",
    DIRECT_URL:
      "postgresql://migration:migration@prod-direct.example.invalid/app?sslmode=verify-full",
    BETTER_AUTH_URL: "https://careerbridge.example.invalid",
    BETTER_AUTH_SECRET: "auth-secret-with-at-least-thirty-two-characters",
    DOCUMENT_STORAGE_DRIVER: "s3",
    DOCUMENT_STORAGE_S3_REGION: "eu-central-1",
    DOCUMENT_STORAGE_S3_BUCKET: "careerbridge-private-cvs",
    DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "production-access-key",
    DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "production-storage-secret",
    DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE: "false",
    EMAIL_DELIVERY_DRIVER: "resend",
    EMAIL_FROM_ADDRESS: "no-reply@careerbridge.invalid",
    EMAIL_RESEND_API_KEY: "re_production_api_key",
    EMAIL_APP_BASE_URL: "https://careerbridge.example.invalid",
    EMAIL_DISPATCH_SECRET:
      "dispatcher-secret-with-at-least-thirty-two-characters",
    CRON_SECRET: "cron-secret-with-at-least-thirty-two-characters-unique",
    ADMIN_BOOTSTRAP_ENABLED: "false",
    ...overrides,
  };
}

function expectInvalidVariable(env: EnvironmentSource, variable: string) {
  try {
    validateServerEnvironment(env, { deployment: "production" });
    throw new Error("Expected production validation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(EnvironmentValidationError);
    expect((error as EnvironmentValidationError).variables).toContain(variable);
  }
}

describe("production server environment validation", () => {
  it("keeps the tracked environment example name-only and grouped", () => {
    const example = readFileSync(path.resolve(".env.example"), "utf8");
    const assignments = example
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"));
    expect(assignments.every((line) => /^[A-Z0-9_]+=$/.test(line))).toBe(true);
    for (const group of [
      "Application",
      "Database",
      "Authentication",
      "Storage",
      "Email",
      "Dispatcher / Cron",
      "Deployment",
      "Testing",
    ]) {
      expect(example).toContain(`# ${group}`);
    }
  });

  it("keeps development usable without production-only settings", () => {
    expect(
      validateServerEnvironment({}, { deployment: "development" }),
    ).toEqual({});
  });

  it("accepts a complete production environment", () => {
    expect(
      validateServerEnvironment(productionEnvironment(), {
        deployment: "production",
      }).VERCEL_ENV,
    ).toBe("production");
  });

  it("rejects a missing production runtime database", () => {
    expectInvalidVariable(
      productionEnvironment({ DATABASE_URL: undefined }),
      "DATABASE_URL",
    );
  });

  it("rejects a missing or localhost Better Auth production origin", () => {
    expectInvalidVariable(
      productionEnvironment({ BETTER_AUTH_URL: undefined }),
      "BETTER_AUTH_URL",
    );
    expectInvalidVariable(
      productionEnvironment({
        APP_BASE_URL: "https://careerbridge.example.invalid",
        BETTER_AUTH_URL: "http://localhost:3000",
      }),
      "BETTER_AUTH_URL",
    );
  });

  it("rejects a missing production auth secret", () => {
    expectInvalidVariable(
      productionEnvironment({ BETTER_AUTH_SECRET: undefined }),
      "BETTER_AUTH_SECRET",
    );
  });

  it("rejects local CV storage and incomplete S3 storage", () => {
    expectInvalidVariable(
      productionEnvironment({ DOCUMENT_STORAGE_DRIVER: "local" }),
      "DOCUMENT_STORAGE_DRIVER",
    );
    expectInvalidVariable(
      productionEnvironment({ DOCUMENT_STORAGE_S3_BUCKET: undefined }),
      "DOCUMENT_STORAGE_S3_BUCKET",
    );
  });

  it("rejects log delivery and incomplete production email", () => {
    expectInvalidVariable(
      productionEnvironment({ EMAIL_DELIVERY_DRIVER: "log" }),
      "EMAIL_DELIVERY_DRIVER",
    );
    expectInvalidVariable(
      productionEnvironment({ EMAIL_RESEND_API_KEY: undefined }),
      "EMAIL_RESEND_API_KEY",
    );
  });

  it("reports names without including invalid secret values", () => {
    const secretValue = "sensitive-short-value";
    expect(() =>
      validateServerEnvironment(
        productionEnvironment({ BETTER_AUTH_SECRET: secretValue }),
        { deployment: "production" },
      ),
    ).toThrowError("BETTER_AUTH_SECRET");

    try {
      validateServerEnvironment(
        productionEnvironment({ BETTER_AUTH_SECRET: secretValue }),
        { deployment: "production" },
      );
    } catch (error) {
      expect(String(error)).not.toContain(secretValue);
    }
  });

  it("uses the validated canonical origin and never localhost in production", () => {
    const origin = resolveApplicationOrigin(productionEnvironment());
    expect(origin).toBe("https://careerbridge.example.invalid");
    expect(origin).not.toContain("localhost");
  });

  it("uses an exact preview hostname with secure cookies and no wildcard", () => {
    const config = resolveAuthRuntimeConfiguration({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_URL: "careerbridge-git-feature-team.vercel.app",
      BETTER_AUTH_URL: "https://careerbridge.example.invalid",
      BETTER_AUTH_SECRET: "preview-auth-secret-with-at-least-thirty-two-chars",
    });

    expect(config.baseURL).toBe(
      "https://careerbridge-git-feature-team.vercel.app",
    );
    expect(config.trustedOrigins).toEqual([config.baseURL]);
    expect(config.trustedOrigins.join(",")).not.toContain("*");
    expect(config.secureCookies).toBe(true);
  });
});
