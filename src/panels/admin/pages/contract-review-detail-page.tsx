"use client";

import { useState } from "react";
import { useContractAction, useOperation } from "@/data/business-queries";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { ApproveArrangementDialog, CancelContractDialog, RaDialog, RequestCancellationDialog, ReturnContractDialog } from "../components/contract-dialogs";
import { ContractHistorySection, ContractPageFrame, ContractTermsSection, ContractTiles } from "../components/contract-sections";

const CRUMBS = [{ label: "Sales" }, { label: "Contract Review", href: "/admin/sales/contract-review" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Admin review of a contract: holds, arrangement approval, finalization, return, RA number and cancellation. */
export function ContractReviewDetailPage({ contractId }: { contractId: string }) {
  const action = useContractAction();
  const { confirmRun, dialog } = useConfirmRun();
  const canApprove = useOperation("contracts.approve");
  const { identity } = useDevIdentity();
  // Owner decision 2026-11-09: only Super Admin approves a Move arrangement (the repository enforces it too).
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const [dialogKind, setDialogKind] = useState<"ra" | "return" | "cancel" | "requestCancel" | "approveArrangement" | null>(null);
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
        return (
          <>
            {canApprove && contract.status === "submitted" ? <Button variant="outline" className={BUTTON} onClick={() => run("startReview", "Start review?", "The contract moves to Under Admin Review.", "Review started.")}>Start review</Button> : null}
            {isSuperAdmin && contract.arrangement?.status === "pending" && contract.status !== "cancelled" ? <Button className={BUTTON} onClick={() => setDialogKind("approveArrangement")}>Approve arrangement</Button> : null}
            {canApprove && inReview ? <Button className={BUTTON} disabled={contract.holds.length > 0} onClick={() => run("finalize", "Finalize this contract?", "The contract terms become fixed. A pending membership is created and verified payments may now confirm the sale.", "Contract finalized.")}>Finalize</Button> : null}
            {canApprove && inReview ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("return")}>Return for correction</Button> : null}
            {canApprove && contract.status === "finalized" && !membership?.cardId ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("ra")}>Record RA number</Button> : null}
            {canApprove && cancellable && !moneyLocked ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("cancel")}>Cancel contract</Button> : null}
            {canApprove && cancellable && moneyLocked && !pendingCancel ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("requestCancel")}>Request cancellation</Button> : null}
          </>
        );
      }}
    >
      {(record) => {
        const { contract } = record;
        const inReview = contract.status === "submitted" || contract.status === "under_review";
        const pendingCancel = contract.cancellation?.status === "requested";
        return (
          <>
            {dialog}
            {inReview && contract.holds.length > 0 ? (
              <InfoNote title="Finalization is on hold">
                <ul className="tw:list-disc tw:pl-5">{contract.holds.map((hold) => <li key={hold}>{hold}</li>)}</ul>
              </InfoNote>
            ) : null}
            {contract.status === "returned" && contract.returnReason ? <InfoNote title="Returned for correction">{contract.returnReason}</InfoNote> : null}
            {pendingCancel ? <InfoNote title="Cancellation awaiting Finance confirmation">Finance confirms or declines this request from Cancellation Requests. The requester cannot decide it (unless Super Admin).</InfoNote> : null}
            <ContractTiles contract={contract} payments={record.payments} />
            <ContractTermsSection record={record} />
            <ContractHistorySection contract={contract} />
            {dialogKind === "ra" ? <RaDialog contract={contract} onClose={close} /> : null}
            {dialogKind === "requestCancel" ? <RequestCancellationDialog contract={contract} onClose={close} /> : null}
            <ReturnContractDialog contract={contract} open={dialogKind === "return"} onClose={close} />
            <CancelContractDialog contract={contract} open={dialogKind === "cancel"} onClose={close} />
            <ApproveArrangementDialog contract={contract} open={dialogKind === "approveArrangement"} onClose={close} />
          </>
        );
      }}
    </ContractPageFrame>
  );
}
