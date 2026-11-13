import { describe, expect, it } from "vitest";
import type { PointsTableVersion, RedemptionVenue } from "./types";
import {
  cancellationOutcome,
  checkMembershipEligibility,
  classifyNight,
  evaluateFirstRedemption,
  nightsOfStay,
  priceStay,
  selectTableVersion,
} from "./rules";

const venue: RedemptionVenue = { id: "v1", name: "Hotel", status: "open", cutoffHours: 48, checkInTime: "14:00", sample: true };
const version = (id: string, n: number, effectiveDate: string): PointsTableVersion => ({
  id, version: n, effectiveDate, weekendDays: [5, 6], note: null, sample: true, createdAt: "", createdBy: "x",
  rows: [{ venueId: "v1", roomType: "Standard", weekdayPoints: 100, weekendPoints: 150 }],
});
const stay = (cashNightDates: string[], roomType = "Standard") => ({
  version: version("a", 1, "2026-01-01"), venueId: "v1", roomType, checkIn: "2026-11-12", checkOut: "2026-11-14", holidays: new Set<string>(), cashNightDates,
});

describe("night classification", () => {
  it("scenario A: the stay date, not the booking date, picks the bucket (2026-11-14 is a Saturday)", () => {
    expect(classifyNight("2026-11-14", [5, 6], new Set())).toBe("weekend");
  });
  it("scenario C: a listed holiday on a Tuesday is a holiday night in the weekend bucket", () => {
    expect(classifyNight("2026-11-17", [5, 6], new Set(["2026-11-17"]))).toBe("holiday");
  });
  it("lists nights from check-in to the day before departure", () => {
    expect(nightsOfStay("2026-11-12", "2026-11-15")).toEqual(["2026-11-12", "2026-11-13", "2026-11-14"]);
    expect(nightsOfStay("2026-11-12", "2026-11-12")).toEqual([]);
  });
});

describe("version selection (scenario E)", () => {
  const versions = [version("a", 1, "2028-01-01"), version("b", 2, "2029-01-01")];
  it("keeps the version in effect on the Card Claim Date", () => {
    expect(selectTableVersion(versions, "2028-05-01")?.id).toBe("a");
    expect(selectTableVersion(versions, "2029-01-01")?.id).toBe("b");
    expect(selectTableVersion(versions, "2027-12-31")).toBeNull();
  });
});

describe("pricing a stay (scenario B, A1)", () => {
  it("draws each night from its own bucket", () => {
    const r = priceStay(stay([]));
    expect(r.weekdayPoints).toBe(100);
    expect(r.weekendPoints).toBe(150);
    expect(r.nights.map((n) => n.reason)).toEqual(["weekday", "weekend"]);
  });
  it("pays chosen whole nights in cash with zero points for them", () => {
    const r = priceStay(stay(["2026-11-13"]));
    expect(r.weekendPoints).toBe(0);
    expect(r.cashNights).toBe(1);
  });
  it("rejects a cash night outside the stay and an unknown room type", () => {
    expect(() => priceStay(stay(["2026-12-01"]))).toThrow(/stay/i);
    expect(() => priceStay(stay([], "Suite"))).toThrow(/room type/i);
  });
});

describe("cancellation cut-off (H, I2)", () => {
  it("returns points when cancelled by the cut-off and forfeits after it", () => {
    // check-in 2026-11-20 14:00 +08:00 minus 48h = 2026-11-18 14:00 +08:00 = 06:00Z
    expect(cancellationOutcome(venue, "2026-11-20", "2026-11-18T05:59:00.000Z")).toBe("return");
    expect(cancellationOutcome(venue, "2026-11-20", "2026-11-18T06:00:00.000Z")).toBe("return");
    expect(cancellationOutcome(venue, "2026-11-20", "2026-11-18T06:01:00.000Z")).toBe("forfeit");
  });
});

describe("membership eligibility (G, M)", () => {
  const base = { status: "active" as const, financialHold: false, activationDate: "2026-11-02", validityEndDate: "2036-11-02", cardId: "123" };
  it("accepts an active, claimed, hold-free card within validity", () => {
    expect(checkMembershipEligibility(base, "2026-11-20", "2026-11-22")).toEqual([]);
  });
  it("blocks inactive, held, unclaimed and expired cards", () => {
    expect(checkMembershipEligibility({ ...base, status: "suspended" }, "2026-11-20", "2026-11-22")).not.toEqual([]);
    expect(checkMembershipEligibility({ ...base, financialHold: true }, "2026-11-20", "2026-11-22")).not.toEqual([]);
    expect(checkMembershipEligibility({ ...base, cardId: null }, "2026-11-20", "2026-11-22")).not.toEqual([]);
    expect(checkMembershipEligibility(base, "2036-11-01", "2036-11-04")).not.toEqual([]);
  });
});

describe("first redemption and Year 1 condition (J, J2, A7b)", () => {
  it("needs no check once the PAD is set", () => {
    expect(evaluateFirstRedemption({ padSet: true, claimDate: "2026-11-02", checkIn: "2027-01-01", yearOneConditionMet: false })).toEqual({ ok: true, setsPad: false });
  });
  it("sets the PAD before the second anniversary when the condition is met", () => {
    expect(evaluateFirstRedemption({ padSet: false, claimDate: "2026-11-02", checkIn: "2027-01-01", yearOneConditionMet: true })).toEqual({ ok: true, setsPad: true });
  });
  it("refuses when the Year 1 condition is unmet: tranche 1 is not released", () => {
    expect(evaluateFirstRedemption({ padSet: false, claimDate: "2026-11-02", checkIn: "2027-01-01", yearOneConditionMet: false }).ok).toBe(false);
  });
  it("does not set the PAD on or after the second anniversary", () => {
    expect(evaluateFirstRedemption({ padSet: false, claimDate: "2026-11-02", checkIn: "2028-11-02", yearOneConditionMet: true }).setsPad).toBe(false);
  });
});
