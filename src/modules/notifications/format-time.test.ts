import { describe, expect, it } from "vitest";
import { formatNotificationTime } from "./format-time";

const NOW = new Date("2026-11-13T12:00:00+08:00");

describe("formatNotificationTime", () => {
  it("says just now within the first minute", () => {
    expect(formatNotificationTime("2026-11-13T11:59:30+08:00", NOW)).toBe("just now");
    expect(formatNotificationTime("2026-11-13T12:00:00+08:00", NOW)).toBe("just now");
  });

  it("treats a future timestamp as just now instead of a negative span", () => {
    expect(formatNotificationTime("2026-11-13T12:05:00+08:00", NOW)).toBe("just now");
  });

  it("counts minutes under an hour", () => {
    expect(formatNotificationTime("2026-11-13T11:55:00+08:00", NOW)).toBe("5 min ago");
    expect(formatNotificationTime("2026-11-13T11:01:00+08:00", NOW)).toBe("59 min ago");
  });

  it("counts hours under a day", () => {
    expect(formatNotificationTime("2026-11-13T09:00:00+08:00", NOW)).toBe("3 hr ago");
    expect(formatNotificationTime("2026-11-12T13:00:00+08:00", NOW)).toBe("23 hr ago");
  });

  it("says Yesterday for the previous day", () => {
    expect(formatNotificationTime("2026-11-12T11:00:00+08:00", NOW)).toBe("Yesterday");
  });

  it("falls back to the shared date display for older events", () => {
    expect(formatNotificationTime("2026-11-07T12:00:00+08:00", NOW)).toBe("Nov 7, 2026");
    expect(formatNotificationTime("2025-12-30T12:00:00+08:00", NOW)).toBe("Dec 30, 2025");
  });

  it("never returns a raw ISO string for unparseable input", () => {
    expect(formatNotificationTime("not-a-date", NOW)).toBe("—");
    expect(formatNotificationTime("not-a-date", NOW)).not.toContain("not-a-date");
  });
});
