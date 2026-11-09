"use client";

import { useState } from "react";
import { useContractAction, useOperation } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { EditContractDialog, CancelContractDialog } from "../components/contract-dialogs";
import { ContractHistorySection, ContractPageFrame, ContractPaymentsSection, ContractScheduleSection, ContractTermsSection, ContractTiles } from "../components/contract-sections";
import { PaymentSubmitDialog } from "../components/payment-actions";

const CRUMBS = [{ label: "Sales" }, { label: "Contracts", href: "/admin/sales/contracts" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Sales view of a contract: terms, schedule, submitted payments and the preparer's actions. */
export function SalesContractDetailPage({ contractId }: { contractId: string }) {
  const action = useContractAction();
  const { confirmRun, dialog } = useConfirmRun();
  const canPrepare = useOperation("contracts.prepare");
  const canSubmitPayment = useOperation("payments.submit");
  const [dialogKind, setDialogKind] = useState<"payment" | "edit" | "cancel" | null>(null);
  const close = () => setDialogKind(null);

  return (
    <ContractPageFrame
      contractId={contractId}
      anyOf={["sales", "vip-products"]}
      parentCrumbs={CRUMBS}
      actions={({ contract, payments, membership }) => {
        const editable = contract.status === "draft" || contract.status === "returned";
        const moneyLocked = totalVerifiedCentavos(payments) > 0 || contract.sale?.status === "confirmed";
        const cancellable = contract.status !== "cancelled" && membership?.status !== "active";
        return (
          <>
            {canSubmitPayment && contract.status !== "cancelled" && contract.status !== "returned" ? <Button className={BUTTON} onClick={() => setDialogKind("payment")}>Submit payment</Button> : null}
            {canPrepare && editable ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("edit")}>Edit details</Button> : null}
            {canPrepare && editable ? (
              <Button className={BUTTON} onClick={() => confirmRun({ title: "Submit this contract?", description: "It will be sent to Admin review and a Pending sale will be recorded.", confirmText: "Submit this contract", action: () => action.mutateAsync({ id: contract.id, action: "submit" }), successTitle: "Contract submitted.", errorTitle: "Action failed" })}>Submit contract</Button>
            ) : null}
            {canPrepare && contract.status === "draft" && cancellable && !moneyLocked ? <Button variant="outline" className={BUTTON} onClick={() => setDialogKind("cancel")}>Cancel contract</Button> : null}
          </>
        );
      }}
    >
      {(record) => (
        <>
          {dialog}
          {record.contract.status === "returned" && record.contract.returnReason ? <InfoNote title="Returned for correction">{record.contract.returnReason}</InfoNote> : null}
          <ContractTiles contract={record.contract} payments={record.payments} />
          <ContractTermsSection record={record} />
          <ContractScheduleSection record={record} />
          <ContractPaymentsSection record={record} />
          <ContractHistorySection contract={record.contract} />
          <PaymentSubmitDialog contractId={record.contract.id} open={dialogKind === "payment"} onClose={close} />
          {dialogKind === "edit" ? <EditContractDialog contract={record.contract} onClose={close} /> : null}
          <CancelContractDialog contract={record.contract} open={dialogKind === "cancel"} onClose={close} />
        </>
      )}
    </ContractPageFrame>
  );
}
