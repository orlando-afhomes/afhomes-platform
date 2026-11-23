import { describe, expect, it } from "vitest";
import { checkMonthSwitchReady } from "./switch-signoff";
import type { AllowanceReview } from "@/modules/commissions/allowances";
import type { ReconciliationEntry, SourceTotal } from "@/modules/reconciliation/rules";

const totals: SourceTotal[] = (["verified_receipts", "imported_receipts", "sales_value", "commissions_payable", "commissions_paid"] as const)
  .map((measure) => ({ measure, totalCentavos: 1_000_000, records: [] }));

const entry = (measure: ReconciliationEntry["measure"], decision: ReconciliationEntry["decision"], reason: string | null = null): ReconciliationEntry => ({
  id: `rec-${measure}`, period: "2026-09", measure, workbookCentavos: 1_000_000, liveCentavos: 1_000_000,
  differenceCentavos: 0, decision, reason, actorId: "dev-admin", recordedAt: "2026-10-01T00:00:00.000Z",
});

const review = (memberId: string, workbook: AllowanceReview["workbook"], workbookDifferenceReason?: string): AllowanceReview =>
  ({
    id: `rev-${memberId}`, month: "2026-09", memberId, memberName: memberId, position: "SM",
    result: { baCentavos: 1_500_000, paCentavos: 0, pbCentavos: 0 },
    qualifying: { days: 30, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 },
    extended: { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 },
    withholdingReason: "", withholdBa: false, workbook, workbookDifferenceReason,
    reviewedAt: "2026-09-30T00:00:00.000Z", reviewedBy: "dev-admin",
  } as unknown as AllowanceReview);

const members = [
  { id: "sm", displayName: "SM One", designation: "SM" as const },
  { id: "ost", displayName: "OST One", designation: "OST" as const },
];

function input(overrides: Partial<Parameters<typeof checkMonthSwitchReady>[0]> = {}) {
  return {
    totals, month: "2026-09", vacancies: [],
    entries: totals.map((item) => entry(item.measure, "signed_off")),
    reviews: [review("sm", { baCentavos: 1_500_000, paCentavos: 0, pbCentavos: 0 })],
    members,
    ...overrides,
  };
}

describe("parallel-run switch readiness (doc 08 section 16, doc 11 section 26)", () => {
  it("is ready when every measure matches and the leader review carries matching spreadsheet figures", () => {
    expect(checkMonthSwitchReady(input())).toEqual([]);
  });

  it("lists unchecked and stale measures as unexplained but accepts an explained difference", () => {
    const explained = entry("sales_value", "explained_variance", "Company spreadsheet missed one transfer.");
    const unexplained = checkMonthSwitchReady(input({ entries: [explained] }));
    expect(unexplained).toContain("No company-spreadsheet check for Verified receipts (net).");
    expect(unexplained).not.toContain("No company-spreadsheet check for Confirmed sales value (net).");
    const stale = checkMonthSwitchReady(input({
      totals: totals.map((item) => (item.measure === "verified_receipts" ? { ...item, totalCentavos: 2_000_000 } : item)),
      entries: totals.map((item) => entry(item.measure, "signed_off")),
    }));
    expect(stale).toContain("Verified receipts (net) changed since the check. Record it again.");
  });

  it("lists leaders with no review, no spreadsheet figures, or an unexplained allowance difference", () => {
    expect(checkMonthSwitchReady(input({ reviews: [] }))).toContain("No allowance review for SM One.");
    expect(checkMonthSwitchReady(input({ reviews: [review("sm", null)] })))
      .toContain("No company-spreadsheet figures for SM One.");
    expect(checkMonthSwitchReady(input({
      reviews: [review("sm", { baCentavos: 1_000_000, paCentavos: 0, pbCentavos: 0 })],
    }))).toContain("Unexplained allowance difference for SM One.");
    // The same difference with a reason, and OST members, never block.
    expect(checkMonthSwitchReady(input({
      reviews: [review("sm", { baCentavos: 1_000_000, paCentavos: 0, pbCentavos: 0 }, "Workbook used the draft rate.")],
    }))).toEqual([]);
  });

  it("skips a seat vacant the whole month", () => {
    const vacant = checkMonthSwitchReady(input({
      reviews: [],
      vacancies: [{ id: "v1", seatMemberId: "sm", holderEndDate: "2026-08-31", startDate: "2026-09-01", filledOn: null, filledMethod: null, filledByMemberId: null, recordedBy: "dev-admin", recordedAt: "2026-09-01" }],
    }));
    expect(vacant).not.toContain("No allowance review for SM One.");
  });
});
