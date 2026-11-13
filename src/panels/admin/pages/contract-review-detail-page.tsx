"use client";

import { useState } from "react";
import { useApproveSale, useContractAction, useMarkSaleDefaulted, useOperation, useSales } from "@/data/business-queries";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Button } from "@/shared/ui/button";
import { ApproveArrangementDialog, CancelContractDialog, RaDialog, RequestCancellationDialog, ResolvePaymentCodeDialog, ReturnContractDialog } from "../components/contract-dialogs";
import { buildContractMenuProps } from "../actions/sales-contract-actions";
import { ContractHistorySection, ContractPageFrame, ContractTermsSection, ContractTiles } from "../components/contract-sections";

const CRUMBS = [{ label: "Sales" }, { label: "Contract Review", href: "/admin/sales/contract-review" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Admin review of a contract: holds, arrangement approval, finalization, return, RA number and cancellation. */
export function ContractReviewDetailPage({ contractId }: { contractId: string }) {
  const action = useContractAction();
  const { confirmRun, dialog } = useConfirmRun();
  const canApprove = useOperation("contracts.approve");
  const sales = useSales();
  const approveSale = useApproveSale();
  const markDefaulted = useMarkSaleDefaulted();
  const { identity } = useDevIdentity();
  // Owner decision 2026-11-09: only Super Admin approves a Move arrangement (the repository enforces it too).
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const [dialogKind, setDialogKind] = useState<"ra" | "return" | "cancel" | "requestCancel" | "approveArrangement" | "resolvePaymentCode" | null>(null);
  const [saleDefaultOpen, setSaleDefaultOpen] = useState(false);
  const close = () => setDialogKind(null);

  return (
    <ContractPageFrame
      contractId={contractId}
      anyOf={["vip-products"]}
      parentCrumbs={CRUMBS}
      actions={({ contract, payments, membership }) => {
        const inReview = contract.status === "submitted" || contract.status === "under_review";
        const moneyLocked = totalVerifiedCentavos(payments) > 0 || contract.sale?.status === "confirmed";
        const cancellable = contract.status !== "cancelled" && membership?.status !== "active";
        const pendingCancel = contract.cancellation?.status === "requested";
        const run = (kind: "startReview" | "finalize", title: string, description: string, success: string) =>
          confirmRun({ title, description, confirmText: title.replace("?", ""), action: () => action.mutateAsync({ id: contract.id, action: kind }), successTitle: success, errorTitle: "Action failed" });
        const startReview = () => run("startReview", "Start review?", "The contract moves to Under Admin Review.", "Review started.");
        const finalize = () => run("finalize", "Finalize this contract?", "The contract terms become fixed and a pending membership is created.", "Contract finalized.");
        const sale = (sales.data ?? []).find((item) => item.contractId === contract.id) ?? null;
        const menu = buildContractMenuProps({ ...contract, saleView: sale }, {
          canPrepare: false,
          canApprove,
          canSubmitPayment: false,
          isSuperAdmin,
          hasVerifiedMoney: moneyLocked,
          hasActiveMembership: membership?.status === "active",
          hasCard: membership?.cardId != null,
        }, {
          onStartReview: startReview,
          onFinalize: finalize,
          onReturn: () => setDialogKind("return"),
          onRecordSignedAgreement: () => setDialogKind("ra"),
          onRecordPaymentCode: () => setDialogKind("resolvePaymentCode"),
          onApproveArrangement: () => setDialogKind("approveArrangement"),
          onCancel: () => setDialogKind("cancel"),
          onRequestCancellation: () => setDialogKind("requestCancel"),
          onApproveSale: sale ? () => confirmRun({ title: "Approve this sale?", description: "This allows its receipts to be reviewed for approval.", confirmText: "Approve sale", action: () => approveSale.mutateAsync(sale.id), successTitle: "Sale approved.", errorTitle: "Could not approve sale" }) : undefined,
          onMarkDefaulted: sale ? () => setSaleDefaultOpen(true) : undefined,
        });
        return (
          <>
            {canApprove && contract.status === "submitted" ? <Button variant="outline" className={BUTTON} onClick={startReview}>Start review</Button> : null}
            {isSuperAdmin && contract.arrangement?.status === "pending" && contract.status !== "cancelled" ? <Button className={BUTTON} onClick={() => setDialogKind("approveArrangement")}>Approve arrangement</Button> : null}
            {canApprove && contract.paymentCode == null && contract.status !== "cancelled" ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("resolvePaymentCode")}>Record payment code</Button> : null}
            {canApprove && inReview ? <Button className={BUTTON} disabled={contract.holds.length > 0} onClick={finalize}>Finalize</Button> : null}
            {canApprove && inReview ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("return")}>Return for correction</Button> : null}
            {canApprove && (inReview || contract.status === "finalized") && !contract.vipNumber && !membership?.cardId ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("ra")}>Record signed agreement</Button> : null}
            {canApprove && cancellable && !moneyLocked ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("cancel")}>Cancel contract</Button> : null}
            {canApprove && cancellable && moneyLocked && !pendingCancel ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("requestCancel")}>Request cancellation</Button> : null}
            <RowActionsMenu {...menu} onView={undefined} />
          </>
        );
      }}
    >
      {(record) => {
        const { contract } = record;
        const sale = (sales.data ?? []).find((item) => item.contractId === contract.id) ?? null;
        const inReview = contract.status === "submitted" || contract.status === "under_review";
        const pendingCancel = contract.cancellation?.status === "requested";
        return (
          <>
            {dialog}
            <ReasonDialog open={saleDefaultOpen} title="Mark sale Defaulted" description={sale?.customerName ?? ""} confirmText="Mark Defaulted" successText="Sale marked Defaulted." onClose={() => setSaleDefaultOpen(false)} onSubmit={(reason) => sale ? markDefaulted.mutateAsync({ id: sale.id, reason }) : Promise.resolve()} />
            {inReview && contract.holds.length > 0 ? (
              <InfoNote title="Finalization is on hold">
                <ul className="tw:list-disc tw:pl-5">{contract.holds.map((hold) => <li key={hold}>{hold}</li>)}</ul>
              </InfoNote>
            ) : null}
            {contract.status === "returned" && contract.returnReason ? <InfoNote title="Returned for correction">{contract.returnReason}</InfoNote> : null}
            {pendingCancel ? <InfoNote title="Cancellation awaiting Finance confirmation">Finance confirms or declines this request from Cancellation Requests. If the same person requested and decides it, the history flags it.</InfoNote> : null}
            <ContractTiles contract={contract} payments={record.payments} />
            <ContractTermsSection record={record} />
            <ContractHistorySection contract={contract} />
            {dialogKind === "ra" ? <RaDialog contract={contract} onClose={close} /> : null}
            {dialogKind === "requestCancel" ? <RequestCancellationDialog contract={contract} onClose={close} /> : null}
            <ReturnContractDialog contract={contract} open={dialogKind === "return"} onClose={close} />
            <CancelContractDialog contract={contract} open={dialogKind === "cancel"} onClose={close} />
            <ApproveArrangementDialog contract={contract} open={dialogKind === "approveArrangement"} onClose={close} />
            <ResolvePaymentCodeDialog contract={contract} open={dialogKind === "resolvePaymentCode"} onClose={close} />
          </>
        );
      }}
    </ContractPageFrame>
  );
}
