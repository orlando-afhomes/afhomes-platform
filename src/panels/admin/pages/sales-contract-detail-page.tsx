"use client";

import { useState } from "react";
import { useContractAction, useOperation } from "@/data/business-queries";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { formatDate } from "@/shared/lib/format-date";
import { EditContractDialog, CancelContractDialog } from "../components/contract-dialogs";
import { ContractDetailTabs, type ContractDetailTab } from "../components/contract-detail-tabs";
import { ContractStatusCard, ContractSummaryCard } from "../components/contract-status-cards";
import { ContractHistorySection, ContractLedgerSection, ContractMilestonesSection, ContractPageFrame, ContractPaymentsSection, ContractScheduleSection, ContractTermsSection, ContractTiles } from "../components/contract-sections";
import { PaymentSubmitDialog } from "../components/payment-actions";
import { humanize } from "@/shared/lib/humanize";

const CRUMBS = [{ label: "Sales" }, { label: "Contracts", href: "/admin/sales/contracts" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Sales view of a contract: terms, schedule, submitted payments and the preparer's actions. */
export function SalesContractDetailPage({ contractId }: { contractId: string }) {
  const action = useContractAction();
  const { confirmRun, dialog } = useConfirmRun();
  const canPrepare = useOperation("contracts.prepare");
  const canSubmitPayment = useOperation("payments.submit");
  const [dialogKind, setDialogKind] = useState<"payment" | "edit" | "cancel" | null>(null);
  const [tab, setTab] = useState<ContractDetailTab>("overview");
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
          <ContractDetailTabs value={tab} onChange={setTab} />
          {tab === "overview" ? (
            <div className="tw:grid tw:gap-6 tw:lg:grid-cols-5">
              <div className="tw:min-w-0 tw:lg:col-span-3">
                <ContractTermsSection record={record} />
              </div>
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-6 tw:lg:col-span-2">
                <ContractStatusCard
                  finalized={formatDate(record.contract.finalizedAt)}
                  sale={record.contract.sale ? <BizBadge status={record.contract.sale.status} /> : "Not recorded yet"}
                  membership={
                    record.membership ? (
                      <span>
                        {humanize(record.membership.status)}
                        {record.membership.cardId ? ` · Card ${record.membership.cardId}` : ""}
                        {record.membership.financialHold ? " · Financial Hold" : ""}
                      </span>
                    ) : (
                      "Not created yet"
                    )
                  }
                />
                <ContractSummaryCard
                  priceCentavos={record.contract.priceCentavos}
                  verifiedCentavos={totalVerifiedCentavos(record.payments)}
                  outstandingCentavos={outstandingBalanceCentavos(record.contract, record.payments)}
                />
              </div>
            </div>
          ) : null}
          {tab === "schedule" ? <ContractScheduleSection record={record} /> : null}
          {tab === "payments" ? <ContractPaymentsSection record={record} /> : null}
          {tab === "history" ? (
            <div className="tw:flex tw:flex-col tw:gap-6">
              <ContractHistorySection contract={record.contract} />
              <ContractMilestonesSection record={record} />
              <ContractLedgerSection record={record} />
            </div>
          ) : null}
          <PaymentSubmitDialog contractId={record.contract.id} open={dialogKind === "payment"} onClose={close} />
          {dialogKind === "edit" ? <EditContractDialog contract={record.contract} onClose={close} /> : null}
          <CancelContractDialog contract={record.contract} open={dialogKind === "cancel"} onClose={close} />
        </>
      )}
    </ContractPageFrame>
  );
}
