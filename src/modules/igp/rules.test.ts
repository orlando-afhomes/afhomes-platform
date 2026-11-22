import { describe, expect, it } from "vitest";
import { DEFAULT_IGP_GRANT_TIER_RULES } from "./types";
import { buildJadNumber, grantTierRulesProblem, igpGrantTier, defaultJadPrefix, formatIgpSeriesNumber, igpPriceBand, igpChecklist, igpMilestones, isValidJadNumber, jadNumberProblem } from "./rules";
import type { Payment } from "@/modules/finance/types";

describe("IGP numbering", () => {
  it("uses the reservation date, monthly sequence, ceiling price band, and terms", () => {
    expect(formatIgpSeriesNumber({ date: "2026-11-15", sequence: 1, priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S" })).toBe("A26111500012T12S");
    expect(formatIgpSeriesNumber({ date: "2026-11-20", sequence: 2, priceCentavos: 85_000_000, scheme: "C", termMonths: 1, clauses: "S" })).toBe("A26112000021C01S");
  });

  it("uses band 0 above 9,000,000 and keeps the number 16 characters", () => {
    const input = { date: "2026-11-20", sequence: 1, priceCentavos: 900_000_000, scheme: "C", termMonths: 1, clauses: "N" } as const;
    expect(igpPriceBand(input.priceCentavos)).toBe(9);
    expect(igpPriceBand(900_000_001)).toBe(0);
    const above = formatIgpSeriesNumber({ ...input, priceCentavos: 900_000_001 });
    expect(above).toBe("A26112000010C01N");
    expect(above).toHaveLength(16);
  });

  it("rejects an invalid price, impossible dates and overflowing sequences", () => {
    const input = { date: "2026-11-20", sequence: 1, priceCentavos: 900_000_000, scheme: "C", termMonths: 1, clauses: "N" } as const;
    expect(() => igpPriceBand(0)).toThrow(/valid property price/);
    expect(() => formatIgpSeriesNumber({ ...input, date: "2026-02-29" })).toThrow(/date/);
    expect(() => formatIgpSeriesNumber({ ...input, sequence: 10_000 })).toThrow(/sequence/);
  });
});

describe("IGP Formal VIP Grant card level", () => {
  const rules = DEFAULT_IGP_GRANT_TIER_RULES;
  it("picks Bronze from 1M, Silver from 2M and Gold from 4M, and none below 1M", () => {
    expect(igpGrantTier(99_999_999, rules)).toBeNull();
    expect(igpGrantTier(150_000_000, rules)).toBe("B1");
    expect(igpGrantTier(200_000_000, rules)).toBe("S1");
    expect(igpGrantTier(399_999_999, rules)).toBe("S1");
    expect(igpGrantTier(500_000_000, rules)).toBe("G1");
  });

  it("requires unique card levels with rising positive minimums", () => {
    expect(grantTierRulesProblem(rules)).toBeNull();
    expect(grantTierRulesProblem([])).toMatch(/at least one/);
    expect(grantTierRulesProblem([rules[0], rules[0]])).toMatch(/only once/);
    expect(grantTierRulesProblem([{ tier: "B1", minPriceCentavos: 0 }])).toMatch(/above zero/);
    expect(grantTierRulesProblem([rules[1], rules[0]])).toMatch(/higher minimum/);
  });
});

describe("JA&D accreditation number", () => {
  it("builds the number from the type, the approval date and the typed last four digits", () => {
    expect(buildJadNumber({ prefix: "JAI", approvedDate: "2026-11-15", sequence: "0001" })).toBe("JAI26110001");
    expect(buildJadNumber({ prefix: "JAO", approvedDate: "2023-01-01", sequence: "1234" })).toBe("JAO23011234");
    expect(() => buildJadNumber({ prefix: "JAI", approvedDate: "2026-11-15", sequence: "12" })).toThrow(/4 digits/);
    expect(() => buildJadNumber({ prefix: "JAI", approvedDate: "2026-11-15", sequence: "12a4" })).toThrow(/4 digits/);
    expect(() => buildJadNumber({ prefix: "", approvedDate: "2026-11-15", sequence: "0001" })).toThrow(/type/);
    expect(() => buildJadNumber({ prefix: "JAI", approvedDate: "2026-02-30", sequence: "0001" })).toThrow(/date/);
  });

  it("accepts only JAI or JAO plus YYMM that matches the approval date, with a sequence other than 0000", () => {
    expect(isValidJadNumber("JAI26110001", "2026-11-15")).toBe(true);
    expect(isValidJadNumber("JAI26110001", "2026-12-01")).toBe(false);
    expect(jadNumberProblem("JAI26110001", "2026-12-01")).toMatch(/match the approval date/);
    for (const bad of ["JAX26110001", "JAI2611001", "JAI26130001", "JAI26110000", "jai26110001"]) expect(isValidJadNumber(bad, "2026-11-15")).toBe(false);
  });

  it("starts the type from the seller designation", () => {
    expect(["SVD", "SSM", "SM"].map(defaultJadPrefix)).toEqual(["JAI", "JAI", "JAI"]);
    expect(defaultJadPrefix("OST")).toBe("JAO");
    expect(defaultJadPrefix(undefined)).toBe("");
  });
});

describe("IGP lifecycle", () => {
  it("skips documents that do not apply to cash or CTS entry", () => {
    expect(igpChecklist("C", "reservation").map(({ key }) => key)).toEqual(["reservation", "deed", "formal_grant", "lease", "spa"]);
    expect(igpChecklist("T", "cts").map(({ key }) => key)).toEqual(["cts", "goodwill_grant", "deed", "formal_grant", "lease", "spa"]);
  });

  it("counts only approved, net receipts and uses receipt dates in approval order", () => {
    const verified = (id: string, paidDate: string, amountCentavos: number): Payment => ({
      id, paidDate, amountCentavos, status: "verified", verifiedDate: "2026-11-21", adjustments: [],
    } as unknown as Payment);
    const payments = [
      verified("first", "2026-11-18", 10_000),
      { ...verified("pending", "2026-11-19", 100_000), status: "submitted" as const },
      verified("second", "2026-11-15", 30_000),
      { ...verified("third", "2026-11-20", 60_000), adjustments: [{ kind: "refund" as const, amountCentavos: 1 }] } as Payment,
    ];
    expect(igpMilestones(100_000, 1_000, payments)).toEqual({
      closedDealDate: "2026-11-18", stage1Date: "2026-11-18", fullPaymentDate: null,
    });
  });
});
