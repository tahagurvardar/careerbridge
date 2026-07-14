import { describe, expect, it } from "vitest";

import { createModerationMutationSchema } from "@/features/admin/schemas";
import { createApplicationNoteSchemas } from "@/features/application-notes/schemas";
import { createApplySchema } from "@/features/applications/schemas";
import { createCandidateProfileSchemas } from "@/features/candidate-profile/schemas";
import { createInviteRecruiterSchema } from "@/features/company-team/schemas";
import { buildInterviewScheduleSchema } from "@/features/interviews/schemas";
import { createJobSchemas } from "@/features/jobs/schemas";
import { createRecruiterCompanySchemas } from "@/features/recruiter-company/schemas";
import type { AppDictionary } from "@/i18n/dictionary";
import { dictionary as az } from "@/i18n/dictionaries/az";
import { dictionary as en } from "@/i18n/dictionaries/en";
import { dictionary as ru } from "@/i18n/dictionaries/ru";
import { dictionary as tr } from "@/i18n/dictionaries/tr";

const dictionaries: AppDictionary[] = [en, tr, az, ru];

describe("localized validation factories", () => {
  it("rejects identical invalid input in every locale with localized messages", () => {
    const messageSets = dictionaries.map((d) =>
      [
        createApplySchema(d.validation).safeParse({
          coverLetter: "x".repeat(6001),
        }),
        createCandidateProfileSchemas(
          d.validation,
          d.candidate,
        ).educationSchema.safeParse({
          school: "",
          degree: "",
          fieldOfStudy: "",
          startYear: 2025,
          endYear: 2024,
          isCurrent: false,
          description: "",
        }),
        createJobSchemas(d.validation, d.recruiter).jobCreateSchema.safeParse({
          companyId: "company-1",
          title: "",
          summary: "",
          description: "",
          responsibilities: "",
          requirements: "",
          location: "",
          employmentType: "",
          workplaceType: "",
          experienceLevel: "",
          salaryMin: null,
          salaryMax: null,
          salaryCurrency: "",
          applicationDeadline: "",
        }),
        createRecruiterCompanySchemas(
          d.validation,
          d.recruiter,
        ).companySchema.safeParse({ name: "" }),
        createInviteRecruiterSchema(d.validation).safeParse({
          email: "not-an-email",
        }),
        createApplicationNoteSchemas(
          d.recruiter.notes.actions,
        ).createNoteSchema.safeParse({ body: "   " }),
        createModerationMutationSchema(
          d.validation,
          d.admin.moderationForm,
        ).safeParse({ targetId: "user-1", expectedVersion: 1, reasonCode: "" }),
        buildInterviewScheduleSchema(
          new Date("2026-01-01T00:00:00Z"),
          d.interviews.scheduleForm.validation,
        ).safeParse({
          title: "",
          format: "VIDEO",
          startAt: "2026-01-02T10:00:00Z",
          endAt: "2026-01-02T11:00:00Z",
          timeZone: "UTC",
          location: "",
          meetingUrl: "https://meet.example/room",
          instructions: "",
        }),
      ].map((result) => {
        expect(result.success).toBe(false);
        return result.success ? "" : result.error.issues[0]?.message;
      }),
    );
    for (let column = 0; column < messageSets[0].length; column += 1) {
      expect(
        new Set(messageSets.map((messages) => messages[column])).size,
      ).toBeGreaterThan(1);
    }
  });
});
