import { createHash } from "node:crypto";

/**
 * Computes the lowercase hex SHA-256 of a document's bytes. Calculated
 * server-side over the exact stored payload so the digest is trustworthy and
 * never supplied by the client.
 */
export function sha256Hex(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}
