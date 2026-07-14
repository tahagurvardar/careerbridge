import { describe, expect, it } from "vitest";

import {
  buildApplicationStatusChangedEmail,
  buildApplicationSubmittedEmail,
  buildApplicationWithdrawnEmail,
  buildCompanyInvitationEmail,
  buildInterviewCanceledEmail,
  buildInterviewRescheduledEmail,
  buildInterviewResponseReceivedEmail,
  buildInterviewScheduledEmail,
} from "@/features/email/email";
import {
  buildApplicationStatusChangedContent,
  buildApplicationSubmittedContent,
  buildApplicationWithdrawnContent,
  buildCompanyInvitationReceivedContent,
  buildInterviewCanceledContent,
  buildInterviewRescheduledContent,
  buildInterviewResponseReceivedContent,
  buildInterviewScheduledContent,
} from "@/features/notifications/notifications";
import type { AppDictionary } from "@/i18n/dictionary";
import { dictionary as az } from "@/i18n/dictionaries/az";
import { dictionary as en } from "@/i18n/dictionaries/en";
import { dictionary as ru } from "@/i18n/dictionaries/ru";
import { dictionary as tr } from "@/i18n/dictionaries/tr";
import { localizeInternalPath } from "@/i18n/paths";

const dictionaries = [
  ["en", en],
  ["tr", tr],
  ["az", az],
  ["ru", ru],
] as const satisfies readonly (readonly [
  "en" | "tr" | "az" | "ru",
  AppDictionary,
])[];

const jobTitle = 'Senior <script>alert("x")</script> Engineer';
const candidateName = "Synthetic Candidate";

const notificationBuilders = [
  (d: AppDictionary) =>
    buildApplicationSubmittedContent(
      { applicationId: "app-1", candidateName, jobTitle },
      d,
    ),
  (d: AppDictionary) =>
    buildApplicationStatusChangedContent(
      { applicationId: "app-1", jobTitle, status: "INTERVIEW" },
      d,
    ),
  (d: AppDictionary) =>
    buildApplicationWithdrawnContent(
      { applicationId: "app-1", candidateName, jobTitle },
      d,
    ),
  (d: AppDictionary) =>
    buildCompanyInvitationReceivedContent(
      { companyName: "Example Test Labs" },
      d,
    ),
  (d: AppDictionary) =>
    buildInterviewScheduledContent({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewRescheduledContent({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewCanceledContent({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewResponseReceivedContent(
      { interviewId: "int-1", candidateName, jobTitle, response: "ACCEPTED" },
      d,
    ),
];

const emailBuilders = [
  (d: AppDictionary) =>
    buildCompanyInvitationEmail({ companyName: "Example Test Labs" }, d),
  (d: AppDictionary) =>
    buildApplicationSubmittedEmail(
      { applicationId: "app-1", candidateName, jobTitle },
      d,
    ),
  (d: AppDictionary) =>
    buildApplicationStatusChangedEmail(
      { applicationId: "app-1", jobTitle, status: "INTERVIEW" },
      d,
    ),
  (d: AppDictionary) =>
    buildApplicationWithdrawnEmail(
      { applicationId: "app-1", candidateName, jobTitle },
      d,
    ),
  (d: AppDictionary) =>
    buildInterviewScheduledEmail({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewRescheduledEmail({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewCanceledEmail({ interviewId: "int-1", jobTitle }, d),
  (d: AppDictionary) =>
    buildInterviewResponseReceivedEmail(
      { interviewId: "int-1", candidateName, jobTitle, response: "DECLINED" },
      d,
    ),
];

describe("localized notification and email snapshots", () => {
  it("builds every notification event independently in all four locales", () => {
    for (const build of notificationBuilders) {
      const outputs = dictionaries.map(([, dictionary]) => build(dictionary));
      expect(
        new Set(outputs.map((output) => output.title)).size,
      ).toBeGreaterThan(1);
      for (const output of outputs) {
        expect(output.title.trim()).not.toBe("");
        expect(output.message).not.toMatch(
          /candidate@example\.test|resume\.pdf|meeting-secret|internal note/i,
        );
        expect(output.href).toMatch(/^\/(candidate|recruiter)\//);
        expect(output.href).not.toMatch(/^\/(en|tr|az|ru)\//);
      }
    }
  });

  it("builds immutable localized email content without exposing protected interview data", () => {
    for (const build of emailBuilders) {
      const outputs = dictionaries.map(([, dictionary]) => build(dictionary));
      expect(
        new Set(outputs.map((output) => output.subject)).size,
      ).toBeGreaterThan(1);
      for (const output of outputs) {
        expect(output.destinationPath).toMatch(/^\/(candidate|recruiter)\//);
        expect(output.textBody).not.toMatch(
          /candidate@example\.test|resume\.pdf|meeting-secret|internal note/i,
        );
        expect(output.htmlBody).not.toContain("<script>");
        if (output.textBody.includes("<script>")) {
          expect(output.htmlBody).toContain("&lt;script&gt;");
        }
      }
    }
  });

  it("keeps stored destinations canonical and localizes them only at dispatch/render time", () => {
    const template = buildInterviewScheduledEmail(
      { interviewId: "int-1", jobTitle },
      en,
    );
    expect(template.destinationPath).toBe("/candidate/interviews/int-1");
    for (const [locale] of dictionaries) {
      expect(localizeInternalPath(template.destinationPath, locale)).toBe(
        `/${locale}/candidate/interviews/int-1`,
      );
    }
  });
});
