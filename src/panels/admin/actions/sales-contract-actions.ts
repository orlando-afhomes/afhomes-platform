import type { RowActionItem, RowActionTone } from "@/shared/components/modern/row-actions-menu";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import type { ConfirmRunInput } from "@/shared/components/modern/use-confirm-run";
import type { ApproveDealOutcome } from "@/modules/contracts/application/approve-deal";
import { nonStandardStage } from "@/modules/contracts/rules";
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
    description: "This confirms the signed Reservation Agreement is on file and approves the customer and sale. The VIP Number is issued once the first scheduled payment after the reservation fee is approved. The contract is finalized when nothing is on hold.",
    confirmText: "Approve Deal",
    tone: "success",
    action: async () => reportHeldDeal(await approve()),
    successTitle: "Deal approved.",
    errorTitle: "Could not approve the deal",
  };
}

/** Finance confirmation of Non-Standard terms (doc 05 §10.2 step 2). */
export function confirmNonStandardConfirm(confirm: () => Promise<unknown>): ConfirmRunInput {
  return {
    title: "Confirm Non-Standard Terms?",
    description: "This confirms the Non-Standard price and monthly payments the Administrator approved. The Administrator can then finalize the contract with Approve Deal.",
    confirmText: "Confirm Non-Standard Terms",
    tone: "success",
    action: confirm,
    successTitle: "Non-Standard terms confirmed.",
    errorTitle: "Could not confirm the Non-Standard terms",
  };
}

/** After "Approve deal": a held finalization is reported as a warning. */
export function reportHeldDeal(outcome: ApproveDealOutcome): void {
  if (outcome.finalizeHeld.length > 0) toast.warning("The contract is not finalized yet.", { description: outcome.finalizeHeld.join(" ") });
}

/** "Approve deal" needs the signed approval reference first: a Non-Standard contract in review without step 1 (doc 05 §10.2). */
export function needsNonStandardApproval(contract: Pick<ContractView, "status" | "classification" | "nonStandard">): boolean {
  return (contract.status === "submitted" || contract.status === "under_review") && nonStandardStage(contract) === "admin";
}

/**
 * Finance step of doc 05 §10.2: a `finance.verify` user may confirm or send back
 * Non-Standard terms the Administrator approved. Whoever approved may confirm only
 * as Super Administrator (the repository enforces it too).
 */
export function canConfirmNonStandard(
  contract: Pick<ContractView, "status" | "classification" | "nonStandard">,
  viewer: { id: string; canVerify: boolean; isSuperAdmin: boolean },
): boolean {
  const inReview = contract.status === "submitted" || contract.status === "under_review";
  return viewer.canVerify && inReview && nonStandardStage(contract) === "finance" && (contract.nonStandard?.approvedBy !== viewer.id || viewer.isSuperAdmin);
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
  /** `canConfirmNonStandard` for this viewer and contract (doc 05 §10.2 Finance step). */
  canConfirmNonStandard?: boolean;
};

export type ContractMenuCallbacks = {
  onEdit?: () => void;
  onSubmitPayment?: () => void;
  onSubmitContract?: () => void;
  onApproveDeal?: () => void;
  onReturn?: () => void;
  onRecordPaymentCode?: () => void;
  onApproveArrangement?: () => void;
  onConfirmNonStandard?: () => void;
  onSendBackNonStandard?: () => void;
  onCancel?: () => void;
  onRequestCancellation?: () => void;
  onMarkDefaulted?: () => void;
};

export type ContractMenuContract = Pick<
  ContractView,
  "status" | "customerName" | "productCode" | "paymentCode" | "vipNumber" | "signedAgreementRecordedDate" | "cancellation" | "arrangement" | "holds" | "sale" | "classification" | "nonStandard"
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
  // A signed deal awaiting its first approved payment needs no additional approval here.
  const saleUnapproved = sale?.status === "pending" && !sale.approval;
  const agreementPending = !contract.signedAgreementRecordedDate && !contract.vipNumber && !perms.hasCard;
  const dealOpen = (inReview || contract.status === "finalized") && (agreementPending || saleUnapproved || (inReview && contract.holds.length === 0) || needsNonStandardApproval(contract));

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
  if (perms.canConfirmNonStandard && cb.onConfirmNonStandard) {
    add(extraItems, { key: "confirm-nonstandard", label: "Confirm Non-Standard Terms", tone: "success", onClick: cb.onConfirmNonStandard });
  }
  // An Administrator already has Return for Correction, which does the same.
  if (perms.canConfirmNonStandard && !perms.canApprove && cb.onSendBackNonStandard) {
    add(extraItems, { key: "send-back-nonstandard", label: "Send Back", tone: "warning", onClick: cb.onSendBackNonStandard });
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
