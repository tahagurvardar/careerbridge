import { createHash, createHmac } from "node:crypto";

/**
 * Minimal, dependency-free AWS Signature Version 4 signer scoped to the S3
 * object operations this project needs (PUT/GET/DELETE/HEAD, no query string).
 *
 * Keeping this self-contained avoids pulling the full AWS SDK into the bundle.
 * The derivation is verifiable against AWS's published test vector (see the
 * unit tests), which guards the most error-prone part — the HMAC key chain.
 */
export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

export function deriveSigningKey(
  secretAccessKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

/**
 * Encodes a string per RFC 3986 the way AWS SigV4 expects: only the unreserved
 * set `A-Za-z0-9-_.~` is left intact and every other byte is percent-encoded.
 * Object-path slashes are preserved when `encodeSlash` is false.
 */
export function awsUriEncode(input: string, encodeSlash: boolean): string {
  const bytes = Buffer.from(input, "utf8");
  let out = "";
  for (const b of bytes) {
    const isUnreserved =
      (b >= 0x41 && b <= 0x5a) ||
      (b >= 0x61 && b <= 0x7a) ||
      (b >= 0x30 && b <= 0x39) ||
      b === 0x2d ||
      b === 0x2e ||
      b === 0x5f ||
      b === 0x7e;
    if (isUnreserved) {
      out += String.fromCharCode(b);
    } else if (b === 0x2f) {
      out += encodeSlash ? "%2F" : "/";
    } else {
      out += `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return out;
}

/** Formats a Date into the `YYYYMMDDTHHMMSSZ` / `YYYYMMDD` amz pair. */
export function amzDates(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

export interface SignS3RequestInput {
  method: string;
  host: string;
  /** AWS-encoded path beginning with `/`. */
  canonicalUri: string;
  payloadHash: string;
  contentType?: string;
  now: Date;
  region: string;
  service: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/**
 * Produces the signed header set for a single S3 request. Includes the `host`
 * header (mandatory in the S3 signature); the caller omits it from the actual
 * fetch so the HTTP client derives an identical Host from the request URL.
 */
export function signS3Request(
  input: SignS3RequestInput,
): Record<string, string> {
  const { amzDate, dateStamp } = amzDates(input.now);

  const headers: Record<string, string> = {
    host: input.host,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": amzDate,
  };
  if (input.contentType) headers["content-type"] = input.contentType;

  const sortedNames = Object.keys(headers).sort();
  const canonicalHeaders = sortedNames
    .map((name) => `${name}:${headers[name]}\n`)
    .join("");
  const signedHeaders = sortedNames.join(";");

  const canonicalRequest = [
    input.method,
    input.canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = deriveSigningKey(
    input.secretAccessKey,
    dateStamp,
    input.region,
    input.service,
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
