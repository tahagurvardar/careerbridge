import { describe, expect, it } from "vitest";

import {
  buildCandidateApplicationWhere,
  buildRecruiterApplicationWhere,
} from "@/features/applications/search";

describe("Candidate application filter mapping", () => {
  it("always scopes to the candidate's own id", () => {
    expect(
      buildCandidateApplicationWhere("cand_1", { q: "", status: "" }),
    ).toEqual({ candidateId: "cand_1" });
  });

  it("maps status and free-text search across job and company", () => {
    const where = buildCandidateApplicationWhere("cand_1", {
      q: "react",
      status: "OFFER",
    });
    expect(where.candidateId).toBe("cand_1");
    expect(where.status).toBe("OFFER");
    expect(where.OR).toEqual([
      { job: { title: { contains: "react", mode: "insensitive" } } },
      {
        job: { company: { name: { contains: "react", mode: "insensitive" } } },
      },
    ]);
  });
});

describe("Recruiter application filter mapping", () => {
  it("always constrains to OWNER-owned company jobs", () => {
    const where = buildRecruiterApplicationWhere("user_1", {
      q: "",
      status: "",
      companyId: "",
      jobId: "",
    });
    expect(where.job).toEqual({
      company: { memberships: { some: { userId: "user_1", role: "OWNER" } } },
    });
    expect(where.OR).toBeUndefined();
  });

  it("adds company, job, and status filters while keeping ownership", () => {
    const where = buildRecruiterApplicationWhere("user_1", {
      q: "ana",
      status: "SUBMITTED",
      companyId: "cmp_1",
      jobId: "job_1",
    });
    expect(where.job).toEqual({
      company: { memberships: { some: { userId: "user_1", role: "OWNER" } } },
      companyId: "cmp_1",
    });
    expect(where.jobId).toBe("job_1");
    expect(where.status).toBe("SUBMITTED");
    expect(where.OR).toEqual([
      { candidate: { name: { contains: "ana", mode: "insensitive" } } },
      { candidate: { email: { contains: "ana", mode: "insensitive" } } },
      { job: { title: { contains: "ana", mode: "insensitive" } } },
      { job: { company: { name: { contains: "ana", mode: "insensitive" } } } },
    ]);
  });
});
