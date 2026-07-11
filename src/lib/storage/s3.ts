import type { S3StorageConfig } from "./config";
import { awsUriEncode, sha256Hex, signS3Request } from "./sigv4";
import {
  DocumentStorageError,
  type PrivateDocumentStorage,
  type PutObjectInput,
  type StoredObject,
} from "./types";

const EMPTY_PAYLOAD_HASH = sha256Hex("");

interface RequestTarget {
  url: string;
  host: string;
  canonicalUri: string;
}

/**
 * Private S3-compatible object storage for production-oriented deployments.
 *
 * Works with AWS S3 and S3-compatible providers (custom endpoint, region, and
 * path-style addressing). The bucket must be private: objects are only ever
 * reached through server-side signed requests, never public URLs. Errors are
 * normalized to a generic {@link DocumentStorageError}, so provider responses,
 * bucket names, endpoints, and credentials never leak to callers.
 */
export class S3PrivateDocumentStorage implements PrivateDocumentStorage {
  constructor(private readonly config: S3StorageConfig) {}

  private resolveTarget(key: string): RequestTarget {
    const { endpoint, bucket, region, forcePathStyle } = this.config;

    let scheme = "https:";
    let baseHost: string;
    if (endpoint) {
      const base = new URL(endpoint);
      scheme = base.protocol;
      baseHost = base.host;
    } else {
      baseHost = `s3.${region}.amazonaws.com`;
    }

    const host = forcePathStyle ? baseHost : `${bucket}.${baseHost}`;
    const rawPath = forcePathStyle ? `/${bucket}/${key}` : `/${key}`;
    const canonicalUri = awsUriEncode(rawPath, false);

    return { url: `${scheme}//${host}${canonicalUri}`, host, canonicalUri };
  }

  private async send(
    method: string,
    key: string,
    options: { body?: Buffer; contentType?: string; payloadHash: string },
  ): Promise<Response> {
    const target = this.resolveTarget(key);
    const signed = signS3Request({
      method,
      host: target.host,
      canonicalUri: target.canonicalUri,
      payloadHash: options.payloadHash,
      contentType: options.contentType,
      now: new Date(),
      region: this.config.region,
      service: "s3",
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    });

    // The Host header is signed but must be set by the HTTP client from the URL.
    const { host: _host, ...requestHeaders } = signed;
    void _host;

    try {
      return await fetch(target.url, {
        method,
        headers: requestHeaders,
        body: options.body ? new Uint8Array(options.body) : undefined,
      });
    } catch {
      throw new DocumentStorageError("IO");
    }
  }

  async putObject({ key, body, contentType }: PutObjectInput): Promise<void> {
    const response = await this.send("PUT", key, {
      body,
      contentType,
      payloadHash: sha256Hex(body),
    });
    if (!response.ok) throw new DocumentStorageError("IO");
  }

  async getObject(key: string): Promise<StoredObject> {
    const response = await this.send("GET", key, {
      payloadHash: EMPTY_PAYLOAD_HASH,
    });
    if (response.status === 404) throw new DocumentStorageError("NOT_FOUND");
    if (!response.ok) throw new DocumentStorageError("IO");
    const body = Buffer.from(await response.arrayBuffer());
    return { body, contentLength: body.byteLength };
  }

  async deleteObject(key: string): Promise<void> {
    const response = await this.send("DELETE", key, {
      payloadHash: EMPTY_PAYLOAD_HASH,
    });
    // S3 delete is idempotent and returns 204; a 404 is an acceptable no-op.
    if (response.ok || response.status === 404) return;
    throw new DocumentStorageError("IO");
  }

  async objectExists(key: string): Promise<boolean> {
    const response = await this.send("HEAD", key, {
      payloadHash: EMPTY_PAYLOAD_HASH,
    });
    if (response.ok) return true;
    if (response.status === 404) return false;
    throw new DocumentStorageError("IO");
  }
}
