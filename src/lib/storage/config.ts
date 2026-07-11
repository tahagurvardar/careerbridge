import { DocumentStorageError } from "./types";

export type StorageDriver = "local" | "s3";

export interface LocalStorageConfig {
  driver: "local";
  root: string;
}

export interface S3StorageConfig {
  driver: "s3";
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig;

export const DEFAULT_LOCAL_STORAGE_ROOT = ".careerbridge-private-storage";

/** Minimal record of the environment variables the resolver reads. */
export type StorageEnv = Record<string, string | undefined>;

function trimmed(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next ? next : undefined;
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Resolves the active storage configuration from environment variables.
 *
 * Pure and side-effect free so it can be unit tested with any environment.
 * Fails loudly rather than silently degrading:
 *   - Local storage is rejected outright in production.
 *   - S3 selection requires every credential/target variable to be present.
 *   - Credential values are never echoed in error messages.
 */
export function resolveStorageConfig(
  env: StorageEnv,
  nodeEnv: string | undefined,
): StorageConfig {
  const driver = (env.DOCUMENT_STORAGE_DRIVER?.trim().toLowerCase() ||
    "local") as string;
  const isProduction = nodeEnv === "production";

  if (driver === "local") {
    if (isProduction) {
      throw new DocumentStorageError(
        "CONFIG",
        "Local document storage is not permitted in production. Set DOCUMENT_STORAGE_DRIVER=s3 with private-bucket credentials.",
      );
    }
    return {
      driver: "local",
      root:
        trimmed(env.DOCUMENT_STORAGE_LOCAL_ROOT) ?? DEFAULT_LOCAL_STORAGE_ROOT,
    };
  }

  if (driver === "s3") {
    const region = trimmed(env.DOCUMENT_STORAGE_S3_REGION);
    const bucket = trimmed(env.DOCUMENT_STORAGE_S3_BUCKET);
    const accessKeyId = trimmed(env.DOCUMENT_STORAGE_S3_ACCESS_KEY_ID);
    const secretAccessKey = env.DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY;

    const missing: string[] = [];
    if (!region) missing.push("DOCUMENT_STORAGE_S3_REGION");
    if (!bucket) missing.push("DOCUMENT_STORAGE_S3_BUCKET");
    if (!accessKeyId) missing.push("DOCUMENT_STORAGE_S3_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY");
    if (missing.length > 0) {
      throw new DocumentStorageError(
        "CONFIG",
        `Missing required S3 document storage configuration: ${missing.join(", ")}.`,
      );
    }

    return {
      driver: "s3",
      endpoint: trimmed(env.DOCUMENT_STORAGE_S3_ENDPOINT),
      region: region!,
      bucket: bucket!,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      forcePathStyle: parseBoolean(env.DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE),
    };
  }

  throw new DocumentStorageError(
    "CONFIG",
    `Unknown DOCUMENT_STORAGE_DRIVER "${driver}". Use "local" (development/test) or "s3".`,
  );
}
