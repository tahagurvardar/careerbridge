import "server-only";

import { z } from "zod";

export type DeploymentEnvironment =
  "development" | "test" | "preview" | "production";

export type EnvironmentSource = Record<string, string | undefined>;

const optionalString = z.string().optional();

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_URL: optionalString,
  APP_BASE_URL: optionalString,
  DATABASE_URL: optionalString,
  DIRECT_URL: optionalString,
  BETTER_AUTH_SECRET: optionalString,
  BETTER_AUTH_URL: optionalString,
  BETTER_AUTH_TRUSTED_ORIGINS: optionalString,
  DOCUMENT_STORAGE_DRIVER: optionalString,
  DOCUMENT_STORAGE_LOCAL_ROOT: optionalString,
  DOCUMENT_STORAGE_S3_ENDPOINT: optionalString,
  DOCUMENT_STORAGE_S3_REGION: optionalString,
  DOCUMENT_STORAGE_S3_BUCKET: optionalString,
  DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: optionalString,
  DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: optionalString,
  DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).optional(),
  EMAIL_DELIVERY_DRIVER: optionalString,
  EMAIL_FROM_ADDRESS: optionalString,
  EMAIL_FROM_NAME: optionalString,
  EMAIL_REPLY_TO: optionalString,
  EMAIL_RESEND_API_KEY: optionalString,
  EMAIL_APP_BASE_URL: optionalString,
  EMAIL_DISPATCH_SECRET: optionalString,
  EMAIL_BATCH_SIZE: optionalString,
  EMAIL_MAX_ATTEMPTS: optionalString,
  CRON_SECRET: optionalString,
  ADMIN_BOOTSTRAP_ENABLED: z.enum(["true", "false"]).optional(),
  ADMIN_BOOTSTRAP_DATABASE_URL: optionalString,
  ADMIN_BOOTSTRAP_NAME: optionalString,
  ADMIN_BOOTSTRAP_EMAIL: optionalString,
  ADMIN_BOOTSTRAP_PASSWORD: optionalString,
  RUN_DATABASE_INTEGRATION_TESTS: z.enum(["true", "false"]).optional(),
  TEST_DATABASE_URL: optionalString,
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const PLACEHOLDER_PATTERN =
  /replace[-_ ]?with|change[-_ ]?me|placeholder|example\.test|user:password|your[-_ ]/i;

export class EnvironmentValidationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: Iterable<string>) {
    const uniqueVariables = [...new Set(variables)].sort();
    super(
      `Invalid production environment variables: ${uniqueVariables.join(", ")}.`,
    );
    this.name = "EnvironmentValidationError";
    this.variables = uniqueVariables;
  }
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result ? result : undefined;
}

function hasPlaceholder(value: string | undefined): boolean {
  return Boolean(value && PLACEHOLDER_PATTERN.test(value));
}

function parseOrigin(
  value: string | undefined,
  options: { requireHttps: boolean; rejectLocalhost: boolean },
): string | undefined {
  const candidate = trimmed(value);
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    if (url.username || url.password || url.search || url.hash)
      return undefined;
    if (url.pathname !== "/") return undefined;
    if (options.requireHttps && url.protocol !== "https:") return undefined;
    if (options.rejectLocalhost && LOCAL_HOSTS.has(url.hostname)) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function isPostgresConnection(value: string | undefined): boolean {
  const candidate = trimmed(value);
  if (!candidate || hasPlaceholder(candidate)) return false;

  try {
    const url = new URL(candidate);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) return false;
    if (!url.hostname || LOCAL_HOSTS.has(url.hostname)) return false;
    if (!url.pathname || url.pathname === "/") return false;
    const sslMode = url.searchParams.get("sslmode");
    return sslMode !== null && sslMode !== "disable";
  } catch {
    return false;
  }
}

function isStrongSecret(value: string | undefined): boolean {
  const candidate = trimmed(value);
  return Boolean(
    candidate && candidate.length >= 32 && !hasPlaceholder(candidate),
  );
}

function isBoundedInteger(
  value: string | undefined,
  minimum: number,
  maximum: number,
): boolean {
  if (value === undefined) return true;
  if (!/^\d+$/.test(value.trim())) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum;
}

function isEmailAddress(value: string | undefined): boolean {
  const candidate = trimmed(value);
  return Boolean(candidate && z.email().safeParse(candidate).success);
}

function validateTrustedOrigins(
  value: string | undefined,
  options: { rejectLocalhost: boolean },
): boolean {
  const candidate = trimmed(value);
  if (!candidate) return true;

  const origins = candidate
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return (
    origins.length > 0 &&
    origins.every(
      (origin) =>
        !origin.includes("*") &&
        Boolean(
          parseOrigin(origin, {
            requireHttps: true,
            rejectLocalhost: options.rejectLocalhost,
          }),
        ),
    )
  );
}

function productionIssues(env: ServerEnvironment): string[] {
  const issues = new Set<string>();
  const requireValue = (name: keyof ServerEnvironment) => {
    const value = env[name];
    if (typeof value !== "string" || !trimmed(value)) issues.add(String(name));
  };

  for (const name of [
    "APP_BASE_URL",
    "DATABASE_URL",
    "DIRECT_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "DOCUMENT_STORAGE_DRIVER",
    "DOCUMENT_STORAGE_S3_REGION",
    "DOCUMENT_STORAGE_S3_BUCKET",
    "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID",
    "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY",
    "EMAIL_DELIVERY_DRIVER",
    "EMAIL_FROM_ADDRESS",
    "EMAIL_RESEND_API_KEY",
    "EMAIL_APP_BASE_URL",
    "EMAIL_DISPATCH_SECRET",
    "CRON_SECRET",
  ] as const) {
    requireValue(name);
  }

  const applicationOrigin = parseOrigin(env.APP_BASE_URL, {
    requireHttps: true,
    rejectLocalhost: true,
  });
  if (!applicationOrigin || hasPlaceholder(env.APP_BASE_URL)) {
    issues.add("APP_BASE_URL");
  }

  const authOrigin = parseOrigin(env.BETTER_AUTH_URL, {
    requireHttps: true,
    rejectLocalhost: true,
  });
  if (!authOrigin || authOrigin !== applicationOrigin) {
    issues.add("BETTER_AUTH_URL");
  }
  if (!isStrongSecret(env.BETTER_AUTH_SECRET)) {
    issues.add("BETTER_AUTH_SECRET");
  }
  if (
    !validateTrustedOrigins(env.BETTER_AUTH_TRUSTED_ORIGINS, {
      rejectLocalhost: true,
    })
  ) {
    issues.add("BETTER_AUTH_TRUSTED_ORIGINS");
  }

  if (!isPostgresConnection(env.DATABASE_URL)) issues.add("DATABASE_URL");
  if (!isPostgresConnection(env.DIRECT_URL)) issues.add("DIRECT_URL");
  if (
    trimmed(env.DATABASE_URL) &&
    trimmed(env.DATABASE_URL) === trimmed(env.DIRECT_URL)
  ) {
    issues.add("DATABASE_URL");
    issues.add("DIRECT_URL");
  }
  if (
    trimmed(env.TEST_DATABASE_URL) &&
    [trimmed(env.DATABASE_URL), trimmed(env.DIRECT_URL)].includes(
      trimmed(env.TEST_DATABASE_URL),
    )
  ) {
    issues.add("TEST_DATABASE_URL");
  }

  if (trimmed(env.DOCUMENT_STORAGE_DRIVER)?.toLowerCase() !== "s3") {
    issues.add("DOCUMENT_STORAGE_DRIVER");
  }
  for (const name of [
    "DOCUMENT_STORAGE_S3_REGION",
    "DOCUMENT_STORAGE_S3_BUCKET",
    "DOCUMENT_STORAGE_S3_ACCESS_KEY_ID",
    "DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY",
  ] as const) {
    if (hasPlaceholder(env[name])) issues.add(name);
  }
  if (env.DOCUMENT_STORAGE_S3_ENDPOINT) {
    const endpoint = parseOrigin(env.DOCUMENT_STORAGE_S3_ENDPOINT, {
      requireHttps: true,
      rejectLocalhost: true,
    });
    if (!endpoint || hasPlaceholder(env.DOCUMENT_STORAGE_S3_ENDPOINT)) {
      issues.add("DOCUMENT_STORAGE_S3_ENDPOINT");
    }
  }

  if (trimmed(env.EMAIL_DELIVERY_DRIVER)?.toLowerCase() !== "resend") {
    issues.add("EMAIL_DELIVERY_DRIVER");
  }
  if (
    !isEmailAddress(env.EMAIL_FROM_ADDRESS) ||
    hasPlaceholder(env.EMAIL_FROM_ADDRESS)
  ) {
    issues.add("EMAIL_FROM_ADDRESS");
  }
  if (env.EMAIL_REPLY_TO && !isEmailAddress(env.EMAIL_REPLY_TO)) {
    issues.add("EMAIL_REPLY_TO");
  }
  if (
    !trimmed(env.EMAIL_RESEND_API_KEY) ||
    hasPlaceholder(env.EMAIL_RESEND_API_KEY)
  ) {
    issues.add("EMAIL_RESEND_API_KEY");
  }
  const emailOrigin = parseOrigin(env.EMAIL_APP_BASE_URL, {
    requireHttps: true,
    rejectLocalhost: true,
  });
  if (!emailOrigin || emailOrigin !== applicationOrigin) {
    issues.add("EMAIL_APP_BASE_URL");
  }
  if (!isStrongSecret(env.EMAIL_DISPATCH_SECRET)) {
    issues.add("EMAIL_DISPATCH_SECRET");
  }
  if (!isStrongSecret(env.CRON_SECRET)) issues.add("CRON_SECRET");
  if (
    trimmed(env.EMAIL_DISPATCH_SECRET) &&
    trimmed(env.EMAIL_DISPATCH_SECRET) === trimmed(env.CRON_SECRET)
  ) {
    issues.add("CRON_SECRET");
  }
  if (!isBoundedInteger(env.EMAIL_BATCH_SIZE, 1, 100)) {
    issues.add("EMAIL_BATCH_SIZE");
  }
  if (!isBoundedInteger(env.EMAIL_MAX_ATTEMPTS, 1, 10)) {
    issues.add("EMAIL_MAX_ATTEMPTS");
  }

  if (env.ADMIN_BOOTSTRAP_ENABLED === "true") {
    issues.add("ADMIN_BOOTSTRAP_ENABLED");
  }

  return [...issues];
}

export function detectDeploymentEnvironment(
  env: EnvironmentSource,
): DeploymentEnvironment {
  if (env.NODE_ENV === "test") return "test";
  if (env.VERCEL_ENV === "production") return "production";
  if (env.VERCEL_ENV === "preview") return "preview";
  return "development";
}

export function validateServerEnvironment(
  env: EnvironmentSource,
  options: { deployment?: DeploymentEnvironment } = {},
): ServerEnvironment {
  const result = serverEnvironmentSchema.safeParse(env);
  if (!result.success) {
    throw new EnvironmentValidationError(
      result.error.issues.map((issue) =>
        String(issue.path[0] ?? "ENVIRONMENT"),
      ),
    );
  }

  const deployment = options.deployment ?? detectDeploymentEnvironment(env);
  if (deployment === "production") {
    const issues = productionIssues(result.data);
    if (issues.length > 0) throw new EnvironmentValidationError(issues);
  }

  return result.data;
}

export function getServerEnvironment(): ServerEnvironment {
  return validateServerEnvironment(process.env);
}

function previewOrigin(env: EnvironmentSource): string | undefined {
  const hostname = trimmed(env.VERCEL_URL);
  if (!hostname || hostname.includes("/") || hostname.includes("*")) {
    return undefined;
  }
  return parseOrigin(`https://${hostname}`, {
    requireHttps: true,
    rejectLocalhost: true,
  });
}

export function resolveApplicationOrigin(
  env: EnvironmentSource = process.env,
): string {
  const deployment = detectDeploymentEnvironment(env);
  const parsed = validateServerEnvironment(env, { deployment });
  const candidate =
    trimmed(parsed.APP_BASE_URL) ??
    trimmed(parsed.BETTER_AUTH_URL) ??
    "http://localhost:3000";
  const origin = parseOrigin(candidate, {
    requireHttps: deployment === "production",
    rejectLocalhost: deployment === "production",
  });
  if (!origin) throw new EnvironmentValidationError(["APP_BASE_URL"]);
  return origin;
}

export function resolveAuthRuntimeConfiguration(
  env: EnvironmentSource = process.env,
): {
  baseURL: string;
  secret: string;
  trustedOrigins: string[];
  secureCookies: boolean;
} {
  const deployment = detectDeploymentEnvironment(env);
  const parsed = validateServerEnvironment(env, { deployment });
  const isDeployed = deployment === "preview" || deployment === "production";
  const baseCandidate =
    deployment === "preview"
      ? (previewOrigin(env) ?? trimmed(parsed.BETTER_AUTH_URL))
      : trimmed(parsed.BETTER_AUTH_URL);
  const baseURL = parseOrigin(baseCandidate, {
    requireHttps: isDeployed || parsed.NODE_ENV === "production",
    rejectLocalhost: isDeployed,
  });
  const secret = trimmed(parsed.BETTER_AUTH_SECRET);
  const invalid: string[] = [];
  if (!baseURL) invalid.push("BETTER_AUTH_URL");
  if (!secret) invalid.push("BETTER_AUTH_SECRET");
  if (invalid.length > 0) throw new EnvironmentValidationError(invalid);

  const configuredOrigins = (parsed.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) =>
      parseOrigin(origin, {
        requireHttps: isDeployed,
        rejectLocalhost: isDeployed,
      }),
    )
    .filter((origin): origin is string => Boolean(origin));
  const developmentOrigins = isDeployed
    ? []
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return {
    baseURL: baseURL!,
    secret: secret!,
    trustedOrigins: Array.from(
      new Set([baseURL!, ...configuredOrigins, ...developmentOrigins]),
    ),
    secureCookies: parsed.NODE_ENV === "production",
  };
}
