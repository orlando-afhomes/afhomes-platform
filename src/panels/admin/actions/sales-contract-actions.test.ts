import { describe, expect, it, vi } from "vitest";
import {
  buildContractMenuProps,
  buildSalesMenuProps,
  type ContractMenuCallbacks,
  type ContractMenuContract,
  type ContractMenuPerms,
  type SaleMenuCallbacks,
  type SaleMenuPerms,
  type SaleMenuSale,
} from "./sales-contract-actions";

const saleCallbacks = (): SaleMenuCallbacks & { onApproveDeal: () => void; onMarkDefaulted: () => void } => ({
  onApproveDeal: vi.fn(),
  onMarkDefaulted: vi.fn(),
});

function saleFixture(overrides: Partial<SaleMenuSale> = {}): SaleMenuSale {
  return { status: "pending", approval: null, defaultEligible: false, customerName: "Rosa Cruz", ...overrides };
}

function contractFixture(overrides: Partial<ContractMenuContract> = {}): ContractMenuContract {
  return {
    status: "submitted",
    customerName: "Rosa Cruz",
    productCode: "G1",
    paymentCode: null,
    holds: [],
    sale: null,
    ...overrides,
  };
}

const allContractCallbacks = (): Required<ContractMenuCallbacks> => ({
  onEdit: vi.fn(),
  onSubmitPayment: vi.fn(),
  onSubmitContract: vi.fn(),
  onApproveDeal: vi.fn(),
  onReturn: vi.fn(),
  onRecordPaymentCode: vi.fn(),
  onApproveArrangement: vi.fn(),
  onCancel: vi.fn(),
  onRequestCancellation: vi.fn(),
  onMarkDefaulted: vi.fn(),
});

const keysOf = (props: { extraItems: Array<{ key: string }> }): string[] => props.extraItems.map((item) => item.key);

describe("buildSalesMenuProps", () => {
  const approver: SaleMenuPerms = { canApprove: true, canApproveCustomer: true };
  const viewer: SaleMenuPerms = { canApprove: false, canApproveCustomer: false };

  it("offers Approve deal for a pending unapproved sale when the viewer may approve", () => {
    const menu = buildSalesMenuProps(saleFixture(), approver, saleCallbacks());
    expect(menu.extraItems).toMatchObject([{ key: "approve-deal", label: "Approve deal", tone: "success" }]);
    expect(menu.itemName).toBe("sale for Rosa Cruz");
    expect("onView" in menu).toBe(false);
  });

  it("hides Approve deal when the viewer cannot also approve the customer", () => {
    expect(keysOf(buildSalesMenuProps(saleFixture(), { canApprove: true, canApproveCustomer: false }, saleCallbacks()))).toEqual([]);
  });

  it("offers Mark Defaulted for an eligible sale and hides both without the permission", () => {
    const eligible = saleFixture({ status: "confirmed", approval: { approvedAt: "2026-01-01", approvedBy: "dev-admin" }, defaultEligible: true });
    expect(keysOf(buildSalesMenuProps(eligible, approver, saleCallbacks()))).toEqual(["mark-defaulted"]);
    expect(keysOf(buildSalesMenuProps(eligible, viewer, saleCallbacks()))).toEqual([]);
    expect(keysOf(buildSalesMenuProps(saleFixture(), viewer, saleCallbacks()))).toEqual([]);
  });

  it("keeps approve precedence when both sale flags are somehow set", () => {
    const both = saleFixture({ defaultEligible: true });
    expect(keysOf(buildSalesMenuProps(both, approver, saleCallbacks()))).toEqual(["approve-deal"]);
  });

  it("exposes the identical action set on rows and on detail pages (no View entry)", () => {
    const sale = saleFixture();
    const perms = approver;
    const row = buildSalesMenuProps(sale, perms, saleCallbacks());
    const detailCallbacks = saleCallbacks();
    const detail = { ...buildSalesMenuProps(sale, perms, detailCallbacks) };
    expect(keysOf(detail)).toEqual(keysOf(row));
    expect(detail.itemName).toBe(row.itemName);
  });
});

describe("buildContractMenuProps", () => {
  const reviewerPerms: ContractMenuPerms = {
    canPrepare: false,
    canApprove: true,
    canApproveCustomer: true,
    canSubmitPayment: false,
    isSuperAdmin: true,
    hasVerifiedMoney: false,
    hasActiveMembership: false,
    hasCard: false,
  };

  it("exposes the review action set for a submitted contract", () => {
    const contract = contractFixture({ arrangement: { schemeLabel: "Move A", status: "pending", approvedBy: null, approvedAt: null, approvalReference: null } });
    const menu = buildContractMenuProps(contract, reviewerPerms, allContractCallbacks());
    expect(keysOf(menu)).toEqual([
      "approve-arrangement",
      "record-payment-code",
      "approve-deal",
      "return",
      "cancel-contract",
    ]);
    expect(menu.extraItems.find((item) => item.key === "approve-deal")).toMatchObject({ label: "Approve deal", tone: "success" });
    expect(menu.itemName).toBe("contract · Rosa Cruz · G1");
  });

  it("offers Approve deal only while a deal step can still run", () => {
    const approved = { status: "pending" as const, approval: { approvedAt: "2026-01-01", approvedBy: "dev-admin" }, defaultEligible: false };
    const keys = (overrides: Partial<ContractMenuContract>, perms = reviewerPerms) => keysOf(buildContractMenuProps(contractFixture(overrides), perms, allContractCallbacks()));
    // VIP Number issued and only a held finalization left: nothing the button can do.
    expect(keys({ vipNumber: "26010100001G1T04S", holds: ["Non-Standard"], saleView: approved })).not.toContain("approve-deal");
    // Same contract with nothing on hold: the button finalizes it.
    expect(keys({ vipNumber: "26010100001G1T04S", saleView: approved })).toContain("approve-deal");
    // A held contract without its VIP Number still offers it, to issue the number.
    expect(keys({ holds: ["Non-Standard"] })).toContain("approve-deal");
    expect(keys({ cancellation: { status: "requested" } as ContractMenuContract["cancellation"] })).not.toContain("approve-deal");
    expect(keys({}, { ...reviewerPerms, canApproveCustomer: false })).not.toContain("approve-deal");
    expect(keys({ status: "draft" })).not.toContain("approve-deal");
  });

  it("exposes the identical action set on rows and on detail pages (no View entry)", () => {
    const contract = contractFixture({ status: "under_review", holds: ["Missing annex"] });
    const row = buildContractMenuProps(contract, reviewerPerms, allContractCallbacks());
    const detailCallbacks = allContractCallbacks();
    const detail = { ...buildContractMenuProps(contract, reviewerPerms, detailCallbacks) };
    expect(keysOf(detail)).toEqual(keysOf(row));
    expect(detail.onEdit).toBe(detailCallbacks.onEdit);
    expect(detail.itemName).toBe(row.itemName);
  });

  it("exposes the preparer action set for an editable draft without verified money", () => {
    const perms: ContractMenuPerms = {
      canPrepare: true,
      canApprove: false,
      canApproveCustomer: false,
      canSubmitPayment: true,
      isSuperAdmin: false,
      hasVerifiedMoney: false,
      hasActiveMembership: false,
      hasCard: false,
    };
    const menu = buildContractMenuProps(contractFixture({ status: "draft", paymentCode: "G1T04S" }), perms, allContractCallbacks());
    expect(keysOf(menu)).toEqual(["submit-payment", "submit-contract", "cancel-contract"]);
    expect(menu.onEdit).toBeDefined();
  });

  it("locks direct cancellation once money is verified and offers a cancellation request instead", () => {
    const perms: ContractMenuPerms = {
      canPrepare: false,
      canApprove: true,
      canApproveCustomer: true,
      canSubmitPayment: true,
      isSuperAdmin: false,
      hasVerifiedMoney: true,
      hasActiveMembership: false,
      hasCard: true,
    };
    const menu = buildContractMenuProps(
      contractFixture({ status: "finalized", paymentCode: "G1T04S", vipNumber: "26010100001G1T04S", sale: { id: "sale-1", status: "confirmed", confirmedDate: "2026-01-02" } }),
      perms,
      allContractCallbacks(),
    );
    expect(keysOf(menu)).toEqual(["submit-payment", "request-cancellation"]);
  });

  it("offers nothing on a cancelled contract without a visible sale", () => {
    const menu = buildContractMenuProps(contractFixture({ status: "cancelled" }), reviewerPerms, allContractCallbacks());
    expect(keysOf(menu)).toEqual([]);
  });

  it("carries sale-level dispositions onto the contract detail kebab when their gates are met", () => {
    const pending = contractFixture({ status: "finalized", saleView: { status: "pending", approval: null, defaultEligible: false } });
    expect(keysOf(buildContractMenuProps(pending, reviewerPerms, allContractCallbacks()))).toContain("approve-deal");
    const defaultable = contractFixture({ status: "cancelled", saleView: { status: "confirmed", approval: { approvedAt: "2026-01-01", approvedBy: "dev-admin" }, defaultEligible: true } });
    expect(keysOf(buildContractMenuProps(defaultable, reviewerPerms, allContractCallbacks()))).toEqual(["mark-defaulted"]);
  });

  it("omits every item whose handler the caller did not provide", () => {
    const menu = buildContractMenuProps(contractFixture(), reviewerPerms, {});
    expect(menu.extraItems).toEqual([]);
    expect(menu.onEdit).toBeUndefined();
  });
});
