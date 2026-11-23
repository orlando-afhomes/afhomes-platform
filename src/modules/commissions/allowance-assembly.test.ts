import { describe, expect, it } from "vitest";
import { assembleAllowanceInputs, type AllowanceAssemblyData } from "./allowance-assembly";
import type { Payment } from "@/modules/finance/types";
import type { IgpSale } from "@/modules/igp/types";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";

const member = (id: string, designation: OrgMember["designation"], parentId: string | null, displayName = id): OrgMember =>
  ({ id, displayName, designation, branchId: "b1", parentId, status: "active" }) as OrgMember;

const payment = (id: string, contractId: string, paidDate: string, amountCentavos: number): Payment =>
  ({ id, contractId, paidDate, amountCentavos, status: "verified", verifiedDate: paidDate, adjustments: [] } as unknown as Payment);

const sale = (id: string, contractId: string, sellerMemberId: string | null, referrerMemberId: string | null, valueCentavos: number): Sale =>
  ({
    id, contractId, customerId: "cust-1", productCode: "B1", branchId: "b1", valueCentavos,
    recordedDate: "2026-09-05", approval: null, sellerMemberId, referrerMemberId, team: [],
    status: "confirmed", confirmedDate: "2026-09-10", adjustments: [],
  } as unknown as Sale);

const igpSale = (id: string, sellerMemberId: string, closedDealDate: string | null, priceCentavos: number): IgpSale =>
  ({
    id, sellerMemberId, referrerMemberId: null, priceCentavos, closedDealDate, status: "approved",
    thresholdBp: 1_000, scheme: "C", termMonths: 12,
  } as unknown as IgpSale);

function data(overrides: Partial<AllowanceAssemblyData> = {}): AllowanceAssemblyData {
  return {
    members: [
      member("svd", "SVD", null),
      member("ssm", "SSM", "svd"),
      member("sm", "SM", "ssm"),
      member("ost", "OST", "sm"),
    ],
    vacancies: [],
    sales: [],
    igpSales: [],
    payments: [],
    ...overrides,
  };
}

describe("allowance assembly from month data (doc 08 section 15)", () => {
  it("counts a VIP sale once it reaches 25% and an IGP sale on its Closed Deal date", () => {
    const result = assembleAllowanceInputs(data({
      sales: [sale("s1", "ctr-1", "ost", null, 1_000_000), sale("s2", "ctr-2", "ost", null, 1_000_000)],
      payments: [
        payment("p1", "ctr-1", "2026-09-10", 250_000),
        payment("p2", "ctr-2", "2026-09-10", 249_999),
      ],
    }), "2026-09");
    const sm = result.leaders.find((item) => item.memberId === "sm")!;
    // Only s1 reached the frozen 25% threshold; its OST seller rolls up to the SM, SSM and SVD.
    expect(sm.teamTcpCentavos).toBe(1_000_000);
    expect(sm.teamCollectionsCentavos).toBe(250_000);
    expect(result.leaders.find((item) => item.memberId === "svd")!.teamTcpCentavos).toBe(1_000_000);
    expect(sm.ownTcpCentavos).toBe(0);
  });

  it("credits team TCP once per leader above the seller or the referrer and keeps own figures separate", () => {
    const result = assembleAllowanceInputs(data({
      sales: [sale("s1", "ctr-1", "sm", "ost", 2_000_000)],
      payments: [payment("p1", "ctr-1", "2026-09-10", 500_000)],
    }), "2026-09");
    const sm = result.leaders.find((item) => item.memberId === "sm")!;
    // The SM is the seller: own figures record it. The team rule runs on both
    // legs, so the SM is also above the OST referrer and the sale counts once in team TCP.
    expect(sm.ownTcpCentavos).toBe(2_000_000);
    expect(sm.teamTcpCentavos).toBe(2_000_000);
    expect(result.leaders.find((item) => item.memberId === "ssm")!.teamTcpCentavos).toBe(2_000_000);
    expect(result.leaders.find((item) => item.memberId === "svd")!.teamTcpCentavos).toBe(2_000_000);
  });

  it("counts month collections by accounting date and ignores receipts outside the month", () => {
    const late = { ...payment("p2", "ctr-1", "2026-08-10", 100_000), countedDate: "2026-09-02" };
    const result = assembleAllowanceInputs(data({
      sales: [sale("s1", "ctr-1", "ost", null, 1_000_000)],
      payments: [payment("p1", "ctr-1", "2026-09-10", 250_000), late, payment("p3", "ctr-1", "2026-10-01", 50_000)],
    }), "2026-09");
    // Closed Deal reached in September (250k + 100k counted in September); October money is out.
    expect(result.leaders.find((item) => item.memberId === "sm")!.teamCollectionsCentavos).toBe(350_000);
  });

  it("gives a vacant seat no allowance and rolls its downline up", () => {
    const result = assembleAllowanceInputs(data({
      vacancies: [{ id: "v1", seatMemberId: "ssm", holderEndDate: "2026-08-31", startDate: "2026-09-01", filledOn: null, filledMethod: null, filledByMemberId: null, recordedBy: "dev-admin", recordedAt: "2026-09-01" }],
      sales: [sale("s1", "ctr-1", "ost", null, 1_000_000)],
      payments: [payment("p1", "ctr-1", "2026-09-10", 250_000)],
    }), "2026-09");
    const ssm = result.leaders.find((item) => item.memberId === "ssm")!;
    expect(ssm.vacantWholeMonth).toBe(true);
    expect(ssm.eligibleDays).toBe(0);
    expect(ssm.teamTcpCentavos).toBe(0);
    // The OST rolls past the vacant SSM to the SVD.
    expect(result.leaders.find((item) => item.memberId === "svd")!.teamTcpCentavos).toBe(1_000_000);
    expect(result.leaders.find((item) => item.memberId === "sm")!.teamTcpCentavos).toBe(1_000_000);
  });

  it("counts an IGP Closed Deal in team TCP and leaves assumed credit for the reviewer", () => {
    const result = assembleAllowanceInputs(data({
      igpSales: [igpSale("igp-1", "ost", "2026-09-15", 5_000_000), igpSale("igp-2", "ost", null, 5_000_000)],
      payments: [payment("p1", "igp-1", "2026-09-15", 500_000)],
    }), "2026-09");
    const sm = result.leaders.find((item) => item.memberId === "sm")!;
    expect(sm.teamTcpCentavos).toBe(5_000_000);
    expect(sm.assumedCreditCentavos).toBe(0);
    expect(sm.unapplied.join(" ")).toMatch(/assumed collection credit/i);
    expect(sm.unapplied.join(" ")).toMatch(/Qualifying and Extended/i);
  });

  it("rejects an invalid month and reports eligible days for a partial vacancy", () => {
    expect(() => assembleAllowanceInputs(data(), "2026-13")).toThrow(/valid month/);
    const result = assembleAllowanceInputs(data({
      vacancies: [{ id: "v1", seatMemberId: "sm", holderEndDate: "2026-09-09", startDate: "2026-09-10", filledOn: "2026-09-20", filledMethod: "promotion", filledByMemberId: "sm", recordedBy: "dev-admin", recordedAt: "2026-09-20" }],
    }), "2026-09");
    // Vacant 2026-09-10 through 2026-09-19: 20 of 30 days are eligible.
    expect(result.leaders.find((item) => item.memberId === "sm")!.eligibleDays).toBe(20);
  });
});
