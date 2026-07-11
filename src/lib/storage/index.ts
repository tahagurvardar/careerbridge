import "server-only";

import { resolveStorageConfig, type StorageEnv } from "./config";
import { LocalPrivateDocumentStorage } from "./local";
import { S3PrivateDocumentStorage } from "./s3";
import type { PrivateDocumentStorage } from "./types";

export type {
  PrivateDocumentStorage,
  PutObjectInput,
  StoredObject,
} from "./types";
export { DocumentStorageError } from "./types";

const globalForStorage = globalThis as unknown as {
  documentStorage: PrivateDocumentStorage | undefined;
};

/**
 * Builds a storage provider from the environment. Selecting `s3` in production
 * requires complete credentials; local storage is rejected in production, so a
 * misconfigured deployment fails loudly instead of silently writing to disk.
 */
export function createDocumentStorageFromEnv(
  env: StorageEnv = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): PrivateDocumentStorage {
  const config = resolveStorageConfig(env, nodeEnv);
  if (config.driver === "local") {
    return new LocalPrivateDocumentStorage(config.root);
  }
  return new S3PrivateDocumentStorage(config);
}

/** Lazy singleton so builds stay independent of runtime storage configuration. */
export function getDocumentStorage(): PrivateDocumentStorage {
  const existing = globalForStorage.documentStorage;
  if (existing) return existing;

  const storage = createDocumentStorageFromEnv();
  if (process.env.NODE_ENV !== "production") {
    globalForStorage.documentStorage = storage;
  }
  return storage;
}
