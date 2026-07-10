import { describe, expect, it } from "vitest";

import {
  basicProfileSchema,
  educationSchema,
  experienceSchema,
  getSkillLookupName,
  isDuplicateSkillAssignment,
  normalizeSkillName,
  skillSchema,
} from "@/features/candidate-profile/schemas";

describe("Candidate profile validation", () => {
  it("trims profile text and normalizes supported URLs", () => {
    const parsed = basicProfileSchema.parse({
      headline: "  Platform engineer  ",
      location: "  Baku  ",
      bio: "  Builds reliable systems.  ",
      websiteUrl: "https://example.com",
      linkedinUrl: "",
      githubUrl: "https://github.com/example",
    });

    expect(parsed).toEqual({
      headline: "Platform engineer",
      location: "Baku",
      bio: "Builds reliable systems.",
      websiteUrl: "https://example.com/",
      linkedinUrl: "",
      githubUrl: "https://github.com/example",
    });
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "not a url"])(
    "rejects an unsafe or invalid professional URL: %s",
    (websiteUrl) => {
      expect(
        basicProfileSchema.safeParse({
          headline: "",
          location: "",
          bio: "",
          websiteUrl,
          linkedinUrl: "",
          githubUrl: "",
        }).success,
      ).toBe(false);
    },
  );
});

describe("Education validation", () => {
  const validEducation = {
    school: "CareerBridge University",
    degree: "BSc",
    fieldOfStudy: "Computer Science",
    startYear: 2020,
    endYear: 2024,
    isCurrent: false,
    description: "",
  };

  it("accepts a chronological completed program", () => {
    expect(educationSchema.safeParse(validEducation).success).toBe(true);
  });

  it("requires a current program to omit the end year", () => {
    const parsed = educationSchema.safeParse({
      ...validEducation,
      isCurrent: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects an end year before the start year", () => {
    const parsed = educationSchema.safeParse({
      ...validEducation,
      endYear: 2019,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects unrealistic years", () => {
    expect(
      educationSchema.safeParse({ ...validEducation, startYear: 1949 }).success,
    ).toBe(false);
  });
});

describe("Experience validation", () => {
  const validExperience = {
    companyName: "CareerBridge Labs",
    jobTitle: "Engineer",
    employmentType: "FULL_TIME" as const,
    location: "Remote",
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    isCurrent: false,
    description: "",
  };

  it("accepts chronological employment dates", () => {
    expect(experienceSchema.safeParse(validExperience).success).toBe(true);
  });

  it("requires a current role to omit its end date", () => {
    expect(
      experienceSchema.safeParse({ ...validExperience, isCurrent: true })
        .success,
    ).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    expect(
      experienceSchema.safeParse({
        ...validExperience,
        endDate: "2023-12-31",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid calendar dates", () => {
    expect(
      experienceSchema.safeParse({
        ...validExperience,
        startDate: "2025-02-30",
      }).success,
    ).toBe(false);
  });
});

describe("Skill normalization", () => {
  it("normalizes Unicode width and repeated whitespace", () => {
    expect(normalizeSkillName("  ＴｙｐｅＳｃｒｉｐｔ   APIs ")).toBe(
      "TypeScript APIs",
    );
    expect(getSkillLookupName(" TypeScript ")).toBe("typescript");
  });

  it("allows common technical skill punctuation", () => {
    expect(skillSchema.parse({ name: " C++ " })).toEqual({ name: "C++" });
    expect(skillSchema.parse({ name: "Node.js" })).toEqual({ name: "Node.js" });
  });

  it("rejects empty and unsupported values", () => {
    expect(skillSchema.safeParse({ name: " " }).success).toBe(false);
    expect(skillSchema.safeParse({ name: "<script>" }).success).toBe(false);
  });

  it("detects duplicate assignments after normalization", () => {
    expect(isDuplicateSkillAssignment(["typescript"], "  TypeScript ")).toBe(
      true,
    );
    expect(isDuplicateSkillAssignment(["typescript"], "React")).toBe(false);
  });
});
