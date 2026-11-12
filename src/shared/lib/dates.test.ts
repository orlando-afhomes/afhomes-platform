import { describe, expect, it } from "vitest";
import { manilaDateOf, startOfNextMonthDate } from "./dates";

describe("manilaDateOf", () => {
  it("keeps a date-only value", () => {
    expect(manilaDateOf("2026-11-09")).toBe("2026-11-09");
  });

  it("moves a late-evening UTC timestamp to the next Manila day", () => {
    expect(manilaDateOf("2026-11-09T23:30:00.000Z")).toBe("2026-11-10");
    expect(manilaDateOf("2026-11-09T15:59:59.000Z")).toBe("2026-11-09");
  });
});

describe("startOfNextMonthDate", () => {
  it.each([
    ["2026-11-20", "2026-12-01"],
    ["2026-11-01", "2026-12-01"],
    ["2026-11-30", "2026-12-01"],
    ["2026-12-31", "2027-01-01"],
    ["2028-02-29", "2028-03-01"],
  ])("moves %s to %s", (input, expected) => {
    expect(startOfNextMonthDate(input)).toBe(expected);
  });

  it("returns null for an invalid date", () => {
    expect(startOfNextMonthDate("2026-13-01")).toBeNull();
    expect(startOfNextMonthDate("not a date")).toBeNull();
  });
});
