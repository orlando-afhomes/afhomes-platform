import { describe, expect, it } from "vitest";
import { compareKpi, formatChange, previousPeriod } from "./kpi-comparison";

describe("previousPeriod", () => {
  it("returns the preceding period of equal length", () => {
    expect(previousPeriod("2026-11-10", "2026-11-10")).toEqual({ from: "2026-11-09", to: "2026-11-09" });
    expect(previousPeriod("2026-10-13", "2026-11-10")).toEqual({ from: "2026-09-14", to: "2026-10-12" });
    expect(previousPeriod("2026-05-10", "2026-11-10")).toEqual({ from: "2025-11-06", to: "2026-05-09" });
  });

  it("crosses month and year boundaries on calendar days", () => {
    expect(previousPeriod("2026-03-01", "2026-03-07")).toEqual({ from: "2026-02-22", to: "2026-02-28" });
    expect(previousPeriod("2026-01-01", "2026-01-02")).toEqual({ from: "2025-12-30", to: "2025-12-31" });
  });

  it("rejects invalid ranges", () => {
    expect(previousPeriod("2026-11-10", "2026-11-01")).toBeNull();
    expect(previousPeriod("bad", "2026-11-01")).toBeNull();
  });
});

describe("compareKpi", () => {
  it("calculates a signed change against a positive baseline", () => {
    expect(compareKpi(1167, 1000)).toEqual({ kind: "change", percentTenths: 167, direction: "up" });
    expect(compareKpi(750, 1000)).toEqual({ kind: "change", percentTenths: -250, direction: "down" });
    expect(compareKpi(1000, 1000)).toEqual({ kind: "change", percentTenths: 0, direction: "flat" });
    expect(compareKpi(0, 1000)).toEqual({ kind: "change", percentTenths: -1000, direction: "down" });
  });

  it("never calculates a percentage without a valid baseline", () => {
    expect(compareKpi(31_200_000, 0)).toEqual({ kind: "new" });
    expect(compareKpi(0, 0)).toEqual({ kind: "none" });
    // A negative baseline (net reversals) is not a valid baseline.
    expect(compareKpi(5000, -2000)).toEqual({ kind: "new" });
    expect(compareKpi(-100, -2000)).toEqual({ kind: "none" });
  });

  it("formats the change for display", () => {
    expect(formatChange(167)).toBe("+16.7%");
    expect(formatChange(-250)).toBe("-25%");
    expect(formatChange(0)).toBe("0%");
    expect(formatChange(11950)).toBe("+1,195%");
  });
});
