import { describe, expect, it } from "vitest";
import type { CommissionView } from "@/data/contracts/commission-repository";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { MembershipView } from "@/data/contracts/membership-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import { periodCollections } from "@/modules/finance/rules";
import { pesos } from "@/shared/lib/money";
import {
  buildActivityFeed,
  commissionPayoutSummary,
  confirmedSalesTierDistribution,
  contractTierDistribution,
  countCancellationRequests,
  countCustomerDrafts,
  countFinancialHolds,
  countPendingContractReviews,
  countPendingMembershipActivations,
  countPendingPaymentVerifications,
  countReturnedContracts,
  countUplines,
  countVisibleContracts,
  countVisibleCustomers,
  countVisibleMembers,
  dailyCollections,
  dailyConfirmedSales,
  dateSpan,
  receivablesBreakdown,
  teamContributions,
} from "./dashboard-metrics";

describe("dashboard metrics", () => {
  it("counts visible members, customers and uplines", () => {
    expect(countVisibleMembers([{ id: "a" }, { id: "b" }])).toBe(2);
    expect(countVisibleMembers([])).toBe(0);
    expect(countVisibleCustomers([{ id: "a" }])).toBe(1);
    expect(countUplines([{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(3);
  });

  it("counts contracts and excludes cancelled ones", () => {
    const contracts = [{ status: "draft" }, { status: "submitted" }, { status: "finalized" }, { status: "cancelled" }] as Array<
      Pick<ContractView, "status">
    >;
    expect(countVisibleContracts(contracts)).toBe(3);
    expect(countVisibleContracts([])).toBe(0);
  });

  it("distributes contracts across the three active VIP tiers", () => {
    const contracts = [
      { productCode: "B1", status: "finalized" },
      { productCode: "B1", status: "submitted" },
      { productCode: "S1", status: "under_review" },
      { productCode: "G1", status: "draft" },
      { productCode: "G1", status: "cancelled" },
    ] as Array<Pick<ContractView, "productCode" | "status">>;
    const { total, rows } = contractTierDistribution(contracts);
    expect(total).toBe(4);
    expect(rows.map((row) => [row.code, row.label, row.count])).toEqual([
      ["B1", "Bronze", 2],
      ["S1", "Silver", 1],
      ["G1", "Gold", 1],
    ]);
    expect(rows.map((row) => row.share)).toEqual([50, 25, 25]);
    expect(contractTierDistribution([]).rows.every((row) => row.count === 0 && row.share === 0)).toBe(true);
  });

  it("distributes only currently confirmed sales", () => {
    const sales = [
      { productCode: "G1", status: "confirmed" },
      { productCode: "B1", status: "confirmed" },
      { productCode: "B1", status: "pending" },
      { productCode: "S1", status: "cancelled" },
    ] as Array<Pick<SaleView, "productCode" | "status">>;
    const { total, rows } = confirmedSalesTierDistribution(sales);
    expect(total).toBe(2);
    expect(rows.map((row) => row.count)).toEqual([1, 0, 1]);
  });

  it("counts the review, verification, activation, cancellation, hold and seller queues", () => {
    expect(
      countPendingContractReviews([{ status: "submitted" }, { status: "under_review" }, { status: "finalized" }] as Array<
        Pick<ContractView, "status">
      >),
    ).toBe(2);
    expect(
      countPendingPaymentVerifications([{ status: "submitted" }, { status: "under_review" }, { status: "verified" }] as Array<
        Pick<PaymentView, "status">
      >),
    ).toBe(2);
    expect(
      countPendingMembershipActivations([{ status: "pending" }, { status: "active" }] as Array<Pick<MembershipView, "status">>),
    ).toBe(1);
    expect(
      countCancellationRequests([
        { cancellation: { status: "requested" } },
        { cancellation: { status: "confirmed" } },
        { cancellation: null },
        {},
      ] as Array<Pick<ContractView, "cancellation">>),
    ).toBe(1);
    expect(countFinancialHolds([{ financialHold: true }, { financialHold: false }])).toBe(1);
    expect(countReturnedContracts([{ status: "returned" }, { status: "draft" }] as Array<Pick<ContractView, "status">>)).toBe(1);
    expect(countCustomerDrafts([{ status: "draft" }, { status: "submitted" }])).toBe(1);
  });

  it("separates approved-unpaid commissions into ready and awaiting confirmation", () => {
    const payout = { reference: "R", method: null, payoutDate: "2026-11-05", processedBy: "f", initiatedAt: "2026-11-05" };
    const commissions = [
      { status: "approved", amountCentavos: pesos(1000), payout: null, payoutReleaseDate: "2026-11-01" },
      { status: "approved", amountCentavos: pesos(2000), payout: null, payoutReleaseDate: "2026-11-20" },
      { status: "approved", amountCentavos: pesos(3000), payout: null, payoutReleaseDate: null },
      { status: "approved", amountCentavos: pesos(4000), payout: { ...payout, confirmedAt: null }, payoutReleaseDate: "2026-11-01" },
      { status: "paid", amountCentavos: pesos(5000), payout: { ...payout, confirmedAt: "2026-11-06" }, payoutReleaseDate: "2026-11-01" },
      { status: "on_hold", amountCentavos: pesos(6000), payout: null, payoutReleaseDate: "2026-11-01" },
    ] as Array<Pick<CommissionView, "status" | "amountCentavos" | "payout" | "payoutReleaseDate">>;
    expect(commissionPayoutSummary(commissions, "2026-11-10")).toEqual({
      approvedUnpaidCentavos: pesos(10000),
      approvedCount: 4,
      ready: 1,
      awaitingConfirmation: 1,
    });
  });

  it("builds Asia/Manila day spans and rejects invalid ranges", () => {
    expect(dateSpan("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(dateSpan("2026-11-03", "2026-11-01")).toEqual([]);
    expect(dateSpan("bad", "2026-11-01")).toEqual([]);
  });

  it("dates confirmed sales by their signed adjustments", () => {
    const sales = [
      {
        adjustments: [
          { date: "2026-11-02", amountCentavos: pesos(240000) },
          { date: "2026-11-03", amountCentavos: -pesos(240000) },
          { date: "2026-10-30", amountCentavos: pesos(72000) },
        ],
      },
    ] as unknown as Array<Pick<SaleView, "adjustments">>;
    expect(dailyConfirmedSales(sales, dateSpan("2026-11-01", "2026-11-03"))).toEqual([0, pesos(240000), -pesos(240000)]);
  });

  it("keeps gross collections, reversals and refunds, and net on their own event dates", () => {
    const payments = [
      { verifiedDate: "2026-11-02", amountCentavos: pesos(57500), adjustments: [{ date: "2026-11-03", amountCentavos: pesos(7500) }] },
      { verifiedDate: null, amountCentavos: pesos(10000), adjustments: [] },
      { verifiedDate: "2026-10-31", amountCentavos: pesos(15500), adjustments: [{ date: "2026-11-01", amountCentavos: pesos(15500) }] },
    ] as unknown as PaymentView[];
    const dates = dateSpan("2026-11-01", "2026-11-03");
    const daily = dailyCollections(payments, dates);
    expect(daily.gross).toEqual([0, pesos(57500), 0]);
    expect(daily.adjustments).toEqual([pesos(15500), 0, pesos(7500)]);
    expect(daily.net).toEqual([-pesos(15500), pesos(57500), -pesos(7500)]);

    const period = periodCollections(payments, "2026-11-01", "2026-11-03");
    const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
    expect([sum(daily.gross), sum(daily.adjustments), sum(daily.net)]).toEqual([period.gross, period.adjusted, period.net]);
  });

  it("splits finalized receivables into settled, outstanding and overdue", () => {
    const contract = (id: string, status: string, dueDate: string) =>
      ({
        id,
        status,
        priceCentavos: pesos(100000),
        schedule: [
          { seq: 1, label: "Down payment", purpose: "down_payment", amountCentavos: pesos(50000), dueDate: "2026-10-01" },
          { seq: 2, label: "Balance", purpose: "installment", amountCentavos: pesos(50000), dueDate },
        ],
      }) as unknown as ContractView;
    const verified = (contractId: string, amount: number) =>
      ({ id: `pay-${contractId}-${amount}`, contractId, status: "verified", purpose: "installment", amountCentavos: pesos(amount), verifiedDate: "2026-10-01", verifiedAt: "2026-10-01", paidDate: "2026-10-01", adjustments: [] }) as unknown as PaymentView;

    const breakdown = receivablesBreakdown(
      [contract("c1", "finalized", "2026-12-01"), contract("c2", "finalized", "2026-11-01"), contract("c3", "finalized", "2026-11-01"), contract("c4", "submitted", "2026-11-01")],
      [verified("c1", 50000), verified("c2", 50000), verified("c3", 100000)],
      "2026-11-10",
    );
    expect(breakdown.contractCount).toBe(3);
    expect(breakdown.rows).toEqual([
      { state: "settled", count: 1, balanceCentavos: 0 },
      { state: "outstanding", count: 1, balanceCentavos: pesos(50000) },
      { state: "overdue", count: 1, balanceCentavos: pesos(50000) },
    ]);
    expect(breakdown.outstandingCentavos).toBe(pesos(100000));
    expect(breakdown.overdueCentavos).toBe(pesos(50000));
  });

  it("credits direct downline contributions by the recording-time team", () => {
    const team = (...ids: string[]) => ids.map((memberId) => ({ memberId, displayName: memberId, designation: "" }));
    const sale = (id: string, ids: string[], amount: number) =>
      ({ id, team: team(...ids), adjustments: [{ date: "2026-11-05", amountCentavos: pesos(amount) }] }) as unknown as SaleView;
    const members = [
      { id: "mgr", displayName: "Manager", designation: "SM", parentId: null },
      { id: "ost-1", displayName: "Ana", designation: "OST", parentId: "mgr" },
      { id: "ost-2", displayName: "Ben", designation: "OST", parentId: "mgr" },
    ] as const;
    const sales = [
      sale("s1", ["ost-1", "mgr"], 100000),
      sale("s2", ["ost-2", "mgr"], 240000),
      // ost-1 moved teams later; this older sale stays credited to the team recorded on it.
      sale("s3", ["ost-1", "other-mgr"], 72000),
      sale("s4", ["mgr"], 50000),
    ];
    expect(teamContributions(members, "mgr", sales, "2026-11-01", "2026-11-10").map((row) => [row.member.id, row.confirmedCentavos])).toEqual([
      ["ost-2", pesos(240000)],
      ["ost-1", pesos(172000)],
    ]);
    expect(teamContributions(members, null, sales, "2026-11-01", "2026-11-10")).toEqual([]);
  });

  it("builds recent activity across record kinds, newest first, with an optional filter", () => {
    const sources = {
      customers: [{ displayName: "Ida Cruz", submittedAt: "2026-11-07T09:00:00+08:00" }, { displayName: "Open draft", submittedAt: null }],
      contracts: [
        {
          customerName: "Rafael Domingo",
          history: [
            { at: "2026-11-04", actorId: "a", event: "CONTRACT_SUBMITTED", note: null },
            { at: "2026-11-05", actorId: "a", event: "CONTRACT_FINALIZED", note: null },
          ],
        },
      ],
      sales: [{ customerName: "Rafael Domingo", adjustments: [{ id: "adj-1", date: "2026-11-05", amountCentavos: 1, kind: "confirmation", reason: "Collection reached", actorId: "a" }] }],
      payments: [{ customerName: "Tina Reyes", history: [{ at: "2026-11-06T10:00:00+08:00", actorId: "a", event: "PAYMENT_SUBMITTED", note: null }] }],
      memberships: [{ customerName: "Marco Santos", history: [{ at: "2026-11-03", actorId: "a", event: "MEMBERSHIP_ACTIVATED", note: null }] }],
      commissions: [
        {
          customerName: "Elena Bautista",
          history: [
            { at: "2026-11-08T10:00:00+08:00", actorId: "f", event: "COMMISSION_PAYOUT_RECORDED", note: null },
            { at: "2026-11-09T10:00:00+08:00", actorId: "f", event: "COMMISSION_PAID", note: null },
          ],
        },
      ],
    } satisfies Parameters<typeof buildActivityFeed>[0];

    expect(buildActivityFeed(sources, 4).map((item) => [item.label, item.reference])).toEqual([
      ["Commission payout confirmed", "Elena Bautista"],
      ["Payout recorded, not confirmed", "Elena Bautista"],
      ["Customer submitted", "Ida Cruz"],
      ["Payment submitted", "Tina Reyes"],
    ]);
    expect(buildActivityFeed(sources, 10, (item) => item.kind === "sale" || item.kind === "contract").map((item) => item.label)).toEqual([
      "Contract finalized",
      "Sale confirmed",
      "Contract submitted",
    ]);
  });
});
