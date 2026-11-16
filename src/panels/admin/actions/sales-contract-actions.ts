import type { RowActionItem, RowActionTone } from "@/shared/components/modern/row-actions-menu";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import type { ConfirmRunInput } from "@/shared/components/modern/use-confirm-run";
import type { ApproveDealOutcome } from "@/modules/contracts/application/approve-deal";
import { recordLabel } from "@/shared/lib/record-label";
import { toast } from "sonner";

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

/** "Approve deal" confirmation (owner decision 2026-11-16); a held finalization is reported as a warning after the steps run. */
export function approveDealConfirm(approve: () => Promise<ApproveDealOutcome>): ConfirmRunInput {
  return {
    title: "Approve This Deal?",
    description: "This confirms the signed Reservation Agreement is on file. It approves the customer and the sale, issues the VIP Number, and finalizes the contract when nothing is on hold.",
    confirmText: "Approve Deal",
    tone: "success",
    action: async () => {
      const outcome = await approve();
      if (outcome.finalizeHeld.length > 0) toast.warning("The contract is not finalized yet.", { description: outcome.finalizeHeld.join(" ") });
    },
    successTitle: "Deal approved.",
    errorTitle: "Could not approve the deal",
  };
}

export type SaleMenuPerms = {
  canApprove: boolean;
  /** `customers.approve`; "Approve deal" also approves the customer. */
  canApproveCustomer: boolean;
};

export type SaleMenuCallbacks = {
  onApproveDeal?: () => void;
  onMarkDefaulted?: () => void;
};

export type SaleMenuSale = Pick<SaleView, "status" | "approval" | "defaultEligible" | "customerName">;

/**
 * Sale row/detail menu. Pure: same sale + perms + callbacks always produce the
 * same action set. Gates mirror the Sales list (`contracts.approve` plus the
 * pending/default-eligible conditions); approval takes precedence exactly as there.
 */
export function buildSalesMenuProps(sale: SaleMenuSale, perms: SaleMenuPerms, cb: SaleMenuCallbacks): SalesMenuProps {
  const extraItems: RowActionItem[] = [];
  if (perms.canApprove && sale.status === "pending" && !sale.approval) {
    if (perms.canApproveCustomer && cb.onApproveDeal) extraItems.push({ key: "approve-deal", label: "Approve Deal", tone: "success", onClick: cb.onApproveDeal });
  } else if (perms.canApprove && sale.defaultEligible) {
    if (cb.onMarkDefaulted) extraItems.push({ key: "mark-defaulted", label: "Mark as Stopped Paying", tone: "danger", onClick: cb.onMarkDefaulted });
  }
  return { itemName: `sale for ${sale.customerName}`, extraItems };
}

export type ContractMenuPerms = {
  canPrepare: boolean;
  canApprove: boolean;
  /** `customers.approve`; "Approve deal" also approves the customer. */
  canApproveCustomer: boolean;
  canSubmitPayment: boolean;
  isSuperAdmin: boolean;
  /** Verified money exists on the contract or its sale is confirmed (locks direct cancellation). */
  hasVerifiedMoney: boolean;
  /** A membership exists and is active (blocks cancellation). */
  hasActiveMembership: boolean;
  /** A membership card already exists (blocks issuing a VIP Number twice). */
  hasCard: boolean;
};

export type ContractMenuCallbacks = {
  onEdit?: () => void;
  onSubmitPayment?: () => void;
  onSubmitContract?: () => void;
  onApproveDeal?: () => void;
  onReturn?: () => void;
  onRecordPaymentCode?: () => void;
  onApproveArrangement?: () => void;
  onCancel?: () => void;
  onRequestCancellation?: () => void;
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
 * identical items. These checks guard preparation and review on the contract
 * detail page and match sale dispositions on the sales list. Callbacks the
 * caller cannot handle are omitted, which only
 * narrows the set; it never re-gates an included item.
 */
export function buildContractMenuProps(contract: ContractMenuContract, perms: ContractMenuPerms, cb: ContractMenuCallbacks): SalesMenuProps {
  const extraItems: RowActionItem[] = [];
  const editable = contract.status === "draft" || contract.status === "returned";
  const inReview = contract.status === "submitted" || contract.status === "under_review";
  const cancellable = contract.status !== "cancelled" && !perms.hasActiveMembership;
  const pendingCancel = contract.cancellation?.status === "requested";
  const moneyLocked = perms.hasVerifiedMoney;
  const sale = contract.saleView ?? null;
  // "Approve deal" stays while a step can still run: the sale approval, the VIP Number, or a finalization nothing holds.
  const saleUnapproved = sale?.status === "pending" && !sale.approval;
  const vipPending = !contract.vipNumber && !perms.hasCard;
  const dealOpen = (inReview || contract.status === "finalized") && (vipPending || saleUnapproved || (inReview && contract.holds.length === 0));

  if (perms.canSubmitPayment && contract.status !== "cancelled" && contract.status !== "returned" && cb.onSubmitPayment) {
    add(extraItems, { key: "submit-payment", label: "Submit Payment", tone: "info", onClick: cb.onSubmitPayment });
  }
  if (perms.canPrepare && editable && cb.onSubmitContract) {
    add(extraItems, { key: "submit-contract", label: "Submit Contract", onClick: cb.onSubmitContract });
  }

  if (perms.isSuperAdmin && contract.arrangement?.status === "pending" && contract.status !== "cancelled" && cb.onApproveArrangement) {
    add(extraItems, { key: "approve-arrangement", label: "Approve Arrangement", tone: "success", onClick: cb.onApproveArrangement });
  }
  if (perms.canApprove && contract.paymentCode == null && contract.status !== "cancelled" && cb.onRecordPaymentCode) {
    add(extraItems, { key: "record-payment-code", label: "Record Payment Code", tone: "info", onClick: cb.onRecordPaymentCode });
  }
  if (perms.canApprove && perms.canApproveCustomer && dealOpen && !pendingCancel && cb.onApproveDeal) {
    add(extraItems, { key: "approve-deal", label: "Approve Deal", tone: "success", onClick: cb.onApproveDeal });
  }
  if (perms.canApprove && inReview && cb.onReturn) {
    add(extraItems, { key: "return", label: "Return for Correction", tone: "warning", onClick: cb.onReturn });
  }
  if (perms.canPrepare && contract.status === "draft" && cancellable && !moneyLocked && cb.onCancel) {
    add(extraItems, { key: "cancel-contract", label: "Cancel Contract", tone: "danger", onClick: cb.onCancel });
  }
  if (perms.canApprove && cancellable && !moneyLocked && cb.onCancel) {
    add(extraItems, { key: "cancel-contract", label: "Cancel Contract", tone: "danger", onClick: cb.onCancel });
  }
  if (perms.canApprove && cancellable && moneyLocked && !pendingCancel && cb.onRequestCancellation) {
    add(extraItems, { key: "request-cancellation", label: "Request Cancellation", tone: "warning", onClick: cb.onRequestCancellation });
  }

  if (sale && perms.canApprove && !saleUnapproved && sale.defaultEligible && cb.onMarkDefaulted) {
    add(extraItems, { key: "mark-defaulted", label: "Mark as Stopped Paying", tone: "danger", onClick: cb.onMarkDefaulted });
  }

  return {
    itemName: recordLabel("contract", contract.customerName, contract.productCode),
    onEdit: cb.onEdit,
    extraItems,
  };
}
