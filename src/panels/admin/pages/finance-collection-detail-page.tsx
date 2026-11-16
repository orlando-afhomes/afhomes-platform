"use client";

import { useState } from "react";
import { useContractAction, useOperation } from "@/data/business-queries";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { canConfirmNonStandard, confirmNonStandardConfirm } from "../actions/sales-contract-actions";
import { SendBackNonStandardDialog } from "../components/contract-dialogs";
import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { formatDate } from "@/shared/lib/format-date";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { ContractLedgerSection, ContractMilestonesSection, ContractNonStandardSection, ContractPageFrame, ContractPaymentsSection, ContractScheduleSection, ContractTiles } from "../components/contract-sections";
import { usePaymentActions } from "../components/payment-actions";

const CRUMBS = [{ label: "Finance" }, { label: "Collections", href: "/admin/finance?tab=collections" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Finance view of a contract's collection: balances, schedule, milestones, ledger and payment actions. No contract editing. */
export function FinanceCollectionDetailPage({ contractId }: { contractId: string }) {
  const paymentActions = usePaymentActions();
  const action = useContractAction();
  const canVerify = useOperation("finance.verify");
  const { identity } = useDevIdentity();
  const { confirmRun, dialog } = useConfirmRun();
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  return (
    <ContractPageFrame
      contractId={contractId}
      anyOf={["finance"]}
      parentCrumbs={CRUMBS}
      includePaymentReference
      actions={({ contract }) =>
        // Doc 05 §10.2 step 2: Finance confirms or sends back the Non-Standard terms.
        canConfirmNonStandard(contract, { id: identity.id, canVerify, isSuperAdmin }) ? (
          <>
            <Button variant="success" className={BUTTON} onClick={() => confirmRun(confirmNonStandardConfirm(() => action.mutateAsync({ id: contract.id, action: "confirmNonStandard" })))}>Confirm Non-Standard Terms</Button>
            <Button variant="warning" className={BUTTON} onClick={() => setSendBackOpen(true)}>Send Back</Button>
          </>
        ) : null
      }
    >
      {(record) => {
        const { contract } = record;
        const pendingCancel = contract.cancellation?.status === "requested" ? contract.cancellation : null;
        return (
          <>
            {dialog}
            <SendBackNonStandardDialog contract={contract} open={sendBackOpen} onClose={() => setSendBackOpen(false)} />
            {paymentActions.dialogs}
            {pendingCancel ? (
              <InfoNote title="Cancellation Awaiting Finance Confirmation">
                {CANCELLATION_GROUND_LABELS[pendingCancel.ground]} · requested {formatDate(pendingCancel.requestedAt)} — {pendingCancel.reason}. Decide it in Cancellations.
              </InfoNote>
            ) : null}
            {contract.cancellation?.status === "confirmed" ? (
              <InfoNote title="Cancelled, Payments Kept">
                {CANCELLATION_GROUND_LABELS[contract.cancellation.ground]} · <Money value={contract.cancellation.forfeitedCentavos ?? 0} /> kept by the company and recorded.
              </InfoNote>
            ) : null}
            <ContractTiles contract={contract} payments={record.payments} />
            <ContractNonStandardSection contract={contract} />
            <ContractScheduleSection record={record} />
            <ContractMilestonesSection record={record} />
            <ContractLedgerSection record={record} />
            <ContractPaymentsSection record={record} actions={paymentActions} />
          </>
        );
      }}
    </ContractPageFrame>
  );
}
