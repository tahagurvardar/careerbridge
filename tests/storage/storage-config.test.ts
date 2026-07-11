import { describe, expect, it } from "vitest";

import { resolveStorageConfig } from "@/lib/storage/config";
import { DocumentStorageError } from "@/lib/storage/types";

describe("resolveStorageConfig", () => {
  it("defaults to the local driver outside production", () => {
    const config = resolveStorageConfig({}, "development");
    expect(config).toEqual({
      driver: "local",
      root: ".careerbridge-private-storage",
    });
  });

  it("honors a custom local root", () => {
    const config = resolveStorageConfig(
      { DOCUMENT_STORAGE_LOCAL_ROOT: "/tmp/store" },
      "test",
    );
    expect(config).toMatchObject({ driver: "local", root: "/tmp/store" });
  });

  it("rejects local storage in production", () => {
    expect(() =>
      resolveStorageConfig({ DOCUMENT_STORAGE_DRIVER: "local" }, "production"),
    ).toThrowError(DocumentStorageError);
    // The default (no driver set) must also be refused in production.
    expect(() => resolveStorageConfig({}, "production")).toThrowError(
      /not permitted in production/,
    );
  });

  it("requires every S3 variable when the driver is s3", () => {
    expect(() =>
      resolveStorageConfig(
        {
          DOCUMENT_STORAGE_DRIVER: "s3",
          DOCUMENT_STORAGE_S3_REGION: "us-east-1",
        },
        "production",
      ),
    ).toThrowError(/Missing required S3/);
  });

  it("resolves a complete S3 configuration", () => {
    const config = resolveStorageConfig(
      {
        DOCUMENT_STORAGE_DRIVER: "s3",
        DOCUMENT_STORAGE_S3_REGION: "eu-central-1",
        DOCUMENT_STORAGE_S3_BUCKET: "private-cvs",
        DOCUMENT_STORAGE_S3_ACCESS_KEY_ID: "AKIA_EXAMPLE",
        DOCUMENT_STORAGE_S3_SECRET_ACCESS_KEY: "secret",
        DOCUMENT_STORAGE_S3_FORCE_PATH_STYLE: "true",
      },
      "production",
    );
    expect(config).toEqual({
      driver: "s3",
      endpoint: undefined,
      region: "eu-central-1",
      bucket: "private-cvs",
      accessKeyId: "AKIA_EXAMPLE",
      secretAccessKey: "secret",
      forcePathStyle: true,
    });
  });

  it("rejects an unknown driver", () => {
    expect(() =>
      resolveStorageConfig({ DOCUMENT_STORAGE_DRIVER: "ftp" }, "development"),
    ).toThrowError(/Unknown DOCUMENT_STORAGE_DRIVER/);
  });
});
