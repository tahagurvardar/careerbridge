import { describe, expect, it } from "vitest";

import { isDuplicateSkillAssignment } from "@/features/candidate-profile/schemas";
import {
  applicationDeadlineSchema,
  getSkillLookupName,
  hasActiveJobFilters,
  isPastCalendarDate,
  jobContentSchema,
  jobCreateSchema,
  parsePublicJobSearch,
  parseRecruiterJobFilters,
  salaryAmountSchema,
  salaryCurrencySchema,
  skillSchema,
} from "@/features/jobs/schemas";
import { buildPublishedJobWhere } from "@/features/jobs/search";

const validContent = {
  title: "  Frontend Engineer  ",
  summary: "  Build product UI.  ",
  description: "A full description of the role.",
  responsibilities: "Ship features.\nReview designs.",
  requirements: "React experience.\nClear communication.",
  location: "  Baku  ",
  employmentType: "FULL_TIME" as const,
  workplaceType: "HYBRID" as const,
  experienceLevel: "MID" as const,
  salaryMin: "60000",
  salaryMax: "80000",
  salaryCurrency: "usd",
  applicationDeadline: "2030-01-15",
};

describe("Job content validation", () => {
  it("normalizes fields, coerces salary, and strips unknown/ownership input", () => {
    const result = jobContentSchema.parse({
      ...validContent,
      status: "PUBLISHED",
      slug: "browser-slug",
      companyId: "browser-company",
      publishedAt: "2020-01-01",
    });

    expect(result).toEqual({
      title: "Frontend Engineer",
      summary: "Build product UI.",
      description: "A full description of the role.",
      responsibilities: "Ship features.\nReview designs.",
      requirements: "React experience.\nClear communication.",
      location: "Baku",
      employmentType: "FULL_TIME",
      workplaceType: "HYBRID",
      experienceLevel: "MID",
      salaryMin: 60000,
      salaryMax: 80000,
      salaryCurrency: "USD",
      applicationDeadline: "2030-01-15",
    });
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("slug");
    expect(result).not.toHaveProperty("companyId");
    expect(result).not.toHaveProperty("publishedAt");
  });

  it("allows an otherwise empty draft with only a title", () => {
    const result = jobContentSchema.safeParse({
      title: "Draft role",
      summary: "",
      description: "",
      responsibilities: "",
      requirements: "",
      location: "",
      employmentType: "",
      workplaceType: "",
      experienceLevel: "",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "",
      applicationDeadline: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.salaryMin).toBeNull();
      expect(result.data.employmentType).toBe("");
    }
  });

  it("requires a title between 2 and 160 characters", () => {
    expect(
      jobContentSchema.safeParse({ ...validContent, title: " a " }).success,
    ).toBe(false);
    expect(
      jobContentSchema.safeParse({ ...validContent, title: "x".repeat(161) })
        .success,
    ).toBe(false);
  });

  it("rejects arbitrary enum values", () => {
    expect(
      jobContentSchema.safeParse({ ...validContent, employmentType: "CEO" })
        .success,
    ).toBe(false);
    expect(
      jobContentSchema.safeParse({ ...validContent, workplaceType: "MARS" })
        .success,
    ).toBe(false);
    expect(
      jobContentSchema.safeParse({ ...validContent, experienceLevel: "GURU" })
        .success,
    ).toBe(false);
  });

  it("requires companyId only on the create schema", () => {
    expect(
      jobCreateSchema.safeParse({ ...validContent, companyId: "" }).success,
    ).toBe(false);
    expect(
      jobCreateSchema.safeParse({ ...validContent, companyId: "cmp_1" })
        .success,
    ).toBe(true);
  });
});

describe("Salary validation", () => {
  it("parses whole non-negative integers and empty as null", () => {
    expect(salaryAmountSchema.parse("60000")).toBe(60000);
    expect(salaryAmountSchema.parse("")).toBeNull();
    expect(salaryAmountSchema.parse(45000)).toBe(45000);
    expect(salaryAmountSchema.parse(null)).toBeNull();
  });

  it("rejects negative, fractional, and non-numeric amounts", () => {
    expect(salaryAmountSchema.safeParse("-1").success).toBe(false);
    expect(salaryAmountSchema.safeParse("60.5").success).toBe(false);
    expect(salaryAmountSchema.safeParse("lots").success).toBe(false);
    expect(salaryAmountSchema.safeParse(-5).success).toBe(false);
  });

  it("rejects a minimum greater than the maximum", () => {
    expect(
      jobContentSchema.safeParse({
        ...validContent,
        salaryMin: "90000",
        salaryMax: "80000",
      }).success,
    ).toBe(false);
  });

  it("requires a currency when any salary value is present", () => {
    expect(
      jobContentSchema.safeParse({
        ...validContent,
        salaryMin: "60000",
        salaryMax: "",
        salaryCurrency: "",
      }).success,
    ).toBe(false);
    expect(
      jobContentSchema.safeParse({
        ...validContent,
        salaryMin: "",
        salaryMax: "",
        salaryCurrency: "",
      }).success,
    ).toBe(true);
  });
});

describe("Currency normalization", () => {
  it("uppercases and requires a 3-letter code", () => {
    expect(salaryCurrencySchema.parse("usd")).toBe("USD");
    expect(salaryCurrencySchema.parse("  eur ")).toBe("EUR");
    expect(salaryCurrencySchema.parse("")).toBe("");
    expect(salaryCurrencySchema.safeParse("US").success).toBe(false);
    expect(salaryCurrencySchema.safeParse("dollars").success).toBe(false);
    expect(salaryCurrencySchema.safeParse("12A").success).toBe(false);
  });
});

describe("Deadline validation", () => {
  it("accepts valid ISO calendar dates and empty", () => {
    expect(applicationDeadlineSchema.safeParse("2030-01-15").success).toBe(
      true,
    );
    expect(applicationDeadlineSchema.safeParse("").success).toBe(true);
  });

  it("rejects malformed or impossible dates", () => {
    expect(applicationDeadlineSchema.safeParse("2030-13-40").success).toBe(
      false,
    );
    expect(applicationDeadlineSchema.safeParse("2030-2-5").success).toBe(false);
    expect(applicationDeadlineSchema.safeParse("not-a-date").success).toBe(
      false,
    );
  });

  it("treats dates in UTC and does not count today as past", () => {
    const now = new Date("2026-07-11T23:30:00.000Z");
    expect(isPastCalendarDate("2020-01-01", now)).toBe(true);
    expect(isPastCalendarDate("2026-07-11", now)).toBe(false);
    expect(isPastCalendarDate("2030-01-01", now)).toBe(false);
    expect(isPastCalendarDate("", now)).toBe(false);
  });
});

describe("Public job search-parameter validation", () => {
  it("trims text, bounds length, and validates enum filters", () => {
    expect(
      parsePublicJobSearch({
        q: "  React  ",
        location: "  Baku  ",
        employmentType: "FULL_TIME",
        workplaceType: "REMOTE",
        experienceLevel: "SENIOR",
      }),
    ).toEqual({
      q: "React",
      location: "Baku",
      employmentType: "FULL_TIME",
      workplaceType: "REMOTE",
      experienceLevel: "SENIOR",
    });
  });

  it("drops invalid filters and over-long or array input", () => {
    expect(
      parsePublicJobSearch({
        q: "x".repeat(101),
        employmentType: "INVALID",
        workplaceType: "",
        experienceLevel: "??",
      }),
    ).toEqual({
      q: "",
      location: "",
      employmentType: "",
      workplaceType: "",
      experienceLevel: "",
    });
    expect(parsePublicJobSearch({ q: ["react", "vue"] }).q).toBe("react");
  });

  it("reports whether any filter is active", () => {
    expect(
      hasActiveJobFilters({
        q: "",
        location: "",
        employmentType: "",
        workplaceType: "",
        experienceLevel: "",
      }),
    ).toBe(false);
    expect(
      hasActiveJobFilters({
        q: "",
        location: "",
        employmentType: "CONTRACT",
        workplaceType: "",
        experienceLevel: "",
      }),
    ).toBe(true);
  });
});

describe("Recruiter job filter validation", () => {
  it("validates status and trims the search term", () => {
    expect(
      parseRecruiterJobFilters({
        q: "  Engineer ",
        status: "PUBLISHED",
        companyId: "cmp_1",
      }),
    ).toEqual({ q: "Engineer", status: "PUBLISHED", companyId: "cmp_1" });
    expect(parseRecruiterJobFilters({ status: "NONSENSE" }).status).toBe("");
  });
});

describe("Public job search-filter mapping", () => {
  const emptySearch = {
    q: "",
    location: "",
    employmentType: "" as const,
    workplaceType: "" as const,
    experienceLevel: "" as const,
  };

  it("always restricts to published jobs from published companies", () => {
    expect(buildPublishedJobWhere(emptySearch)).toEqual({
      status: "PUBLISHED",
      moderationStatus: "VISIBLE",
      company: { isPublished: true, moderationStatus: "VISIBLE" },
    });
  });

  it("maps free text to a title, company, and skill OR search", () => {
    const where = buildPublishedJobWhere({ ...emptySearch, q: "react" });
    expect(where.status).toBe("PUBLISHED");
    expect(where.moderationStatus).toBe("VISIBLE");
    expect(where.company).toEqual({
      isPublished: true,
      moderationStatus: "VISIBLE",
    });
    expect(where.OR).toEqual([
      { title: { contains: "react", mode: "insensitive" } },
      { company: { name: { contains: "react", mode: "insensitive" } } },
      {
        skills: {
          some: { skill: { name: { contains: "react", mode: "insensitive" } } },
        },
      },
    ]);
  });

  it("maps location and enum filters", () => {
    const where = buildPublishedJobWhere({
      ...emptySearch,
      location: "Baku",
      employmentType: "FULL_TIME",
      workplaceType: "REMOTE",
      experienceLevel: "SENIOR",
    });
    expect(where.location).toEqual({ contains: "Baku", mode: "insensitive" });
    expect(where.employmentType).toBe("FULL_TIME");
    expect(where.workplaceType).toBe("REMOTE");
    expect(where.experienceLevel).toBe("SENIOR");
    expect(where.OR).toBeUndefined();
  });
});

describe("Job skill normalization and duplicate handling", () => {
  it("normalizes skill names and lookup keys", () => {
    expect(skillSchema.parse({ name: "  React.js  " })).toEqual({
      name: "React.js",
    });
    expect(getSkillLookupName("  React   JS ")).toBe("react js");
  });

  it("detects duplicate assignments case-insensitively", () => {
    expect(isDuplicateSkillAssignment(["react"], "React")).toBe(true);
    expect(isDuplicateSkillAssignment(["react"], "Vue")).toBe(false);
  });
});
