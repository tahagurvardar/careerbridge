import { describe, expect, it } from "vitest";

import {
  canManageCompany,
  isRecruiterActor,
} from "@/features/recruiter-company/authorization";
import { getCompanyPublicationReadiness } from "@/features/recruiter-company/publication";
import {
  getAvailableCompanySlug,
  normalizeCompanySlug,
} from "@/features/recruiter-company/slug";

describe("Company slug behavior", () => {
  it.each([
    ["Northstar Labs", "northstar-labs"],
    ["  Café & Co.  ", "cafe-co"],
    ["---", "company"],
    ["ACME___Platform", "acme-platform"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeCompanySlug(input)).toBe(expected);
  });

  it("allocates the first deterministic available suffix", () => {
    expect(getAvailableCompanySlug("northstar", [])).toBe("northstar");
    expect(getAvailableCompanySlug("northstar", ["northstar"])).toBe(
      "northstar-2",
    );
    expect(
      getAvailableCompanySlug("northstar", [
        "northstar",
        "northstar-2",
        "northstar-4",
      ]),
    ).toBe("northstar-3");
  });
});

describe("Company publication requirements", () => {
  it("reports every missing minimum field", () => {
    expect(
      getCompanyPublicationReadiness({
        name: "Northstar",
        description: "",
        industry: null,
        headquarters: "  ",
        websiteUrl: "https://example.test",
      }),
    ).toEqual({
      isReady: false,
      missingFields: [
        { field: "description", label: "Description" },
        { field: "industry", label: "Industry" },
        { field: "headquarters", label: "Headquarters" },
      ],
    });
  });

  it("marks a complete profile ready", () => {
    expect(
      getCompanyPublicationReadiness({
        name: "Northstar",
        description: "Builds products.",
        industry: "Technology",
        headquarters: "Baku",
        websiteUrl: "https://example.test",
      }).isReady,
    ).toBe(true);
  });
});

describe("Recruiter ownership helpers", () => {
  it("recognizes only Recruiter actors and OWNER managers", () => {
    expect(isRecruiterActor({ userId: "one", role: "RECRUITER" })).toBe(true);
    expect(isRecruiterActor({ userId: "two", role: "CANDIDATE" })).toBe(false);
    expect(canManageCompany("OWNER")).toBe(true);
    expect(canManageCompany("MEMBER")).toBe(false);
    expect(canManageCompany(null)).toBe(false);
  });
});
