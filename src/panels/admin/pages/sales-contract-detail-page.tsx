"use client";

import { useState } from "react";
import { useApproveDeal, useContractAction, useMarkSaleDefaulted, useOperation, useSales } from "@/data/business-queries";
import { canCorrectPayment } from "@/data/mock/scope";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Button } from "@/shared/ui/button";
import { outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { EMPTY } from "@/shared/lib/empty-value";
import { formatDate } from "@/shared/lib/format-date";
import { ApproveArrangementDialog, ApproveNonStandardDealDialog, CancelContractDialog, EditContractDialog, RequestCancellationDialog, ResolvePaymentCodeDialog, ReturnContractDialog, SendBackNonStandardDialog } from "../components/contract-dialogs";
import { ContractDetailTabs, type ContractDetailTab } from "../components/contract-detail-tabs";
import { actionButtonVariant, approveDealConfirm, buildContractMenuProps, canConfirmNonStandard, confirmNonStandardConfirm, needsNonStandardApproval, orderActionItems } from "../actions/sales-contract-actions";
import { ContractStatusCard, ContractSummaryCard } from "../components/contract-status-cards";
import { ContractCommissionRateNotice, ContractHistorySection, ContractLedgerSection, ContractMilestonesSection, ContractNonStandardSection, ContractPageFrame, ContractPaymentsSection, ContractScheduleSection, ContractTermsSection, ContractTiles } from "../components/contract-sections";
import { PaymentSubmitDialog, usePaymentActions, useUnmatchedReceiptActions } from "../components/payment-actions";
import { humanize } from "@/shared/lib/humanize";

const CRUMBS = [{ label: "Sales" }, { label: "Contracts", href: "/admin/sales?tab=contracts" }];
const BUTTON = "tw:min-h-11 tw:sm:min-h-8";

/** Contract terms, schedule, submitted payments, and actions allowed for the viewer. */
export function SalesContractDetailPage({ contractId }: { contractId: string }) {
  const action = useContractAction();
  const paymentActions = usePaymentActions();
  const unmatchedReceipts = useUnmatchedReceiptActions();
  const { identity } = useDevIdentity();
  const { confirmRun, dialog } = useConfirmRun();
  const canPrepare = useOperation("contracts.prepare");
  const canSubmitPayment = useOperation("payments.submit");
  const canApprove = useOperation("contracts.approve");
  const canApproveCustomer = useOperation("customers.approve");
  const canVerify = useOperation("finance.verify");
  const sales = useSales();
  const approveDeal = useApproveDeal();
  const markDefaulted = useMarkSaleDefaulted();
  const isSuperAdmin = identity.status === "active" && identity.roles.includes("super_admin");
  const [dialogKind, setDialogKind] = useState<"payment" | "edit" | "cancel" | "return" | "requestCancel" | "approveArrangement" | "resolvePaymentCode" | "approveNonStandard" | "sendBack" | null>(null);
  const [saleDefaultOpen, setSaleDefaultOpen] = useState(false);
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
        const sale = (sales.data ?? []).find((item) => item.contractId === contract.id) ?? null;
        const menu = buildContractMenuProps({ ...contract, saleView: sale }, {
          canPrepare,
          canApprove,
          canApproveCustomer,
          canSubmitPayment,
          isSuperAdmin,
          hasVerifiedMoney: moneyLocked,
          hasActiveMembership: membership?.status === "active",
          hasCard: membership?.cardId != null,
          canConfirmNonStandard: canConfirmNonStandard(contract, { id: identity.id, canVerify, isSuperAdmin }),
        }, {
          onSubmitPayment: () => setDialogKind("payment"),
          onSubmitContract: () => confirmRun({ title: "Submit This Contract?", description: "It will be sent to Admin review and a Pending sale will be recorded.", confirmText: "Submit This Contract", action: () => action.mutateAsync({ id: contract.id, action: "submit" }), successTitle: "Contract submitted.", errorTitle: "Action failed" }),
          onApproveDeal: () => needsNonStandardApproval(contract) ? setDialogKind("approveNonStandard") : confirmRun(approveDealConfirm(() => approveDeal.mutateAsync({ contractId: contract.id }))),
          onConfirmNonStandard: () => confirmRun(confirmNonStandardConfirm(() => action.mutateAsync({ id: contract.id, action: "confirmNonStandard" }))),
          onSendBackNonStandard: () => setDialogKind("sendBack"),
          onReturn: () => setDialogKind("return"),
          onRecordPaymentCode: () => setDialogKind("resolvePaymentCode"),
          onApproveArrangement: () => setDialogKind("approveArrangement"),
          onCancel: () => setDialogKind("cancel"),
          onRequestCancellation: () => setDialogKind("requestCancel"),
          onMarkDefaulted: sale ? () => setSaleDefaultOpen(true) : undefined,
        });
        const items = orderActionItems([
          ...menu.extraItems,
          ...(canPrepare && editable ? [{ key: "edit-details", label: "Edit Details", tone: "warning" as const, onClick: () => setDialogKind("edit") }] : []),
        ]);
        return (
          <>
            {items.map((item) => <Button key={item.key} variant={actionButtonVariant(item.tone)} className={BUTTON} onClick={item.onClick}>{item.label}</Button>)}
          </>
        );
      }}
    >
      {(record) => {
        const { contract } = record;
        const sale = (sales.data ?? []).find((item) => item.contractId === contract.id) ?? null;
        const inReview = contract.status === "submitted" || contract.status === "under_review";
        return (
          <>
            {dialog}
            <ReasonDialog open={saleDefaultOpen} title="Mark Sale as Stopped Paying" description={sale?.customerName ?? ""} confirmText="Mark as Stopped Paying" tone="warning" successText="Sale marked as Stopped Paying." onClose={() => setSaleDefaultOpen(false)} onSubmit={(reason) => sale ? markDefaulted.mutateAsync({ id: sale.id, reason }) : Promise.resolve()} />
          {record.contract.status === "returned" && record.contract.returnReason ? <InfoNote title="Returned for Correction">{record.contract.returnReason}</InfoNote> : null}
          {canApprove && inReview && contract.holds.length > 0 ? (
            <InfoNote title="Finalization Is on Hold">
              <ul className="tw:list-disc tw:pl-5">{contract.holds.map((hold) => <li key={hold}>{hold}</li>)}</ul>
            </InfoNote>
          ) : null}
          {canApprove && contract.cancellation?.status === "requested" ? <InfoNote title="Cancellation Awaiting Finance Confirmation">Finance confirms or declines this request.</InfoNote> : null}
          <ContractCommissionRateNotice {...record} />
          <ContractTiles contract={record.contract} payments={record.payments} />
          <ContractDetailTabs value={tab} onChange={setTab} />
          {tab === "overview" ? (
            <div className="tw:grid tw:grid-cols-1 tw:gap-6 tw:lg:grid-cols-5">
              <div className="tw:min-w-0 tw:lg:col-span-3">
                <ContractTermsSection record={record} />
              </div>
              <div className="tw:flex tw:min-w-0 tw:flex-col tw:gap-6 tw:lg:col-span-2">
                <ContractStatusCard
                  finalized={formatDate(record.contract.finalizedAt)}
                  sale={record.contract.sale ? <BizBadge status={record.contract.sale.status} /> : EMPTY}
                  membership={
                    record.membership ? (
                      <span>
                        {humanize(record.membership.status)}
                        {record.membership.cardId ? ` · Card ${record.membership.cardId}` : ""}
                        {record.membership.financialHold ? " · Payment Hold" : ""}
                      </span>
                    ) : (
                      EMPTY
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
          {tab === "overview" ? <ContractNonStandardSection contract={contract} /> : null}
          {tab === "schedule" ? <ContractScheduleSection record={record} /> : null}
          {tab === "payments" ? (
            <>
              {unmatchedReceipts.canRecord ? (
                <div className="tw:flex tw:justify-end">
                  <Button type="button" variant="outline" className={BUTTON} onClick={unmatchedReceipts.openIntake}>Record unmatched receipt</Button>
                </div>
              ) : null}
              <ContractPaymentsSection record={record} actions={canSubmitPayment ? {
                rowActions: (payment) => canCorrectPayment(identity, payment.submittedBy) ? paymentActions.rowActions(payment) : null,
              } : undefined} />
              {canSubmitPayment ? paymentActions.dialogs : null}
              {unmatchedReceipts.dialogs}
            </>
          ) : null}
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
          {dialogKind === "requestCancel" ? <RequestCancellationDialog contract={contract} onClose={close} /> : null}
          <ReturnContractDialog contract={contract} open={dialogKind === "return"} onClose={close} />
          <ApproveArrangementDialog contract={contract} open={dialogKind === "approveArrangement"} onClose={close} />
          <ResolvePaymentCodeDialog contract={contract} open={dialogKind === "resolvePaymentCode"} onClose={close} />
          <SendBackNonStandardDialog contract={contract} open={dialogKind === "sendBack"} onClose={close} />
          {dialogKind === "approveNonStandard" ? <ApproveNonStandardDealDialog contract={contract} onClose={close} /> : null}
          </>
        );
      }}
    </ContractPageFrame>
  );
}
