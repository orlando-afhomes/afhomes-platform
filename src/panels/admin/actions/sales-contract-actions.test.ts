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

const saleCallbacks = (): SaleMenuCallbacks & { onView: () => void; onApprove: () => void; onMarkDefaulted: () => void } => ({
  onView: vi.fn(),
  onApprove: vi.fn(),
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
  onView: vi.fn(),
  onEdit: vi.fn(),
  onSubmitPayment: vi.fn(),
  onSubmitContract: vi.fn(),
  onStartReview: vi.fn(),
  onFinalize: vi.fn(),
  onReturn: vi.fn(),
  onRecordSignedAgreement: vi.fn(),
  onRecordPaymentCode: vi.fn(),
  onApproveArrangement: vi.fn(),
  onCancel: vi.fn(),
  onRequestCancellation: vi.fn(),
  onApproveSale: vi.fn(),
  onMarkDefaulted: vi.fn(),
});

const keysOf = (props: { extraItems: Array<{ key: string }> }): string[] => props.extraItems.map((item) => item.key);

describe("buildSalesMenuProps", () => {
  it("offers Approve sale for a pending unapproved sale when the viewer may approve", () => {
    const menu = buildSalesMenuProps(saleFixture(), { canApprove: true }, saleCallbacks());
    expect(keysOf(menu)).toEqual(["approve-sale"]);
    expect(menu.itemName).toBe("sale for Rosa Cruz");
    expect(menu.onView).toBeDefined();
  });

  it("offers Mark Defaulted for an eligible sale and hides both without the permission", () => {
    const eligible = saleFixture({ status: "confirmed", approval: { approvedAt: "2026-01-01", approvedBy: "dev-admin" }, defaultEligible: true });
    expect(keysOf(buildSalesMenuProps(eligible, { canApprove: true }, saleCallbacks()))).toEqual(["mark-defaulted"]);
    expect(keysOf(buildSalesMenuProps(eligible, { canApprove: false }, saleCallbacks()))).toEqual([]);
    expect(keysOf(buildSalesMenuProps(saleFixture(), { canApprove: false }, saleCallbacks()))).toEqual([]);
  });

  it("keeps approve precedence when both sale flags are somehow set", () => {
    const both = saleFixture({ defaultEligible: true });
    expect(keysOf(buildSalesMenuProps(both, { canApprove: true }, saleCallbacks()))).toEqual(["approve-sale"]);
  });

  it("exposes the identical action set on rows and on detail pages (detail hides View)", () => {
    const sale = saleFixture();
    const perms: SaleMenuPerms = { canApprove: true };
    const row = buildSalesMenuProps(sale, perms, saleCallbacks());
    const detailCallbacks = saleCallbacks();
    const detail = { ...buildSalesMenuProps(sale, perms, detailCallbacks), onView: undefined };
    expect(keysOf(detail)).toEqual(keysOf(row));
    expect(detail.onView).toBeUndefined();
    expect(detail.itemName).toBe(row.itemName);
  });
});

describe("buildContractMenuProps", () => {
  const reviewerPerms: ContractMenuPerms = {
    canPrepare: false,
    canApprove: true,
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
      "start-review",
      "approve-arrangement",
      "record-payment-code",
      "finalize",
      "return",
      "record-signed-agreement",
      "cancel-contract",
    ]);
    expect(menu.itemName).toBe("contract · Rosa Cruz · G1");
  });

  it("exposes the identical action set on rows and on detail pages (detail hides View)", () => {
    const contract = contractFixture({ status: "under_review", holds: ["Missing annex"] });
    const row = buildContractMenuProps(contract, reviewerPerms, allContractCallbacks());
    const detailCallbacks = allContractCallbacks();
    const detail = { ...buildContractMenuProps(contract, reviewerPerms, detailCallbacks), onView: undefined };
    expect(keysOf(detail)).toEqual(keysOf(row));
    expect(detail.onView).toBeUndefined();
    expect(detail.onEdit).toBe(detailCallbacks.onEdit);
    expect(detail.itemName).toBe(row.itemName);
  });

  it("exposes the preparer action set for an editable draft without verified money", () => {
    const perms: ContractMenuPerms = {
      canPrepare: true,
      canApprove: false,
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
    expect(keysOf(buildContractMenuProps(pending, reviewerPerms, allContractCallbacks()))).toContain("approve-sale");
    const defaultable = contractFixture({ status: "cancelled", saleView: { status: "confirmed", approval: { approvedAt: "2026-01-01", approvedBy: "dev-admin" }, defaultEligible: true } });
    expect(keysOf(buildContractMenuProps(defaultable, reviewerPerms, allContractCallbacks()))).toEqual(["mark-defaulted"]);
  });

  it("omits every item whose handler the caller did not provide", () => {
    const menu = buildContractMenuProps(contractFixture(), reviewerPerms, {});
    expect(menu.extraItems).toEqual([]);
    expect(menu.onView).toBeUndefined();
    expect(menu.onEdit).toBeUndefined();
  });
});
