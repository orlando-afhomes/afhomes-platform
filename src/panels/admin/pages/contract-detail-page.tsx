"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useContractAction, useContracts, useMemberships, useOperation, usePayments, useUpdateContract } from "@/data/business-queries";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { buildScheduleState, outstandingBalanceCentavos, totalVerifiedCentavos, netVerifiedCentavos } from "@/modules/finance/rules";
import type { ScheduleLineState } from "@/modules/finance/types";
import { CANCELLATION_GROUNDS, CANCELLATION_GROUND_LABELS, type ContractCancellationGround } from "@/modules/contracts/types";
import { manilaToday } from "@/shared/lib/dates";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { DetailList, DetailRow, InfoNote } from "@/shared/components/modern/detail-list";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { ModulePage } from "../components/module-page";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { formatDate } from "@/shared/lib/format-date";
import { PaymentSubmitDialog, usePaymentActions } from "../components/payment-actions";

const CRUMBS = [{ label: "Contracts" }];

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const contracts = useContracts();
  const payments = usePayments();
  const memberships = useMemberships();
  const action = useContractAction();
  const { confirmRun, dialog } = useConfirmRun();
  const paymentActions = usePaymentActions();
  const canApprove = useOperation("contracts.approve");
  const canPrepare = useOperation("contracts.prepare");
  const canSubmitPayment = useOperation("payments.submit");
  const canDecideCancel = useOperation("finance.refund");
  const { identity } = useDevIdentity();
  const [dialogKind, setDialogKind] = useState<"payment" | "edit" | "ra" | "return" | "cancel" | "requestCancel" | "confirmCancel" | "declineCancel" | null>(null);

  const contract = contracts.data?.find((item) => item.id === contractId);
  const contractPayments = useMemo(() => (payments.data ?? []).filter((item) => item.contractId === contractId), [payments.data, contractId]);
  const membership = memberships.data?.find((item) => item.contractId === contractId);
  const today = manilaToday();
  const schedule = useMemo(() => (contract ? buildScheduleState(contract, contractPayments, today) : []), [contract, contractPayments, today]);

  const paymentColumns = useMemo<ColumnDef<PaymentView, unknown>[]>(
    () => [
      { id: "date", header: "Receipt date", cell: ({ row }) => formatDate(row.original.paidDate) },
      { id: "purpose", header: "Purpose", cell: ({ row }) => row.original.purpose.replace(/_/g, " ") },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "net", header: "Counted", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={netVerifiedCentavos(row.original)} /> },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.adjustments.length > 0 ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.adjustments.length} adjustment(s)</span> : null}</div> },
      { id: "actions", header: () => <span className="tw:sr-only">Actions</span>, cell: ({ row }) => paymentActions.actions(row.original) },
    ],
    [paymentActions],
  );
  const scheduleColumns = useMemo<ColumnDef<ScheduleLineState, unknown>[]>(
    () => [
      { id: "label", header: "Installment", cell: ({ row }) => row.original.label },
      { id: "due", header: "Due", cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : "Date not set") },
      { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
      { id: "paid", header: "Paid", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.allocatedCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [],
  );

  if (contracts.isLoading) {
    return (
      <ModulePage anyOf={["vip-products", "sales", "finance"]} title="Contract" crumbs={CRUMBS}>
        <Skeleton className="tw:h-48 tw:w-full" />
      </ModulePage>
    );
  }
  if (!contract) {
    return (
      <ModulePage anyOf={["vip-products", "sales", "finance"]} title="Contract not found" crumbs={CRUMBS}>
        <InfoNote>This contract does not exist or is not visible to this account.</InfoNote>
      </ModulePage>
    );
  }

  const run = (kind: "submit" | "startReview" | "finalize", title: string, description: string, success: string) =>
    confirmRun({ title, description, confirmText: title.replace("?", ""), action: () => action.mutateAsync({ id: contract.id, action: kind }), successTitle: success, errorTitle: "Action failed" });

  const editable = contract.status === "draft" || contract.status === "returned";
  const inReview = contract.status === "submitted" || contract.status === "under_review";
  const verified = totalVerifiedCentavos(contractPayments);
  const balance = outstandingBalanceCentavos(contract, contractPayments);
  // Verified money or a Confirmed sale: cancellation is requested by Admin and confirmed by Finance, with forfeiture (OD-2).
  const moneyLocked = verified > 0 || contract.sale?.status === "confirmed";
  const cancellable = contract.status !== "cancelled" && membership?.status !== "active";
  const pendingCancel = contract.cancellation?.status === "requested" ? contract.cancellation : null;

  const buttons = (
    <>
      {canSubmitPayment && contract.status !== "cancelled" && contract.status !== "returned" ? <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("payment")}>Submit payment</Button> : null}
      {canPrepare && editable ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("edit")}>Edit details</Button> : null}
      {canPrepare && editable ? <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => run("submit", "Submit this contract?", "It will be sent to Admin review and a Pending sale will be recorded.", "Contract submitted.")}>Submit contract</Button> : null}
      {canApprove && contract.status === "submitted" ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => run("startReview", "Start review?", "The contract moves to Under Admin Review.", "Review started.")}>Start review</Button> : null}
      {canApprove && inReview ? <Button className="tw:min-h-11 tw:sm:min-h-8" disabled={contract.holds.length > 0} onClick={() => run("finalize", "Finalize this contract?", "The contract terms become fixed. A pending membership is created and verified payments may now confirm the sale.", "Contract finalized.")}>Finalize</Button> : null}
      {canApprove && inReview ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("return")}>Return for correction</Button> : null}
      {canApprove && contract.status === "finalized" && !membership?.cardId ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("ra")}>Record RA number</Button> : null}
      {(canApprove || (canPrepare && contract.status === "draft")) && cancellable && !moneyLocked ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("cancel")}>Cancel contract</Button> : null}
      {canApprove && cancellable && moneyLocked && !pendingCancel ? <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("requestCancel")}>Request cancellation</Button> : null}
      {canDecideCancel && pendingCancel && pendingCancel.requestedBy !== identity.id ? (
        <>
          <Button variant="destructive" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("confirmCancel")}>Confirm cancellation</Button>
          <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDialogKind("declineCancel")}>Decline cancellation</Button>
        </>
      ) : null}
    </>
  );

  return (
    <ModulePage anyOf={["vip-products", "sales", "finance"]} title={`Contract ${contract.id.toUpperCase()}`} description={`${contract.customerName} · ${contract.productCode} · ${contract.schemeLabel}`} crumbs={[{ label: "Contracts" }, { label: contract.id.toUpperCase() }]} actions={buttons}>
      {dialog}
      {paymentActions.dialogs}
      {inReview && contract.holds.length > 0 ? (
        <InfoNote title="Finalization is on hold">
          <ul className="tw:list-disc tw:pl-5">{contract.holds.map((hold) => <li key={hold}>{hold}</li>)}</ul>
        </InfoNote>
      ) : null}
      {contract.status === "returned" && contract.returnReason ? <InfoNote title="Returned for correction">{contract.returnReason}</InfoNote> : null}
      {pendingCancel ? (
        <InfoNote title="Cancellation awaiting Finance confirmation">
          {CANCELLATION_GROUND_LABELS[pendingCancel.ground]} · requested {formatDate(pendingCancel.requestedAt)} — {pendingCancel.reason}. Verified payments are forfeited if Finance confirms. The requester cannot decide it.
        </InfoNote>
      ) : null}
      {contract.cancellation?.status === "confirmed" ? (
        <InfoNote title="Cancelled with forfeiture">
          {CANCELLATION_GROUND_LABELS[contract.cancellation.ground]} · <Money value={contract.cancellation.forfeitedCentavos ?? 0} /> forfeited and kept on record.
        </InfoNote>
      ) : null}
      <StatTiles items={[{ label: "Contract price", value: <Money value={contract.priceCentavos} />, hint: contract.priceStatus === "conflict" ? "Source conflict" : "Snapshot at preparation" }, { label: "Verified payments", value: <Money value={verified} /> }, { label: "Outstanding balance", value: <Money value={balance} /> }, { label: "Status", value: <BizBadge status={contract.status} /> }]} />
      <Section title="Contract terms" description="Fixed snapshot. Later catalog changes never alter this contract.">
        <DetailList>
          <DetailRow term="Customer">{contract.customerName}</DetailRow>
          <DetailRow term="Seller">{contract.sellerName ?? "Company"}</DetailRow>
          <DetailRow term="Plan">{contract.productCode} · version {contract.productConfigVersion} · {contract.validityYears} years</DetailRow>
          <DetailRow term="Scheme">{contract.schemeLabel}{contract.paymentCode ? ` (${contract.paymentCode})` : ""}</DetailRow>
          <DetailRow term="Classification">{contract.classification === "S" ? "Standard (S)" : "Non-Standard (N)"}</DetailRow>
          <DetailRow term="Benefits">{contract.benefits.vipDiscountPercent}% VIP discount · {contract.benefits.lifetimePoints.toLocaleString("en-PH")} lifetime points · {contract.benefits.pointsPerCycle.toLocaleString("en-PH")} per cycle</DetailRow>
          <DetailRow term="RA number">{contract.raNumber ?? "Not recorded"}</DetailRow>
          <DetailRow term="Customer accepted">{contract.customerAccepted ? "Yes" : "No"}</DetailRow>
          <DetailRow term="Finalized">{formatDate(contract.finalizedAt)}</DetailRow>
          <DetailRow term="Sale">{contract.sale ? <BizBadge status={contract.sale.status} /> : "Not recorded yet"}</DetailRow>
          <DetailRow term="Membership">{membership ? <span>{membership.status}{membership.cardId ? ` · Card ${membership.cardId}` : ""}{membership.financialHold ? " · Financial Hold" : ""}</span> : "Not created yet"}</DetailRow>
        </DetailList>
      </Section>
      <Section title="Payment schedule" description="Verified money is applied to the schedule in order. No penalty or interest is ever added.">
        <DataTable data={schedule} columns={scheduleColumns} getRowId={(row) => String(row.seq)} emptyText="No schedule." caption="Payment schedule" pageSize={10} />
      </Section>
      <Section title="Payments">
        <DataTable data={contractPayments} columns={paymentColumns} getRowId={(row) => row.id} emptyText="No payments submitted yet." caption="Payments" />
      </Section>
      <Section title="History">
        <ol className="tw:flex tw:flex-col tw:gap-1 tw:text-sm">
          {contract.history.map((event, index) => (
            <li key={`${event.at}-${index}`}>{formatDate(event.at)} · {event.event.replace(/_/g, " ").toLowerCase()}{event.note ? ` — ${event.note}` : ""}</li>
          ))}
          {contract.history.length === 0 ? <li className="tw:text-muted-foreground">No events yet.</li> : null}
        </ol>
      </Section>
      <PaymentSubmitDialog contractId={contract.id} open={dialogKind === "payment"} onClose={() => setDialogKind(null)} />
      {dialogKind === "edit" ? <EditContractDialog contract={contract} onClose={() => setDialogKind(null)} /> : null}
      {dialogKind === "ra" ? <RaDialog contract={contract} onClose={() => setDialogKind(null)} /> : null}
      <ReasonDialog open={dialogKind === "return"} title="Return for correction" description="The preparer can correct the contract and submit it again." confirmText="Return" successText="Contract returned." onClose={() => setDialogKind(null)} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "return", reason })} />
      <ReasonDialog open={dialogKind === "cancel"} title="Cancel contract" description="The linked sale and membership are cancelled. This is recorded in the audit history." confirmText="Cancel contract" danger successText="Contract cancelled." onClose={() => setDialogKind(null)} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "cancel", reason })} />
      {dialogKind === "requestCancel" ? <RequestCancellationDialog contract={contract} onClose={() => setDialogKind(null)} /> : null}
      <ReasonDialog open={dialogKind === "confirmCancel"} title="Confirm cancellation with forfeiture" description="The contract, sale and pending membership are cancelled. Verified payments stay on record as forfeited, a Confirmed sale is reversed this month, and unpaid commissions go on hold." confirmText="Confirm cancellation" danger successText="Contract cancelled with forfeiture." onClose={() => setDialogKind(null)} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "confirm", reason })} />
      <ReasonDialog open={dialogKind === "declineCancel"} title="Decline cancellation" description="The contract stays as it is. The request and your reason are recorded in the audit history." confirmText="Decline" successText="Cancellation request declined." onClose={() => setDialogKind(null)} onSubmit={(reason) => action.mutateAsync({ id: contract.id, action: "decideCancel", decision: "decline", reason })} />
    </ModulePage>
  );
}

function EditContractDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  const update = useUpdateContract();
  const [dates, setDates] = useState<Record<number, string>>(() => Object.fromEntries(contract.schedule.map((line) => [line.seq, line.dueDate ?? ""])));
  const [accepted, setAccepted] = useState(contract.customerAccepted);
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await update.mutateAsync({ id: contract.id, input: { dueDates: dates, customerAccepted: accepted } });
      toast.success("Contract updated.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Edit contract details" description="Due dates come from Annex A of the signed contract." submitText="Save" pending={update.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      {contract.schedule.map((line) => (
        <StandardDateField key={line.seq} label={`${line.label} due date`} value={dates[line.seq] ?? ""} onChange={(value) => setDates((current) => ({ ...current, [line.seq]: value }))} />
      ))}
      <CheckboxField label="The customer has read and accepted the contract terms." checked={accepted} onChange={setAccepted} />
    </FormDialog>
  );
}

function RequestCancellationDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  const action = useContractAction();
  const [ground, setGround] = useState<ContractCancellationGround>("voluntary_withdrawal");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ id: contract.id, action: "requestCancel", ground, reason: reason.trim() });
      toast.success("Cancellation requested. Finance confirms or declines it.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Request cancellation" description="This contract has verified payments. Under the Reservation Agreement they are forfeited on cancellation. Finance must confirm the request." submitText="Request cancellation" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <SelectField label="Ground" required value={ground} options={CANCELLATION_GROUNDS.map((value) => ({ value, label: CANCELLATION_GROUND_LABELS[value] }))} onChange={setGround} />
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}

function RaDialog({ contract, onClose }: { contract: ContractView; onClose: () => void }) {
  const action = useContractAction();
  const [value, setValue] = useState(contract.raNumber ?? "");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    try {
      await action.mutateAsync({ id: contract.id, action: "ra", raNumber: value });
      toast.success("RA number recorded.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };
  return (
    <FormDialog open title="Record RA number" description="Copy the number from the signed Reservation Agreement. It is needed to issue the VIP Card ID." submitText="Record" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <TextField label="RA number" required value={value} onChange={setValue} hint="For example 2027-0001. The official numbering format is pending an owner decision." />
    </FormDialog>
  );
}
