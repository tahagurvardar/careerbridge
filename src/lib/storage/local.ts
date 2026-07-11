import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { isSafeStorageKey } from "./keys";
import {
  DocumentStorageError,
  type PrivateDocumentStorage,
  type PutObjectInput,
  type StoredObject,
} from "./types";

function isErrnoException(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

/**
 * Private filesystem storage for development and test only.
 *
 * Objects live under a dedicated, git-ignored root that is never inside any
 * public web directory, so bytes are never served directly by the framework.
 * Every key is validated and re-resolved against the root to prevent path
 * traversal, and writes use the exclusive `wx` flag to preserve immutability.
 */
export class LocalPrivateDocumentStorage implements PrivateDocumentStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolveKeyPath(key: string): string {
    if (!isSafeStorageKey(key)) {
      throw new DocumentStorageError("IO", "Invalid storage key.");
    }
    const full = path.resolve(this.root, key);
    const relative = path.relative(this.root, full);
    if (
      relative === "" ||
      relative.startsWith("..") ||
      path.isAbsolute(relative)
    ) {
      throw new DocumentStorageError("IO", "Storage key escapes the root.");
    }
    return full;
  }

  async putObject({ key, body }: PutObjectInput): Promise<void> {
    const full = this.resolveKeyPath(key);
    try {
      await mkdir(path.dirname(full), { recursive: true });
      // `wx` fails if the file already exists, so a stored object is immutable.
      await writeFile(full, body, { flag: "wx" });
    } catch (error) {
      if (error instanceof DocumentStorageError) throw error;
      throw new DocumentStorageError("IO");
    }
  }

  async getObject(key: string): Promise<StoredObject> {
    const full = this.resolveKeyPath(key);
    try {
      const body = await readFile(full);
      return { body, contentLength: body.byteLength };
    } catch (error) {
      if (isErrnoException(error, "ENOENT")) {
        throw new DocumentStorageError("NOT_FOUND");
      }
      throw new DocumentStorageError("IO");
    }
  }

  async deleteObject(key: string): Promise<void> {
    const full = this.resolveKeyPath(key);
    try {
      await unlink(full);
    } catch (error) {
      if (isErrnoException(error, "ENOENT")) return;
      throw new DocumentStorageError("IO");
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const full = this.resolveKeyPath(key);
    try {
      await access(full);
      return true;
    } catch {
      return false;
    }
  }
}
