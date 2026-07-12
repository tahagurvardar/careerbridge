import { describe, expect, it } from "vitest";

import {
  hasActiveNotificationFilter,
  NOTIFICATIONS_MAX_PAGE,
  notificationFilterLabels,
  notificationIdSchema,
  parseNotificationSearch,
} from "@/features/notifications/schemas";

describe("notification filter validation", () => {
  it("accepts the known filters", () => {
    expect(parseNotificationSearch({ filter: "ALL" }).filter).toBe("ALL");
    expect(parseNotificationSearch({ filter: "UNREAD" }).filter).toBe("UNREAD");
    expect(parseNotificationSearch({ filter: "READ" }).filter).toBe("READ");
  });

  it("falls back to ALL for unknown, missing, or malformed filters", () => {
    expect(parseNotificationSearch({}).filter).toBe("ALL");
    expect(parseNotificationSearch({ filter: "BOGUS" }).filter).toBe("ALL");
    expect(parseNotificationSearch({ filter: "" }).filter).toBe("ALL");
    expect(parseNotificationSearch({ filter: ["UNREAD", "READ"] }).filter).toBe(
      "UNREAD",
    );
    expect(parseNotificationSearch({ filter: "unread" }).filter).toBe("ALL");
  });

  it("labels every filter", () => {
    expect(notificationFilterLabels).toEqual({
      ALL: "All",
      UNREAD: "Unread",
      READ: "Read",
    });
  });

  it("reports an active filter only when it is not ALL", () => {
    expect(hasActiveNotificationFilter({ filter: "ALL", page: 1 })).toBe(false);
    expect(hasActiveNotificationFilter({ filter: "UNREAD", page: 1 })).toBe(
      true,
    );
    expect(hasActiveNotificationFilter({ filter: "READ", page: 3 })).toBe(true);
  });
});

describe("notification page validation", () => {
  it("parses a valid positive page", () => {
    expect(parseNotificationSearch({ page: "5" }).page).toBe(5);
  });

  it("falls back to 1 for missing, zero, negative, or non-numeric pages", () => {
    expect(parseNotificationSearch({}).page).toBe(1);
    expect(parseNotificationSearch({ page: "0" }).page).toBe(1);
    expect(parseNotificationSearch({ page: "-4" }).page).toBe(1);
    expect(parseNotificationSearch({ page: "abc" }).page).toBe(1);
    expect(parseNotificationSearch({ page: "1.5" }).page).toBe(1);
  });

  it("rejects absurd page numbers above the ceiling", () => {
    expect(
      parseNotificationSearch({ page: String(NOTIFICATIONS_MAX_PAGE + 1) })
        .page,
    ).toBe(1);
    expect(parseNotificationSearch({ page: "999999999" }).page).toBe(1);
  });

  it("keeps the ceiling itself valid", () => {
    expect(
      parseNotificationSearch({ page: String(NOTIFICATIONS_MAX_PAGE) }).page,
    ).toBe(NOTIFICATIONS_MAX_PAGE);
  });
});

describe("notification id schema", () => {
  it("accepts a plausible id", () => {
    expect(notificationIdSchema.safeParse("ckxyz123").success).toBe(true);
  });

  it("rejects empty or oversized ids", () => {
    expect(notificationIdSchema.safeParse("").success).toBe(false);
    expect(notificationIdSchema.safeParse("x".repeat(65)).success).toBe(false);
    expect(notificationIdSchema.safeParse(123).success).toBe(false);
  });
});
