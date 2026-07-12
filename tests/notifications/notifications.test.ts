import { describe, expect, it } from "vitest";

import type { NotificationType } from "@/generated/prisma/enums";
import { PLATFORM_ROLES } from "@/features/auth/roles";
import {
  applicationStatusChangedDedupeKey,
  applicationSubmittedDedupeKey,
  applicationWithdrawnDedupeKey,
  boundedText,
  buildApplicationStatusChangedContent,
  buildApplicationSubmittedContent,
  buildApplicationWithdrawnContent,
  CANDIDATE_DISPLAY_FALLBACK,
  dedupeRecipientIds,
  formatUnreadBadge,
  isNotificationCenterRole,
  NOTIFICATION_CENTER_ROLES,
  NOTIFICATION_MESSAGE_MAX,
  NOTIFICATION_TITLE_MAX,
  notificationTypeIconKeys,
  notificationTypeLabels,
  resolveCandidateDisplayName,
  safeNotificationHref,
  unreadBellLabel,
} from "@/features/notifications/notifications";

const ALL_TYPES: NotificationType[] = [
  "APPLICATION_SUBMITTED",
  "APPLICATION_STATUS_CHANGED",
  "APPLICATION_WITHDRAWN",
];

describe("notification type labels and icon keys", () => {
  it("labels every notification type", () => {
    for (const type of ALL_TYPES) {
      expect(notificationTypeLabels[type]).toBeTruthy();
    }
    expect(Object.keys(notificationTypeLabels).sort()).toEqual(
      [...ALL_TYPES].sort(),
    );
  });

  it("maps every notification type to a defined icon key", () => {
    for (const type of ALL_TYPES) {
      expect(notificationTypeIconKeys[type]).toBeTruthy();
    }
    expect(Object.keys(notificationTypeIconKeys).sort()).toEqual(
      [...ALL_TYPES].sort(),
    );
  });
});

describe("candidate display-name fallback", () => {
  it("uses a trimmed name when present", () => {
    expect(resolveCandidateDisplayName("  Ada Lovelace  ")).toBe(
      "Ada Lovelace",
    );
  });

  it("falls back for null, undefined, empty, or whitespace names", () => {
    expect(resolveCandidateDisplayName(null)).toBe(CANDIDATE_DISPLAY_FALLBACK);
    expect(resolveCandidateDisplayName(undefined)).toBe(
      CANDIDATE_DISPLAY_FALLBACK,
    );
    expect(resolveCandidateDisplayName("")).toBe(CANDIDATE_DISPLAY_FALLBACK);
    expect(resolveCandidateDisplayName("   ")).toBe(CANDIDATE_DISPLAY_FALLBACK);
  });
});

describe("bounded text", () => {
  it("returns short values unchanged", () => {
    expect(boundedText("hello", 20)).toBe("hello");
  });

  it("truncates long values with an ellipsis within the bound", () => {
    const result = boundedText("x".repeat(300), 10);
    expect(Array.from(result)).toHaveLength(10);
    expect(result.endsWith("…")).toBe(true);
  });
});

describe("notification copy generation", () => {
  it("builds the application-submitted snapshot", () => {
    const content = buildApplicationSubmittedContent({
      applicationId: "app_1",
      candidateName: "Grace Hopper",
      jobTitle: "Staff Engineer",
    });
    expect(content).toEqual({
      title: "New application received",
      message: "Grace Hopper applied for Staff Engineer.",
      href: "/recruiter/applications/app_1",
    });
  });

  it("builds the application-status-changed snapshot with the status label", () => {
    const content = buildApplicationStatusChangedContent({
      applicationId: "app_2",
      jobTitle: "Product Designer",
      status: "UNDER_REVIEW",
    });
    expect(content).toEqual({
      title: "Application status updated",
      message: "Your application for Product Designer is now Under review.",
      href: "/candidate/applications/app_2",
    });
  });

  it("builds the application-withdrawn snapshot", () => {
    const content = buildApplicationWithdrawnContent({
      applicationId: "app_3",
      candidateName: "Katherine Johnson",
      jobTitle: "Data Scientist",
    });
    expect(content).toEqual({
      title: "Application withdrawn",
      message:
        "Katherine Johnson withdrew their application for Data Scientist.",
      href: "/recruiter/applications/app_3",
    });
  });

  it("uses the display-name fallback in copy and never leaks email", () => {
    const content = buildApplicationSubmittedContent({
      applicationId: "app_4",
      candidateName: "   ",
      jobTitle: "Engineer",
    });
    expect(content.message).toBe(
      `${CANDIDATE_DISPLAY_FALLBACK} applied for Engineer.`,
    );
    expect(content.message).not.toContain("@");
  });

  it("keeps title and message within the column bounds", () => {
    const content = buildApplicationSubmittedContent({
      applicationId: "app_5",
      candidateName: "N".repeat(400),
      jobTitle: "J".repeat(400),
    });
    expect(content.title.length).toBeLessThanOrEqual(NOTIFICATION_TITLE_MAX);
    expect(Array.from(content.message).length).toBeLessThanOrEqual(
      NOTIFICATION_MESSAGE_MAX,
    );
  });
});

describe("safe internal destination", () => {
  it("passes through valid internal application paths", () => {
    expect(safeNotificationHref("/candidate/applications/app_1")).toBe(
      "/candidate/applications/app_1",
    );
    expect(safeNotificationHref("/recruiter/applications/app_2")).toBe(
      "/recruiter/applications/app_2",
    );
  });

  it("rejects external, protocol-relative, and malformed destinations", () => {
    expect(safeNotificationHref("https://evil.example.com/steal")).toBe(
      "/notifications",
    );
    expect(safeNotificationHref("//evil.example.com")).toBe("/notifications");
    expect(safeNotificationHref("javascript:alert(1)")).toBe("/notifications");
    expect(safeNotificationHref("mailto:someone@example.com")).toBe(
      "/notifications",
    );
    expect(safeNotificationHref("relative/path")).toBe("/notifications");
    expect(safeNotificationHref("")).toBe("/notifications");
  });
});

describe("dedupe-key generation", () => {
  it("builds deterministic, event-scoped keys", () => {
    expect(applicationSubmittedDedupeKey("app_1", "user_a")).toBe(
      "application-submitted:app_1:user_a",
    );
    expect(applicationStatusChangedDedupeKey("hist_1", "user_b")).toBe(
      "application-status-changed:hist_1:user_b",
    );
    expect(applicationWithdrawnDedupeKey("hist_2", "user_c")).toBe(
      "application-withdrawn:hist_2:user_c",
    );
  });

  it("produces distinct keys per recipient and per event", () => {
    expect(applicationSubmittedDedupeKey("app_1", "user_a")).not.toBe(
      applicationSubmittedDedupeKey("app_1", "user_b"),
    );
    expect(applicationStatusChangedDedupeKey("hist_1", "user_a")).not.toBe(
      applicationStatusChangedDedupeKey("hist_2", "user_a"),
    );
  });
});

describe("recipient de-duplication", () => {
  it("removes duplicates while preserving order", () => {
    expect(dedupeRecipientIds(["a", "b", "a", "c", "b"])).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("drops the excluded acting user and blank ids", () => {
    expect(dedupeRecipientIds(["a", "actor", "b", ""], "actor")).toEqual([
      "a",
      "b",
    ]);
  });

  it("returns an empty list when everyone is excluded", () => {
    expect(dedupeRecipientIds(["actor", "actor"], "actor")).toEqual([]);
  });
});

describe("unread badge formatting", () => {
  it("shows nothing for zero, negative, or invalid counts", () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-3)).toBeNull();
    expect(formatUnreadBadge(Number.NaN)).toBeNull();
    expect(formatUnreadBadge(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("shows the exact count from 1 to 99", () => {
    expect(formatUnreadBadge(1)).toBe("1");
    expect(formatUnreadBadge(42)).toBe("42");
    expect(formatUnreadBadge(99)).toBe("99");
  });

  it("caps at 99+ for 100 or more", () => {
    expect(formatUnreadBadge(100)).toBe("99+");
    expect(formatUnreadBadge(5000)).toBe("99+");
  });

  it("labels the bell for screen readers", () => {
    expect(unreadBellLabel(0)).toBe("Notifications");
    expect(unreadBellLabel(3)).toBe("Notifications, 3 unread");
    expect(unreadBellLabel(250)).toBe("Notifications, 99+ unread");
  });
});

describe("notification center roles", () => {
  it("admits only Candidate and Recruiter", () => {
    expect(isNotificationCenterRole("CANDIDATE")).toBe(true);
    expect(isNotificationCenterRole("RECRUITER")).toBe(true);
    expect(isNotificationCenterRole("ADMIN")).toBe(false);
  });

  it("never admits a platform role outside the supported set", () => {
    const supported = new Set<string>(NOTIFICATION_CENTER_ROLES);
    for (const role of PLATFORM_ROLES) {
      expect(isNotificationCenterRole(role)).toBe(supported.has(role));
    }
  });
});
