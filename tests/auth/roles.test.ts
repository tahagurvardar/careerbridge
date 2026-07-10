import { describe, expect, it } from "vitest";

import {
  getDashboardPathForRole,
  getSafeInternalPath,
  isDashboardPathAllowedForRole,
  isPublicRole,
} from "@/features/auth/roles";

describe("public role allow-list", () => {
  it.each(["CANDIDATE", "RECRUITER"])("allows %s registration", (role) => {
    expect(isPublicRole(role)).toBe(true);
  });

  it("rejects ADMIN registration", () => {
    expect(isPublicRole("ADMIN")).toBe(false);
  });

  it.each([undefined, null, "", "admin", "EMPLOYER"])(
    "rejects invalid role %s",
    (role) => {
      expect(isPublicRole(role)).toBe(false);
    },
  );
});

describe("dashboard authorization", () => {
  const matrix = [
    ["CANDIDATE", "/candidate/dashboard"],
    ["RECRUITER", "/recruiter/dashboard"],
    ["ADMIN", "/admin"],
  ] as const;

  it.each(matrix)("maps %s to %s", (role, path) => {
    expect(getDashboardPathForRole(role)).toBe(path);
  });

  it.each(matrix)("only allows %s to access its dashboard", (role, path) => {
    for (const [, candidatePath] of matrix) {
      expect(isDashboardPathAllowedForRole(role, candidatePath)).toBe(
        candidatePath === path,
      );
    }
  });
});

describe("safe internal redirects", () => {
  it("keeps a local path", () => {
    expect(getSafeInternalPath("/candidate/dashboard?from=login", "/")).toBe(
      "/candidate/dashboard?from=login",
    );
  });

  it.each([
    "https://attacker.example/admin",
    "//attacker.example/admin",
    "/\\attacker.example/admin",
    "javascript:alert(1)",
  ])("rejects unsafe redirect %s", (path) => {
    expect(getSafeInternalPath(path, "/fallback")).toBe("/fallback");
  });
});
