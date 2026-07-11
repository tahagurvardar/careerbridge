import { describe, expect, it } from "vitest";

import {
  ACTIVE_APPLICATION_STATUSES,
  canCandidateWithdrawApplication,
  canRecruiterTransitionApplication,
  getAllowedRecruiterTransitions,
  isActiveApplicationStatus,
  isTerminalApplicationStatus,
  TERMINAL_APPLICATION_STATUSES,
} from "@/features/applications/lifecycle";

describe("Recruiter transition rules", () => {
  it("exposes only the documented forward transitions", () => {
    expect(getAllowedRecruiterTransitions("SUBMITTED")).toEqual([
      "UNDER_REVIEW",
      "REJECTED",
    ]);
    expect(getAllowedRecruiterTransitions("UNDER_REVIEW")).toEqual([
      "INTERVIEW",
      "REJECTED",
    ]);
    expect(getAllowedRecruiterTransitions("INTERVIEW")).toEqual([
      "OFFER",
      "REJECTED",
    ]);
    expect(getAllowedRecruiterTransitions("OFFER")).toEqual([
      "HIRED",
      "REJECTED",
    ]);
    expect(getAllowedRecruiterTransitions("HIRED")).toEqual([]);
    expect(getAllowedRecruiterTransitions("REJECTED")).toEqual([]);
    expect(getAllowedRecruiterTransitions("WITHDRAWN")).toEqual([]);
  });

  it("accepts documented transitions and rejects invalid ones", () => {
    expect(canRecruiterTransitionApplication("SUBMITTED", "UNDER_REVIEW")).toBe(
      true,
    );
    expect(canRecruiterTransitionApplication("INTERVIEW", "OFFER")).toBe(true);
    expect(canRecruiterTransitionApplication("OFFER", "HIRED")).toBe(true);
    expect(canRecruiterTransitionApplication("SUBMITTED", "REJECTED")).toBe(
      true,
    );
  });

  it("rejects backward transitions", () => {
    expect(canRecruiterTransitionApplication("UNDER_REVIEW", "SUBMITTED")).toBe(
      false,
    );
    expect(canRecruiterTransitionApplication("INTERVIEW", "UNDER_REVIEW")).toBe(
      false,
    );
    expect(canRecruiterTransitionApplication("OFFER", "INTERVIEW")).toBe(false);
  });

  it("rejects skipped and terminal-state transitions", () => {
    expect(canRecruiterTransitionApplication("SUBMITTED", "INTERVIEW")).toBe(
      false,
    );
    expect(canRecruiterTransitionApplication("HIRED", "REJECTED")).toBe(false);
    expect(canRecruiterTransitionApplication("REJECTED", "UNDER_REVIEW")).toBe(
      false,
    );
    expect(canRecruiterTransitionApplication("WITHDRAWN", "UNDER_REVIEW")).toBe(
      false,
    );
  });

  it("never lets a recruiter set WITHDRAWN", () => {
    for (const from of [
      "SUBMITTED",
      "UNDER_REVIEW",
      "INTERVIEW",
      "OFFER",
    ] as const) {
      expect(canRecruiterTransitionApplication(from, "WITHDRAWN")).toBe(false);
    }
  });
});

describe("Candidate withdrawal rules", () => {
  it("allows withdrawal only from active states", () => {
    for (const status of [
      "SUBMITTED",
      "UNDER_REVIEW",
      "INTERVIEW",
      "OFFER",
    ] as const) {
      expect(canCandidateWithdrawApplication(status)).toBe(true);
    }
    for (const status of ["HIRED", "REJECTED", "WITHDRAWN"] as const) {
      expect(canCandidateWithdrawApplication(status)).toBe(false);
    }
  });
});

describe("Status classification", () => {
  it("defines active and terminal status sets", () => {
    expect(ACTIVE_APPLICATION_STATUSES).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "INTERVIEW",
      "OFFER",
    ]);
    expect(TERMINAL_APPLICATION_STATUSES).toEqual([
      "HIRED",
      "REJECTED",
      "WITHDRAWN",
    ]);
  });

  it("classifies individual statuses", () => {
    expect(isActiveApplicationStatus("INTERVIEW")).toBe(true);
    expect(isActiveApplicationStatus("HIRED")).toBe(false);
    expect(isTerminalApplicationStatus("WITHDRAWN")).toBe(true);
    expect(isTerminalApplicationStatus("SUBMITTED")).toBe(false);
  });
});
