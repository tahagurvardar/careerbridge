import { describe, expect, it } from "vitest";

import {
  applicationStatusEmailDedupeKey,
  applicationSubmittedEmailDedupeKey,
  buildApplicationStatusChangedEmail,
  buildApplicationSubmittedEmail,
  buildApplicationWithdrawnEmail,
  buildCompanyInvitationEmail,
  emailEventLabels,
  getEmailEventsForRole,
  renderEmailDestination,
  resolveEmailPreference,
  safeEmailDestination,
} from "@/features/email/email";

describe("transactional email domain", () => {
  it("maps explicit event labels and only role-relevant settings", () => {
    expect(emailEventLabels.APPLICATION_SUBMITTED).toBe("New applications");
    expect(getEmailEventsForRole("CANDIDATE")).toEqual([
      "APPLICATION_STATUS_CHANGED",
      "INTERVIEW_SCHEDULED",
      "INTERVIEW_RESCHEDULED",
      "INTERVIEW_CANCELED",
    ]);
    expect(getEmailEventsForRole("RECRUITER")).toEqual([
      "COMPANY_INVITATION_RECEIVED",
      "APPLICATION_SUBMITTED",
      "APPLICATION_WITHDRAWN",
      "INTERVIEW_RESPONSE_RECEIVED",
    ]);
    expect(getEmailEventsForRole("ADMIN")).toEqual([]);
  });

  it("defaults a missing preference to enabled and honors explicit values", () => {
    expect(resolveEmailPreference([], "APPLICATION_STATUS_CHANGED")).toBe(true);
    expect(
      resolveEmailPreference(
        [{ eventType: "APPLICATION_STATUS_CHANGED", enabled: false }],
        "APPLICATION_STATUS_CHANGED",
      ),
    ).toBe(false);
  });

  it("builds bounded text and escaped HTML templates with no private fields", () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const templates = [
      buildCompanyInvitationEmail({ companyName: malicious }),
      buildApplicationSubmittedEmail({
        applicationId: "application-1",
        candidateName: malicious,
        jobTitle: "Engineer & Researcher",
      }),
      buildApplicationStatusChangedEmail({
        applicationId: "application-1",
        jobTitle: malicious,
        status: "INTERVIEW",
      }),
      buildApplicationWithdrawnEmail({
        applicationId: "application-1",
        candidateName: "   ",
        jobTitle: malicious,
      }),
    ];

    for (const email of templates) {
      expect(email.subject.length).toBeLessThanOrEqual(200);
      expect(email.textBody).toContain("{{CAREERBRIDGE_DESTINATION_URL}}");
      expect(email.htmlBody).not.toContain(malicious);
      expect(email.htmlBody).not.toContain("candidate@example.test");
      expect(email.htmlBody).not.toContain("resume.pdf");
      expect(email.htmlBody).not.toContain("internal note");
      expect(email.htmlBody).not.toContain("activeKey");
    }
    expect(templates[3].textBody).toContain("A candidate");
    expect(templates[2].textBody).toContain("Interview");
  });

  it("accepts only same-origin absolute paths", () => {
    expect(safeEmailDestination("/candidate/applications/one")).toBe(
      "/candidate/applications/one",
    );
    for (const unsafe of [
      "https://example.test/path",
      "//example.test/path",
      "javascript:alert(1)",
      "data:text/plain,hello",
      "mailto:test@example.test",
      "relative/path",
    ]) {
      expect(() => safeEmailDestination(unsafe)).toThrow(
        "Unsafe email destination.",
      );
    }
  });

  it("renders an absolute destination only at delivery time", () => {
    expect(
      renderEmailDestination(
        "Open {{CAREERBRIDGE_DESTINATION_URL}}",
        "https://careerbridge.example/candidate/applications/one",
      ),
    ).toBe("Open https://careerbridge.example/candidate/applications/one");
  });

  it("uses deterministic event-specific dedupe keys", () => {
    expect(applicationSubmittedEmailDedupeKey("a", "u")).toBe(
      applicationSubmittedEmailDedupeKey("a", "u"),
    );
    expect(applicationSubmittedEmailDedupeKey("a", "u")).not.toBe(
      applicationStatusEmailDedupeKey("a", "u"),
    );
    expect(applicationStatusEmailDedupeKey("history-1", "u")).not.toBe(
      applicationStatusEmailDedupeKey("history-2", "u"),
    );
  });
});
