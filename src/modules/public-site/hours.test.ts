import { describe, expect, it } from "vitest";
import { isSiteOpenAt, SITE_HOURS } from "./hours";

describe("isSiteOpenAt", () => {
  it("uses Asia/Manila time, not UTC", () => {
    expect(SITE_HOURS.timeZone).toBe("Asia/Manila");
    // 00:59 UTC is 08:59 in Manila: still closed.
    expect(isSiteOpenAt(new Date("2026-11-18T00:59:00Z"))).toBe(false);
  });

  it("opens at 9:00 AM Manila time", () => {
    expect(isSiteOpenAt(new Date("2026-11-18T01:00:00Z"))).toBe(true);
  });

  it("stays open until 4:59 PM Manila time", () => {
    expect(isSiteOpenAt(new Date("2026-11-18T08:59:00Z"))).toBe(true);
    expect(isSiteOpenAt(new Date("2026-11-18T08:59:59Z"))).toBe(true);
  });

  it("closes at 5:00 PM Manila time", () => {
    expect(isSiteOpenAt(new Date("2026-11-18T09:00:00Z"))).toBe(false);
    expect(isSiteOpenAt(new Date("2026-11-18T15:59:00Z"))).toBe(false);
  });

  it("is open every day of the week", () => {
    // 2026-11-15 is a Sunday; 09:30 in Manila.
    expect(isSiteOpenAt(new Date("2026-11-15T01:30:00Z"))).toBe(true);
  });
});
