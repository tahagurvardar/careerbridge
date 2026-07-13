import { describe, expect, it } from "vitest";

import {
  buildInterviewCanceledEmail,
  buildInterviewRescheduledEmail,
  buildInterviewResponseReceivedEmail,
  buildInterviewScheduledEmail,
  interviewCanceledEmailDedupeKey,
  interviewRescheduledEmailDedupeKey,
  interviewResponseReceivedEmailDedupeKey,
  interviewScheduledEmailDedupeKey,
  emailEventLabels,
  isEmailEventAllowedForRole,
  resolveEmailPreference,
} from "@/features/email/email";
import {
  buildInterviewCanceledContent,
  buildInterviewRescheduledContent,
  buildInterviewResponseReceivedContent,
  buildInterviewScheduledContent,
  interviewCanceledDedupeKey,
  interviewRescheduledDedupeKey,
  interviewResponseReceivedDedupeKey,
  interviewScheduledDedupeKey,
  notificationTypeIconKeys,
  notificationTypeLabels,
} from "@/features/notifications/notifications";

const SENSITIVE = [
  "https://secret-meeting.example.test/room",
  "12 Hidden Street",
  "candidate@example.test",
  "resume.pdf",
];

describe("interview notification copy", () => {
  it("builds the scheduled/rescheduled/canceled candidate copy with safe destinations", () => {
    const scheduled = buildInterviewScheduledContent({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
    });
    expect(scheduled.title).toBe("Interview scheduled");
    expect(scheduled.message).toBe(
      "An interview was scheduled for your application to Backend Engineer.",
    );
    expect(scheduled.href).toBe("/candidate/interviews/interview-1");

    const rescheduled = buildInterviewRescheduledContent({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
    });
    expect(rescheduled.title).toBe("Interview rescheduled");
    expect(rescheduled.message).toBe(
      "Your interview for Backend Engineer was rescheduled.",
    );
    expect(rescheduled.href).toBe("/candidate/interviews/interview-1");

    const canceled = buildInterviewCanceledContent({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
    });
    expect(canceled.title).toBe("Interview canceled");
    expect(canceled.message).toBe(
      "Your interview for Backend Engineer was canceled.",
    );
    expect(canceled.href).toBe("/candidate/interviews/interview-1");
  });

  it("builds recruiter response copy with a display-name fallback", () => {
    const accepted = buildInterviewResponseReceivedContent({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
      candidateName: "Jordan Reed",
      response: "ACCEPTED",
    });
    expect(accepted.title).toBe("Interview response received");
    expect(accepted.message).toBe(
      "Jordan Reed accepted the interview for Backend Engineer.",
    );
    expect(accepted.href).toBe("/recruiter/interviews/interview-1");

    const declined = buildInterviewResponseReceivedContent({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
      candidateName: "   ",
      response: "DECLINED",
    });
    expect(declined.message).toBe(
      "A candidate declined the interview for Backend Engineer.",
    );
  });

  it("never embeds schedule details or private data in notification copy", () => {
    const contents = [
      buildInterviewScheduledContent({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewRescheduledContent({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewCanceledContent({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewResponseReceivedContent({
        interviewId: "interview-1",
        jobTitle: "Engineer",
        candidateName: "Jordan",
        response: "ACCEPTED",
      }),
    ];
    for (const content of contents) {
      for (const value of SENSITIVE) {
        expect(content.title).not.toContain(value);
        expect(content.message).not.toContain(value);
      }
      expect(content.href.startsWith("/")).toBe(true);
      expect(content.href.startsWith("//")).toBe(false);
    }
  });

  it("derives deterministic per-recipient dedupe keys", () => {
    expect(interviewScheduledDedupeKey("interview-1", "user-1")).toBe(
      "interview-scheduled:interview-1:user-1",
    );
    expect(interviewRescheduledDedupeKey("event-1", "user-1")).toBe(
      "interview-rescheduled:event-1:user-1",
    );
    expect(interviewCanceledDedupeKey("interview-1", "user-1")).toBe(
      "interview-canceled:interview-1:user-1",
    );
    expect(interviewResponseReceivedDedupeKey("event-1", "user-1")).toBe(
      "interview-response-received:event-1:user-1",
    );
    // Distinct recipients and events always produce distinct keys.
    expect(interviewScheduledDedupeKey("interview-1", "user-1")).not.toBe(
      interviewScheduledDedupeKey("interview-1", "user-2"),
    );
    expect(interviewRescheduledDedupeKey("event-1", "user-1")).not.toBe(
      interviewRescheduledDedupeKey("event-2", "user-1"),
    );
  });

  it("labels and icon keys cover the interview notification types", () => {
    expect(notificationTypeLabels.INTERVIEW_SCHEDULED).toBe(
      "Interview scheduled",
    );
    expect(notificationTypeLabels.INTERVIEW_RESPONSE_RECEIVED).toBe(
      "Interview response",
    );
    expect(notificationTypeIconKeys.INTERVIEW_SCHEDULED).toBe("interview");
    expect(notificationTypeIconKeys.INTERVIEW_RESCHEDULED).toBe("interview");
    expect(notificationTypeIconKeys.INTERVIEW_CANCELED).toBe("interview");
    expect(notificationTypeIconKeys.INTERVIEW_RESPONSE_RECEIVED).toBe(
      "inbound",
    );
  });
});

describe("interview email templates", () => {
  it("builds candidate templates with escaped HTML and safe destinations", () => {
    const malicious = '<img src=x onerror="alert(1)"> & Engineer';
    const templates = [
      buildInterviewScheduledEmail({
        interviewId: "interview-1",
        jobTitle: malicious,
      }),
      buildInterviewRescheduledEmail({
        interviewId: "interview-1",
        jobTitle: malicious,
      }),
      buildInterviewCanceledEmail({
        interviewId: "interview-1",
        jobTitle: malicious,
      }),
    ];
    for (const template of templates) {
      expect(template.destinationPath).toBe(
        "/candidate/interviews/interview-1",
      );
      expect(template.htmlBody).not.toContain("<img");
      expect(template.htmlBody).toContain("&lt;img");
      expect(template.htmlBody).toContain("&amp;");
      expect(template.textBody).toContain("{{CAREERBRIDGE_DESTINATION_URL}}");
    }
  });

  it("builds the recruiter response template with the response verb", () => {
    const accepted = buildInterviewResponseReceivedEmail({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
      candidateName: "Jordan Reed",
      response: "ACCEPTED",
    });
    expect(accepted.subject).toBe(
      "Interview response received for Backend Engineer",
    );
    expect(accepted.textBody).toContain(
      "Jordan Reed accepted the interview for Backend Engineer.",
    );
    expect(accepted.destinationPath).toBe("/recruiter/interviews/interview-1");

    const declined = buildInterviewResponseReceivedEmail({
      interviewId: "interview-1",
      jobTitle: "Backend Engineer",
      candidateName: null,
      response: "DECLINED",
    });
    expect(declined.textBody).toContain(
      "A candidate declined the interview for Backend Engineer.",
    );
  });

  it("never embeds the meeting URL, location, or candidate email in email bodies", () => {
    const templates = [
      buildInterviewScheduledEmail({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewRescheduledEmail({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewCanceledEmail({
        interviewId: "interview-1",
        jobTitle: "Engineer",
      }),
      buildInterviewResponseReceivedEmail({
        interviewId: "interview-1",
        jobTitle: "Engineer",
        candidateName: "Jordan",
        response: "ACCEPTED",
      }),
    ];
    for (const template of templates) {
      for (const value of SENSITIVE) {
        expect(template.subject).not.toContain(value);
        expect(template.textBody).not.toContain(value);
        expect(template.htmlBody).not.toContain(value);
      }
    }
  });

  it("derives deterministic email dedupe keys distinct from notification keys", () => {
    expect(interviewScheduledEmailDedupeKey("interview-1", "user-1")).toBe(
      "interview-scheduled-email:interview-1:user-1",
    );
    expect(interviewRescheduledEmailDedupeKey("event-1", "user-1")).toBe(
      "interview-rescheduled-email:event-1:user-1",
    );
    expect(interviewCanceledEmailDedupeKey("interview-1", "user-1")).toBe(
      "interview-canceled-email:interview-1:user-1",
    );
    expect(interviewResponseReceivedEmailDedupeKey("event-1", "user-1")).toBe(
      "interview-response-received-email:event-1:user-1",
    );
  });

  it("maps interview events to the right roles and preference defaults", () => {
    expect(isEmailEventAllowedForRole("CANDIDATE", "INTERVIEW_SCHEDULED")).toBe(
      true,
    );
    expect(
      isEmailEventAllowedForRole("CANDIDATE", "INTERVIEW_RESCHEDULED"),
    ).toBe(true);
    expect(isEmailEventAllowedForRole("CANDIDATE", "INTERVIEW_CANCELED")).toBe(
      true,
    );
    expect(
      isEmailEventAllowedForRole("CANDIDATE", "INTERVIEW_RESPONSE_RECEIVED"),
    ).toBe(false);
    expect(
      isEmailEventAllowedForRole("RECRUITER", "INTERVIEW_RESPONSE_RECEIVED"),
    ).toBe(true);
    expect(isEmailEventAllowedForRole("RECRUITER", "INTERVIEW_SCHEDULED")).toBe(
      false,
    );
    expect(isEmailEventAllowedForRole("ADMIN", "INTERVIEW_SCHEDULED")).toBe(
      false,
    );

    // Missing preference row means enabled; explicit false disables.
    expect(resolveEmailPreference([], "INTERVIEW_SCHEDULED")).toBe(true);
    expect(
      resolveEmailPreference(
        [{ eventType: "INTERVIEW_SCHEDULED", enabled: false }],
        "INTERVIEW_SCHEDULED",
      ),
    ).toBe(false);

    expect(emailEventLabels.INTERVIEW_SCHEDULED).toBe("Interview scheduled");
    expect(emailEventLabels.INTERVIEW_RESPONSE_RECEIVED).toBe(
      "Interview responses",
    );
  });
});
