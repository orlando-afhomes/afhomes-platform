import { describe, expect, it } from "vitest";
import { computePointsLedger, createStayPointsState } from "./engine";
import type { PointsTerms, ResortSpend } from "./types";

const terms: PointsTerms = {
  membershipId: "member",
  vipNumber: "VIP-1",
  fullSettlementDate: "2025-01-01",
  claimDate: "2025-06-01",
  validityEndDate: "2032-06-01",
  financialHold: false,
  mayRelease: true,
  benefits: {
    earningCycles: 5, minSpendPerCycleCentavos: 100_000,
    weekdayPointsPerCycle: 7_000, weekendPointsPerCycle: 3_000,
  },
};

function bill(id: string, date: string, amountCentavos: number): ResortSpend {
  return { id, membershipId: "member", date, amountCentavos, description: "", status: "verified", verificationRef: id };
}

describe("Annual Welcome Gift", () => {
  it("caps the first measurement window at 24 months and releases one fixed tranche on the deemed PAD", () => {
    const ledger = computePointsLedger(terms, [
      bill("a", "2027-01-01", 125_050),
      bill("b", "2027-02-01", 500_000),
      bill("c", "2027-06-01", 500_000),
    ], createStayPointsState(), "2027-06-01");

    expect(ledger.padDate).toBe("2027-06-01");
    expect(ledger.tranches).toHaveLength(5);
    expect(ledger.tranches[0]).toMatchObject({ dueDate: "2027-06-01", endDate: "2027-01-01", qualifyingCentavos: 125_050, status: "released" });
    expect(ledger.tranches[1].qualifyingCentavos).toBe(0);
    expect(ledger.balances).toMatchObject({ spendableWeekday: 7_000, spendableWeekend: 3_000 });
  });

  it("delays held tranches and keeps a previously released tranche after a refund", () => {
    const state = createStayPointsState();
    const spends = [bill("a", "2025-11-01", 100_000)];
    expect(computePointsLedger({ ...terms, financialHold: true }, spends, state, "2027-06-01").tranches[0].status).toBe("unreleased");
    expect(computePointsLedger({ ...terms, restoredFromHoldOn: "2027-06-02" }, spends, state, "2027-06-02").tranches[0].releaseDate).toBe("2027-06-02");

    state.refunds.push({ id: "r", spendId: "a", date: "2027-06-03", amountCentavos: 100_000, reason: "Returned", actorId: "finance" });
    const result = computePointsLedger(terms, spends, state, "2027-06-03");
    expect(result.tranches[0]).toMatchObject({ qualifyingCentavos: 0, releaseDate: "2027-06-02", status: "released" });
    expect(state.ledger.filter((entry) => entry.type === "release")).toHaveLength(2);
  });

  it("uses the approval business date for a late qualifying bill and never counts anniversary-day spend twice", () => {
    const spends = [
      { ...bill("late", "2027-01-01", 100_000), approvedDate: "2027-06-03" },
      bill("anniversary", "2028-06-01", 100_000),
    ];
    const ledger = computePointsLedger(terms, spends, createStayPointsState(), "2028-06-02");
    expect(ledger.tranches.slice(0, 3).map((item) => [item.qualifyingCentavos, item.releaseDate])).toEqual([
      [100_000, "2027-06-03"], [100_000, "2028-06-01"], [0, null],
    ]);
  });

  it("keeps a waived tranche closed until the next administrative cycle, then appends both buckets once", () => {
    const state = createStayPointsState();
    state.waivers.push({
      id: "w1", membershipId: "member", tranche: 1, date: "2027-06-05",
      ground: "Hospitalization or serious illness", supportingReference: "DOC-1", requestedBy: "admin",
      decision: { granted: true, actorId: "admin", date: "2027-06-08", reason: "Approved evidence.", releaseDate: "2027-07-01" },
    });
    expect(computePointsLedger(terms, [], state, "2027-06-30").balances.released).toBe(0);
    expect(computePointsLedger(terms, [], state, "2027-07-03").tranches[0]).toMatchObject({ status: "released_by_waiver", releaseDate: "2027-07-01" });
    computePointsLedger(terms, [], state, "2027-07-05");
    expect(state.ledger).toHaveLength(2);
    expect(state.ledger.every((entry) => entry.reference === "DOC-1" && entry.actorId === "admin")).toBe(true);
  });

  it("forfeits unused points at expiry and never recreates them", () => {
    const state = createStayPointsState();
    const spends = [bill("a", "2025-11-01", 100_000)];
    computePointsLedger(terms, spends, state, "2027-06-01");
    const result = computePointsLedger(terms, spends, state, "2032-06-01");
    expect(result.balances).toMatchObject({ spendableWeekday: 0, spendableWeekend: 0, forfeited: 10_000 });
    expect(result.tranches[1].status).toBe("forfeited");
    computePointsLedger(terms, spends, state, "2032-06-02");
    expect(state.ledger.filter((entry) => entry.type === "expiry")).toHaveLength(2);
  });
});
