import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LocalPrivateDocumentStorage } from "@/lib/storage/local";
import { DocumentStorageError } from "@/lib/storage/types";

let root: string;
let storage: LocalPrivateDocumentStorage;

const KEY = "resumes/2026/deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef.pdf";
const BODY = Buffer.from("%PDF-1.4 synthetic body", "utf8");

describe("LocalPrivateDocumentStorage", () => {
  beforeAll(async () => {
    root = await mkdtemp(path.join(tmpdir(), "cb-storage-"));
    storage = new LocalPrivateDocumentStorage(root);
  });

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("stores, reports existence, reads back, and deletes an object", async () => {
    expect(await storage.objectExists(KEY)).toBe(false);
    await storage.putObject({
      key: KEY,
      body: BODY,
      contentType: "application/pdf",
    });
    expect(await storage.objectExists(KEY)).toBe(true);

    const read = await storage.getObject(KEY);
    expect(read.body.equals(BODY)).toBe(true);
    expect(read.contentLength).toBe(BODY.byteLength);

    await storage.deleteObject(KEY);
    expect(await storage.objectExists(KEY)).toBe(false);
    // Deleting an absent object is a safe no-op.
    await expect(storage.deleteObject(KEY)).resolves.toBeUndefined();
  });

  it("treats a stored object as immutable", async () => {
    const key = "resumes/2026/immutable-object.pdf";
    await storage.putObject({
      key,
      body: BODY,
      contentType: "application/pdf",
    });
    await expect(
      storage.putObject({ key, body: BODY, contentType: "application/pdf" }),
    ).rejects.toBeInstanceOf(DocumentStorageError);
  });

  it("rejects path traversal keys", async () => {
    await expect(storage.getObject("../escape.pdf")).rejects.toMatchObject({
      code: "IO",
    });
    await expect(
      storage.putObject({
        key: "../../escape.pdf",
        body: BODY,
        contentType: "application/pdf",
      }),
    ).rejects.toMatchObject({ code: "IO" });
  });

  it("reports NOT_FOUND when reading a missing object", async () => {
    await expect(
      storage.getObject("resumes/2026/missing.pdf"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
