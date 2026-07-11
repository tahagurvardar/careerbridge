import { randomBytes } from "node:crypto";

// Storage keys are always generated server-side and stored in the database.
// They are opaque and never derived from the original filename, so an attacker
// cannot guess another Candidate's object or influence the storage path.
const MAX_STORAGE_KEY_LENGTH = 255;
const SAFE_STORAGE_KEY = /^[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

/**
 * Generates an opaque, collision-resistant object key for a resume PDF. The
 * key embeds only a coarse year prefix for operational grouping plus 24 bytes
 * of randomness; it carries no Candidate identity or original filename.
 */
export function generateResumeStorageKey(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const random = randomBytes(24).toString("hex");
  return `resumes/${year}/${random}.pdf`;
}

/**
 * Validates that a key is safe to resolve against a storage backend: bounded
 * length, no traversal sequences, no absolute or backslash paths, and only an
 * allow-listed character set. Defends the local filesystem provider against
 * path traversal even though keys always originate server-side.
 */
export function isSafeStorageKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > MAX_STORAGE_KEY_LENGTH) return false;
  if (key.includes("..")) return false;
  if (key.startsWith("/") || key.includes("\\") || key.includes("\0")) {
    return false;
  }
  return SAFE_STORAGE_KEY.test(key);
}
