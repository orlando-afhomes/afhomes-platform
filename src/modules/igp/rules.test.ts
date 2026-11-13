import { describe, expect, it } from "vitest";
import { formatIgpSeriesNumber, igpPriceBand, igpChecklist, igpMilestones } from "./rules";
import type { Payment } from "@/modules/finance/types";

describe("IGP numbering", () => {
  it("uses the reservation date, monthly sequence, ceiling price band, and terms", () => {
    expect(formatIgpSeriesNumber({ date: "2026-11-15", sequence: 1, priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S" })).toBe("A26111500012T12S");
    expect(formatIgpSeriesNumber({ date: "2026-11-20", sequence: 2, priceCentavos: 85_000_000, scheme: "C", termMonths: 1, clauses: "S" })).toBe("A26112000021C01S");
  });

  it("rejects prices outside the supported band, impossible dates and overflowing sequences", () => {
    const input = { date: "2026-11-20", sequence: 1, priceCentavos: 900_000_000, scheme: "C", termMonths: 1, clauses: "N" } as const;
    expect(igpPriceBand(input.priceCentavos)).toBe(9);
    expect(() => formatIgpSeriesNumber({ ...input, priceCentavos: 900_000_001 })).toThrow(/₱9,000,000/);
    expect(() => formatIgpSeriesNumber({ ...input, date: "2026-02-29" })).toThrow(/date/);
    expect(() => formatIgpSeriesNumber({ ...input, sequence: 10_000 })).toThrow(/sequence/);
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
