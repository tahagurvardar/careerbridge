import { describe, expect, it } from "vitest";

import {
  COMPANY_SIZES,
  companySchema,
  foundedYearSchema,
  publicCompanySearchSchema,
  recruiterProfileSchema,
  safeHttpUrlSchema,
} from "@/features/recruiter-company/schemas";

describe("Recruiter profile validation", () => {
  it("trims fields, normalizes URLs, and strips unknown input", () => {
    expect(
      recruiterProfileSchema.parse({
        jobTitle: "  Talent lead  ",
        bio: "  Builds fair hiring processes.  ",
        linkedinUrl: "https://linkedin.com/in/example",
        userId: "browser-controlled",
        role: "OWNER",
      }),
    ).toEqual({
      jobTitle: "Talent lead",
      bio: "Builds fair hiring processes.",
      linkedinUrl: "https://linkedin.com/in/example",
    });
  });

  it("enforces sensible recruiter field limits", () => {
    expect(
      recruiterProfileSchema.safeParse({
        jobTitle: "x".repeat(161),
        bio: "x".repeat(2001),
        linkedinUrl: "",
      }).success,
    ).toBe(false);
  });
});

describe("Safe URL validation", () => {
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
    "//example.com/path",
    "not a url",
    "mailto:recruiter@example.test",
  ])("rejects unsupported URL %s", (value) => {
    expect(safeHttpUrlSchema.safeParse(value).success).toBe(false);
  });

  it.each(["http://example.test", "https://example.test/path?q=1", ""])(
    "accepts safe optional URL %s",
    (value) => {
      expect(safeHttpUrlSchema.safeParse(value).success).toBe(true);
    },
  );
});

describe("Company validation", () => {
  const validCompany = {
    name: " Northstar Labs ",
    tagline: " Product tools ",
    description: " A useful company description. ",
    industry: " Technology ",
    headquarters: " Baku ",
    websiteUrl: "https://northstar.example",
    companySize: "FIFTY_ONE_TO_TWO_HUNDRED",
    foundedYear: "2018",
    slug: "browser-slug",
    isPublished: true,
  };

  it("maps explicit company fields and strips ownership/publication input", () => {
    expect(companySchema.parse(validCompany)).toEqual({
      name: "Northstar Labs",
      tagline: "Product tools",
      description: "A useful company description.",
      industry: "Technology",
      headquarters: "Baku",
      websiteUrl: "https://northstar.example/",
      companySize: "FIFTY_ONE_TO_TWO_HUNDRED",
      foundedYear: 2018,
    });
  });

  it("requires a company name", () => {
    expect(
      companySchema.safeParse({ ...validCompany, name: "  " }).success,
    ).toBe(false);
  });

  it("accepts every explicit CompanySize and rejects arbitrary values", () => {
    for (const companySize of COMPANY_SIZES) {
      expect(
        companySchema.safeParse({ ...validCompany, companySize }).success,
      ).toBe(true);
    }
    expect(
      companySchema.safeParse({ ...validCompany, companySize: "HUGE" }).success,
    ).toBe(false);
  });

  it("uses safe http/https Company websites", () => {
    expect(
      companySchema.safeParse({
        ...validCompany,
        websiteUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});

describe("Founded year validation", () => {
  it("accepts empty and realistic years", () => {
    expect(foundedYearSchema.parse("")).toBeNull();
    expect(foundedYearSchema.parse("2001")).toBe(2001);
    expect(foundedYearSchema.parse(2001)).toBe(2001);
    expect(foundedYearSchema.parse(null)).toBeNull();
  });

  it.each(["1599", `${new Date().getUTCFullYear() + 1}`, "20", "year"])(
    "rejects unrealistic founded year %s",
    (value) => {
      expect(foundedYearSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("Public Company search validation", () => {
  it("trims bounded filters and strips unknown fields", () => {
    expect(
      publicCompanySearchSchema.parse({
        q: " Northstar ",
        industry: " Tech ",
        headquarters: " Baku ",
        isPublished: "false",
      }),
    ).toEqual({ q: "Northstar", industry: "Tech", headquarters: "Baku" });
  });

  it("defaults missing filters and rejects unbounded or array input", () => {
    expect(publicCompanySearchSchema.parse({})).toEqual({
      q: "",
      industry: "",
      headquarters: "",
    });
    expect(
      publicCompanySearchSchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      publicCompanySearchSchema.safeParse({ q: ["one", "two"] }).success,
    ).toBe(false);
  });
});
