"use client";

import { CANCELLATION_GROUND_LABELS } from "@/modules/contracts/types";
import { formatDate } from "@/shared/lib/format-date";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { ContractLedgerSection, ContractMilestonesSection, ContractPageFrame, ContractPaymentsSection, ContractScheduleSection, ContractTiles } from "../components/contract-sections";
import { usePaymentActions } from "../components/payment-actions";

const CRUMBS = [{ label: "Finance" }, { label: "Collections", href: "/admin/finance?tab=collections" }];

/** Finance view of a contract's collection: balances, schedule, milestones, ledger and payment actions. No contract editing. */
export function FinanceCollectionDetailPage({ contractId }: { contractId: string }) {
  const paymentActions = usePaymentActions();
  return (
    <ContractPageFrame contractId={contractId} anyOf={["finance"]} parentCrumbs={CRUMBS} includePaymentReference>
      {(record) => {
        const { contract } = record;
        const pendingCancel = contract.cancellation?.status === "requested" ? contract.cancellation : null;
        return (
          <>
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
