/**
 * Provider-agnostic private object storage for Candidate documents.
 *
 * Implementations must keep objects private (never publicly reachable), accept
 * only server-generated opaque keys, and never expose bucket names, endpoints,
 * filesystem paths, or credentials to callers. Bodies are handled as in-memory
 * Buffers because Candidate documents are capped well below any streaming
 * threshold, which keeps the interface simple and easy to fake in tests.
 */
export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  body: Buffer;
  contentLength: number;
}

export interface PrivateDocumentStorage {
  /** Writes a new immutable object. Must never overwrite an existing key. */
  putObject(input: PutObjectInput): Promise<void>;
  /** Reads an object's bytes. Rejects with a NOT_FOUND error when absent. */
  getObject(key: string): Promise<StoredObject>;
  /** Best-effort removal. Treats an already-absent object as success. */
  deleteObject(key: string): Promise<void>;
  objectExists(key: string): Promise<boolean>;
}

export type DocumentStorageErrorCode = "NOT_FOUND" | "IO" | "CONFIG";

/**
 * The only error type storage providers surface. Messages are intentionally
 * generic so provider internals (bucket, endpoint, path, credentials, raw
 * cloud/filesystem errors) never propagate to callers or responses.
 */
export class DocumentStorageError extends Error {
  constructor(
    readonly code: DocumentStorageErrorCode,
    message = "A document storage operation failed.",
  ) {
    super(message);
    this.name = "DocumentStorageError";
  }
}
