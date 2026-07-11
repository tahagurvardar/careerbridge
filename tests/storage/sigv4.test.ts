import { describe, expect, it } from "vitest";

import {
  amzDates,
  awsUriEncode,
  deriveSigningKey,
  signS3Request,
} from "@/lib/storage/sigv4";

describe("AWS SigV4 primitives", () => {
  it("derives the signing key matching AWS's published test vector", () => {
    // From AWS: "Examples of how to derive a signing key for Signature V4".
    const key = deriveSigningKey(
      "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
      "20150830",
      "us-east-1",
      "iam",
    );
    expect(key.toString("hex")).toBe(
      "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9",
    );
  });

  it("encodes only non-unreserved characters and preserves path slashes", () => {
    expect(awsUriEncode("a b/c~d.pdf", false)).toBe("a%20b/c~d.pdf");
    expect(awsUriEncode("a b/c", true)).toBe("a%20b%2Fc");
  });

  it("formats the amz date pair", () => {
    expect(amzDates(new Date("2026-07-12T10:11:12.345Z"))).toEqual({
      amzDate: "20260712T101112Z",
      dateStamp: "20260712",
    });
  });

  it("produces a deterministic, well-formed authorization header", () => {
    const headers = signS3Request({
      method: "PUT",
      host: "private-cvs.s3.eu-central-1.amazonaws.com",
      canonicalUri: "/resumes/2026/abc.pdf",
      payloadHash:
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      contentType: "application/pdf",
      now: new Date("2026-07-12T10:11:12.000Z"),
      region: "eu-central-1",
      service: "s3",
      accessKeyId: "AKIA_EXAMPLE",
      secretAccessKey: "secret",
    });
    expect(headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIA_EXAMPLE\/20260712\/eu-central-1\/s3\/aws4_request, SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
    );
    expect(headers["x-amz-date"]).toBe("20260712T101112Z");
  });
});
