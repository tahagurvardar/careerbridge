import { describe, expect, it } from "vitest";

import {
  allowedJobActions,
  canEditJob,
  canTransitionJob,
  nextJobStatus,
} from "@/features/jobs/lifecycle";
import { getJobPublicationReadiness } from "@/features/jobs/publication";
import { getAvailableJobSlug, normalizeJobSlug } from "@/features/jobs/slug";

describe("Job slug normalization", () => {
  it.each([
    ["Senior Frontend Engineer", "senior-frontend-engineer"],
    ["  Café Manager!!  ", "cafe-manager"],
    ["React/TypeScript Dev", "react-typescript-dev"],
    ["---", "job"],
    ["", "job"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeJobSlug(input)).toBe(expected);
  });

  it("bounds slug length", () => {
    expect(normalizeJobSlug("a".repeat(300)).length).toBeLessThanOrEqual(180);
  });
});

describe("Job slug collision allocation", () => {
  it("returns the base slug when it is free", () => {
    expect(getAvailableJobSlug("frontend-engineer", [])).toBe(
      "frontend-engineer",
    );
  });

  it("allocates the first deterministic available suffix", () => {
    expect(getAvailableJobSlug("engineer", ["engineer"])).toBe("engineer-2");
    expect(
      getAvailableJobSlug("engineer", ["engineer", "engineer-2", "engineer-4"]),
    ).toBe("engineer-3");
  });
});

describe("Job lifecycle transitions", () => {
  it("allows only the documented transitions per status", () => {
    expect(allowedJobActions("DRAFT")).toEqual(["publish", "archive"]);
    expect(allowedJobActions("PUBLISHED")).toEqual(["close", "archive"]);
    expect(allowedJobActions("CLOSED")).toEqual(["archive"]);
    expect(allowedJobActions("ARCHIVED")).toEqual([]);
  });

  it("rejects invalid transitions", () => {
    expect(canTransitionJob("DRAFT", "publish")).toBe(true);
    expect(canTransitionJob("DRAFT", "close")).toBe(false);
    expect(canTransitionJob("PUBLISHED", "publish")).toBe(false);
    expect(canTransitionJob("CLOSED", "publish")).toBe(false);
    expect(canTransitionJob("CLOSED", "close")).toBe(false);
    expect(canTransitionJob("ARCHIVED", "archive")).toBe(false);
  });

  it("only permits editing drafts and published jobs", () => {
    expect(canEditJob("DRAFT")).toBe(true);
    expect(canEditJob("PUBLISHED")).toBe(true);
    expect(canEditJob("CLOSED")).toBe(false);
    expect(canEditJob("ARCHIVED")).toBe(false);
  });

  it("maps an action to its resulting status", () => {
    expect(nextJobStatus("publish")).toBe("PUBLISHED");
    expect(nextJobStatus("close")).toBe("CLOSED");
    expect(nextJobStatus("archive")).toBe("ARCHIVED");
  });
});

describe("Job publication readiness", () => {
  const completeJob = {
    title: "Frontend Engineer",
    summary: "Build product UI.",
    description: "Full description.",
    responsibilities: "Ship features.",
    requirements: "React experience.",
    location: "Baku",
    employmentType: "FULL_TIME",
    workplaceType: "HYBRID",
    experienceLevel: "MID",
  };

  it("marks a complete job under a published company as ready", () => {
    expect(
      getJobPublicationReadiness({
        companyIsPublished: true,
        skillCount: 2,
        job: completeJob,
      }),
    ).toEqual({ isReady: true, missingFields: [] });
  });

  it("requires the company to be published", () => {
    const readiness = getJobPublicationReadiness({
      companyIsPublished: false,
      skillCount: 1,
      job: completeJob,
    });
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingFields).toContainEqual({
      field: "company",
      label: "Publish the company first",
    });
  });

  it("requires at least one skill", () => {
    const readiness = getJobPublicationReadiness({
      companyIsPublished: true,
      skillCount: 0,
      job: completeJob,
    });
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingFields).toContainEqual({
      field: "skills",
      label: "At least one required skill",
    });
  });

  it("reports each missing content field", () => {
    const readiness = getJobPublicationReadiness({
      companyIsPublished: true,
      skillCount: 1,
      job: {
        ...completeJob,
        summary: "",
        location: "   ",
        employmentType: null,
      },
    });
    expect(readiness.isReady).toBe(false);
    const missing = readiness.missingFields.map(({ field }) => field);
    expect(missing).toEqual(
      expect.arrayContaining(["summary", "location", "employmentType"]),
    );
    expect(missing).not.toContain("description");
  });
});
