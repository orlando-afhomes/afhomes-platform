import type { RowActionItem, RowActionTone } from "@/shared/components/modern/row-actions-menu";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import { recordLabel } from "@/shared/lib/record-label";

/** Button color for a menu item's tone, so a detail page header shows each action once with the row menu's meaning. */
export function actionButtonVariant(tone: RowActionTone | undefined): "default" | "success" | "warning" | "info" | "destructive" {
  return tone === "danger" ? "destructive" : tone && tone !== "default" ? tone : "default";
}

const TONE_RANK: Record<RowActionTone, number> = { default: 0, success: 1, info: 2, warning: 3, danger: 4 };

/** Header order: main action first, then green, blue, amber, and red last (stable within a color). */
export function orderActionItems(items: ReadonlyArray<RowActionItem>): RowActionItem[] {
  return [...items].sort((a, b) => TONE_RANK[a.tone ?? "default"] - TONE_RANK[b.tone ?? "default"]);
}

export type SalesMenuProps = {
  itemName: string;
  onEdit?: () => void;
  extraItems: RowActionItem[];
  onDelete?: () => void | Promise<unknown>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteDisabledReason?: string | null;
};

export type SaleMenuPerms = {
  canApprove: boolean;
};

export type SaleMenuCallbacks = {
  onApprove?: () => void;
  onMarkDefaulted?: () => void;
};

export type SaleMenuSale = Pick<SaleView, "status" | "approval" | "defaultEligible" | "customerName">;

/**
 * Sale row/detail menu. Pure: same sale + perms + callbacks always produce the
 * same action set. Gates mirror the Sales list (`contracts.approve` plus the
 * pending/default-eligible conditions); approve takes precedence exactly as there.
 */
export function buildSalesMenuProps(sale: SaleMenuSale, perms: SaleMenuPerms, cb: SaleMenuCallbacks): SalesMenuProps {
  const extraItems: RowActionItem[] = [];
  if (perms.canApprove && sale.status === "pending" && !sale.approval) {
    if (cb.onApprove) extraItems.push({ key: "approve-sale", label: "Approve sale", tone: "success", onClick: cb.onApprove });
  } else if (perms.canApprove && sale.defaultEligible) {
    if (cb.onMarkDefaulted) extraItems.push({ key: "mark-defaulted", label: "Mark Defaulted", tone: "danger", onClick: cb.onMarkDefaulted });
  }
  return { itemName: `sale for ${sale.customerName}`, extraItems };
}

export type ContractMenuPerms = {
  canPrepare: boolean;
  canApprove: boolean;
  canSubmitPayment: boolean;
  isSuperAdmin: boolean;
  /** Verified money exists on the contract or its sale is confirmed (locks direct cancellation). */
  hasVerifiedMoney: boolean;
  /** A membership exists and is active (blocks cancellation). */
  hasActiveMembership: boolean;
  /** A membership card already exists (blocks recording the signed agreement twice). */
  hasCard: boolean;
};

export type ContractMenuCallbacks = {
  onEdit?: () => void;
  onSubmitPayment?: () => void;
  onSubmitContract?: () => void;
  onStartReview?: () => void;
  onFinalize?: () => void;
  onReturn?: () => void;
  onRecordSignedAgreement?: () => void;
  onRecordPaymentCode?: () => void;
  onApproveArrangement?: () => void;
  onCancel?: () => void;
  onRequestCancellation?: () => void;
  onApproveSale?: () => void;
  onMarkDefaulted?: () => void;
};

export type ContractMenuContract = Pick<
  ContractView,
  "status" | "customerName" | "productCode" | "paymentCode" | "vipNumber" | "cancellation" | "arrangement" | "holds" | "sale"
> & {
  /** Full sale record when the caller can see it; drives the sale-level dispositions on detail pages. */
  saleView?: Pick<SaleView, "status" | "approval" | "defaultEligible"> | null;
};

function add(items: RowActionItem[], item: RowActionItem): void {
  if (!items.some((existing) => existing.key === item.key)) items.push(item);
}

/**
 * Contract row/detail menu. Pure: same contract + perms + callbacks always
 * produce the same action set, so a list row and its detail kebab expose
 * identical items. Every gate below mirrors its detail page verbatim:
 * preparer actions mirror the sales contract detail page, reviewer actions
 * mirror the contract review detail page, and sale dispositions mirror the
 * sales list. Callbacks the caller cannot handle are omitted, which only
 * narrows the set; it never re-gates an included item.
 */
export function buildContractMenuProps(contract: ContractMenuContract, perms: ContractMenuPerms, cb: ContractMenuCallbacks): SalesMenuProps {
  const extraItems: RowActionItem[] = [];
  const editable = contract.status === "draft" || contract.status === "returned";
  const inReview = contract.status === "submitted" || contract.status === "under_review";
  const cancellable = contract.status !== "cancelled" && !perms.hasActiveMembership;
  const pendingCancel = contract.cancellation?.status === "requested";
  const moneyLocked = perms.hasVerifiedMoney;

  if (perms.canSubmitPayment && contract.status !== "cancelled" && contract.status !== "returned" && cb.onSubmitPayment) {
    add(extraItems, { key: "submit-payment", label: "Submit payment", tone: "info", onClick: cb.onSubmitPayment });
  }
  if (perms.canPrepare && editable && cb.onSubmitContract) {
    add(extraItems, { key: "submit-contract", label: "Submit contract", onClick: cb.onSubmitContract });
  }

  if (perms.canApprove && contract.status === "submitted" && cb.onStartReview) {
    add(extraItems, { key: "start-review", label: "Start review", onClick: cb.onStartReview });
  }
  if (perms.isSuperAdmin && contract.arrangement?.status === "pending" && contract.status !== "cancelled" && cb.onApproveArrangement) {
    add(extraItems, { key: "approve-arrangement", label: "Approve arrangement", tone: "success", onClick: cb.onApproveArrangement });
  }
  if (perms.canApprove && contract.paymentCode == null && contract.status !== "cancelled" && cb.onRecordPaymentCode) {
    add(extraItems, { key: "record-payment-code", label: "Record payment code", tone: "info", onClick: cb.onRecordPaymentCode });
  }
  if (perms.canApprove && inReview && cb.onFinalize) {
    add(extraItems, { key: "finalize", label: "Finalize", tone: "success", onClick: cb.onFinalize });
  }
  if (perms.canApprove && inReview && cb.onReturn) {
    add(extraItems, { key: "return", label: "Return for correction", tone: "warning", onClick: cb.onReturn });
  }
  if (perms.canApprove && (inReview || contract.status === "finalized") && !contract.vipNumber && !perms.hasCard && cb.onRecordSignedAgreement) {
    add(extraItems, { key: "record-signed-agreement", label: "Record signed agreement", tone: "info", onClick: cb.onRecordSignedAgreement });
  }
  if (perms.canPrepare && contract.status === "draft" && cancellable && !moneyLocked && cb.onCancel) {
    add(extraItems, { key: "cancel-contract", label: "Cancel contract", tone: "danger", onClick: cb.onCancel });
  }
  if (perms.canApprove && cancellable && !moneyLocked && cb.onCancel) {
    add(extraItems, { key: "cancel-contract", label: "Cancel contract", tone: "danger", onClick: cb.onCancel });
  }
  if (perms.canApprove && cancellable && moneyLocked && !pendingCancel && cb.onRequestCancellation) {
    add(extraItems, { key: "request-cancellation", label: "Request cancellation", tone: "warning", onClick: cb.onRequestCancellation });
  }

  const sale = contract.saleView ?? null;
  if (sale && perms.canApprove && sale.status === "pending" && !sale.approval) {
    if (cb.onApproveSale) add(extraItems, { key: "approve-sale", label: "Approve sale", tone: "success", onClick: cb.onApproveSale });
  } else if (sale && perms.canApprove && sale.defaultEligible) {
    if (cb.onMarkDefaulted) add(extraItems, { key: "mark-defaulted", label: "Mark Defaulted", tone: "danger", onClick: cb.onMarkDefaulted });
  }

  return {
    itemName: recordLabel("contract", contract.customerName, contract.productCode),
    onEdit: cb.onEdit,
    extraItems,
  };
}
