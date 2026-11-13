import { describe, expect, it } from "vitest";
import { pesos } from "@/shared/lib/money";
import { confirmedCountInPeriod, confirmedValueInPeriod, mySales, referredSales, snapshotCounts, teamSales } from "./rules";
import type { Sale } from "./types";

function sale(overrides: Partial<Sale> & Pick<Sale, "id">): Sale {
  return {
    contractId: `ctr-${overrides.id}`,
    customerId: "cus-1",
    productCode: "B1",
    branchId: "branch-a",
    valueCentavos: pesos(240000),
    recordedDate: "2026-10-01",
    sellerMemberId: "mem-ost-a1",
    team: [
      { memberId: "mem-ost-a1", displayName: "OST A1", designation: "OST" },
      { memberId: "mem-sm-a", displayName: "SM A", designation: "SM" },
    ],
    status: "pending",
    confirmedDate: null,
    adjustments: [],
    referrerMemberId: null,
    ...overrides,
  } as Sale;
}

describe("dashboard sales counts (13 section 3.1)", () => {
  const sales = [
    sale({ id: "s1", status: "confirmed", confirmedDate: "2026-11-02" }),
    sale({ id: "s2", status: "confirmed", confirmedDate: "2026-10-15" }),
    sale({ id: "s3", status: "pending" }),
    sale({ id: "s4", status: "pending" }),
    sale({ id: "s5", status: "cancelled", confirmedDate: "2026-11-03" }),
    sale({ id: "s6", status: "rejected" }),
  ];

  it("counts confirmed sales by Finance confirmation date inside the period", () => {
    expect(confirmedCountInPeriod(sales, "2026-11-01", "2026-11-10")).toBe(1);
    expect(confirmedCountInPeriod(sales, "2026-10-01", "2026-11-10")).toBe(2);
    expect(confirmedCountInPeriod(sales, "2026-09-01", "2026-09-30")).toBe(0);
  });

  it("keeps pending and overall counts as current snapshots, excluding cancelled and rejected", () => {
    expect(snapshotCounts(sales)).toEqual({ confirmed: 2, pending: 2, overall: 4 });
  });

  it("drops a reversed sale from the confirmed count but keeps its dated value history", () => {
    const reversed = sale({
      id: "r1",
      status: "pending",
      confirmedDate: "2026-10-20",
      adjustments: [
        { id: "a1", date: "2026-10-20", amountCentavos: pesos(240000), kind: "confirmation", reason: "", actorId: "f" },
        { id: "a2", date: "2026-11-04", amountCentavos: -pesos(240000), kind: "reversal", reason: "", actorId: "f" },
      ],
    });
    expect(confirmedCountInPeriod([reversed], "2026-10-01", "2026-11-10")).toBe(0);
    expect(snapshotCounts([reversed])).toEqual({ confirmed: 0, pending: 1, overall: 1 });
    expect(confirmedValueInPeriod([reversed], "2026-10-01", "2026-10-31")).toBe(pesos(240000));
    expect(confirmedValueInPeriod([reversed], "2026-11-01", "2026-11-30")).toBe(-pesos(240000));
  });

  it("never duplicates a reconfirmed sale", () => {
    const reconfirmed = sale({
      id: "c1",
      status: "confirmed",
      confirmedDate: "2026-11-06",
      adjustments: [
        { id: "a1", date: "2026-10-20", amountCentavos: pesos(240000), kind: "confirmation", reason: "", actorId: "f" },
        { id: "a2", date: "2026-11-04", amountCentavos: -pesos(240000), kind: "reversal", reason: "", actorId: "f" },
        { id: "a3", date: "2026-11-06", amountCentavos: pesos(240000), kind: "reconfirmation", reason: "", actorId: "f" },
      ],
    });
    expect(confirmedCountInPeriod([reconfirmed, reconfirmed], "2026-10-01", "2026-11-10")).toBe(1);
    expect(confirmedValueInPeriod([reconfirmed], "2026-10-01", "2026-11-10")).toBe(pesos(240000));
  });

  it("scopes My Sales to the seller and Team Sales to the recording-time team", () => {
    expect(mySales(sales, "mem-ost-a1")).toHaveLength(6);
    expect(mySales(sales, "mem-sm-a")).toHaveLength(0);
    expect(teamSales(sales, "mem-sm-a")).toHaveLength(6);
    expect(teamSales(sales, null)).toHaveLength(0);
  });
});

describe("Referred by me (13 section 4; owner ruling 2026-11-12, A8)", () => {
  const sales = [
    sale({ id: "r1", referrerMemberId: "mem-ost-b1" }),
    sale({ id: "r2", referrerMemberId: "mem-ost-a1" }),
    sale({ id: "r3" }),
  ];

  it("lists referred sales separately from My Sales and never twice", () => {
    expect(referredSales(sales, "mem-ost-b1").map((item) => item.id)).toEqual(["r1"]);
    expect(mySales(sales, "mem-ost-b1")).toHaveLength(0);
    // Seller = referrer: only in My Sales.
    expect(referredSales(sales, "mem-ost-a1")).toHaveLength(0);
    expect(mySales(sales, "mem-ost-a1")).toHaveLength(3);
    expect(referredSales(sales, null)).toEqual([]);
  });
});
