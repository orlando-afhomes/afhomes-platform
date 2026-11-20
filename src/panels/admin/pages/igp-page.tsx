"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { useOperation, usePayments } from "@/data/business-queries";
import type { IgpSaleView } from "@/data/contracts/igp-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { useIgpAction, useIgpRegister } from "@/data/igp-queries";
import { useEffectiveModuleIds } from "@/data/queries";
import { IGP_DOCUMENT_LABELS } from "@/modules/igp/rules";
import type { IgpDocumentKey, IgpStatus } from "@/modules/igp/types";
import { AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { EMPTY, displayValue } from "@/shared/lib/empty-value";
import { formatDate } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";
import { IgpRecordDetailDialog, IgpSaleDialog, IgpSettingsDialog } from "../components/igp-dialogs";
import { PaymentSubmitDialog, usePaymentActions } from "../components/payment-actions";

const STATUS_LABELS: Record<IgpStatus, string> = {
  pending: "Pending approval", approved: "Approved", defaulted: "Stopped Paying",
  cancelled: "Cancelled", replaced: "Replaced", pending_review: "Pending review",
};

type IgpDialog = "reissue" | "correct" | "cancel" | "default" | "document" | "receipt";

/** Dialogs opened from the page heading buttons; the Sales area page owns their open state. */
export type IgpHeaderDialog = "record" | "accredit" | "threshold";

function statusLabel(sale: IgpSaleView): string {
  return sale.defaultReviewDue ? "Due for stopped-paying review" : sale.status === "approved" && sale.closedDealDate ? "Confirmed Sale" : STATUS_LABELS[sale.status];
}

const REGISTER_COLUMNS: ColumnDef<IgpSaleView, unknown>[] = [
  { id: "seriesNumber", header: "Series Number", cell: ({ row }) => <span className="tw:font-semibold">{row.original.seriesNumber}</span> },
  { accessorKey: "buyerName", header: "Buyer" },
  { id: "project", header: "Project", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => displayValue(row.original.project) },
  { id: "price", header: "Contract Price", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => statusLabel(row.original) },
];

/** Heading buttons of the IGP tab (Sales area). Same permissions as before; the area page opens the dialogs. */
/** Newest IGP sale first; sales under review rise ahead on the same date. */
const IGP_SALE_ORDER: TableOrder<IgpSaleView> = {
  date: (row) => row.date,
  attention: (row) => (row.status === "pending_review" ? 2 : 0),
};

export function IgpActions({ onOpen, onOpenHistory }: { onOpen: (dialog: IgpHeaderDialog) => void; onOpenHistory: () => void }) {
  const modules = useEffectiveModuleIds();
  const canEnter = useOperation("igp.enter");
  const canManage = useOperation("igp.manage");
  const register = useIgpRegister(modules.has("sales") || modules.has("finance")).data;
  if (!register) return null;
  return <>
    {canEnter && <Button onClick={() => onOpen("record")}>Record Sale</Button>}
    {canManage && <Button variant="info" onClick={() => onOpen("accredit")}>Record JA&D Accreditation</Button>}
    {canManage && <Button variant="warning" onClick={() => onOpen("threshold")}>When a Sale Counts</Button>}
    {canManage && register.accreditations.length > 0 && <Button variant="outline" onClick={onOpenHistory}>JA&D Approval History</Button>}
  </>;
}

export function IgpTab({ headerDialog, onHeaderDialogClose, historyOpen, onHistoryClose }: {
  headerDialog: IgpHeaderDialog | null; onHeaderDialogClose: () => void; historyOpen: boolean; onHistoryClose: () => void;
}) {
  const modules = useEffectiveModuleIds();
  const canEnter = useOperation("igp.enter");
  const canManage = useOperation("igp.manage");
  const canSubmit = useOperation("payments.submit");
  const registerQuery = useIgpRegister(modules.has("sales") || modules.has("finance"));
  const paymentQuery = usePayments();
  const paymentActions = usePaymentActions();
  const { confirmRun, dialog: confirmation } = useConfirmRun();
  const action = useIgpAction();
  const [selected, setSelected] = useState<string | null>(null);
  const [dialog, setDialog] = useState<IgpDialog | null>(null);
  const [document, setDocument] = useState<IgpDocumentKey>();
  const register = registerQuery.data;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const visibleSales = useMemo(
    () => (register?.sales ?? []).filter((item) => (statusFilter === "all" || item.status === statusFilter) && matchesSearch(search, item.seriesNumber, item.buyerName, item.project, item.unit)),
    [register, search, statusFilter],
  );
  const statusOptions = [{ value: "all", label: "All statuses" }, ...(Object.keys(STATUS_LABELS) as IgpStatus[]).map((value) => ({ value, label: STATUS_LABELS[value] }))];
  const sale = register?.sales.find(({ id }) => id === selected);
  const closed = sale?.status === "cancelled" || sale?.status === "replaced" || sale?.status === "pending_review";
  const close = () => setDialog(null);
  const receipts = sale ? (paymentQuery.data ?? []).filter(({ contractId }) => contractId === sale.id) : [];
  const sellerAccreditations = canManage && sale ? (register?.accreditations ?? []).filter(({ memberId }) => memberId === sale.sellerMemberId) : [];
  const sellerName = (memberId: string) => register?.sellers.find(({ value }) => value === memberId)?.label ?? "Former seller";

  const saleActions = sale && !closed ? <>
    {canManage && sale.status === "pending" && <Button variant="success" onClick={() => confirmRun({
      title: "Approve Property Sale (IGP)?", description: "Finance can approve receipts after the sale is approved.", confirmText: "Approve Sale", tone: "success",
      action: () => action.mutateAsync({ type: "approve", id: sale.id }), successTitle: "Property sale (IGP) approved.", errorTitle: "Could not approve the property sale (IGP).",
    })}>Approve Sale</Button>}
    {canSubmit && <Button onClick={() => setDialog("receipt")}>Enter Receipt</Button>}
    {canEnter && !sale.stage1Date && (canManage || sale.collectedCentavos === 0) && <Button variant="warning" onClick={() => setDialog("correct")}>Correct Sale</Button>}
    {canManage && <Button variant="warning" onClick={() => setDialog("reissue")}>Reissue Number</Button>}
    {canManage && sale.defaultReviewDue && <Button variant="destructive" onClick={() => setDialog("default")}>Mark as Stopped Paying</Button>}
    {canManage && <Button variant="destructive" onClick={() => setDialog("cancel")}>Cancel Sale</Button>}
  </> : null;
  const linkActions = sale && (sale.replacesId || sale.replacedById) ? <>
    {sale.replacesId && <Button variant="info" onClick={() => setSelected(sale.replacesId)}>View Previous Number</Button>}
    {sale.replacedById && <Button variant="info" onClick={() => setSelected(sale.replacedById)}>View Replacement Number</Button>}
  </> : null;

  return (
    <AdminPage anyOf={["sales", "finance"]} title="Property Sales (IGP)" crumbs={[{ label: "Sales" }, { label: "Property Sales (IGP)" }]} embedded>
      <QueryState isLoading={registerQuery.isLoading} error={registerQuery.error}>
        {register && <>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search property sales (IGP)" filters={[{ label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions }]} />
          <DataTable data={visibleSales} columns={REGISTER_COLUMNS} getRowId={({ id }) => id} caption="Property Sales (IGP)" orderBy={IGP_SALE_ORDER}
            emptyText={register.sales.length === 0 ? "No property sales (IGP) are available." : "No property sales (IGP) match the filters."}
            onRowOpen={(row) => setSelected(row.id)}
            getRowLabel={(row) => `Open property sale (IGP) ${row.seriesNumber}`} />
          {canManage && <RecordDetailsSheet open={historyOpen} onClose={onHistoryClose} title="JA&D Accreditation History"
            sections={register.accreditations.map((item) => ({
              title: item.number,
              rows: [
                { label: "Seller", value: sellerName(item.memberId) },
                { label: "Approved", value: formatDate(item.approvedDate) },
                { label: "Valid until", value: formatDate(item.validUntil) },
                { label: "Replaces", value: item.replaces },
              ],
            }))} />}
          <RecordDetailsSheet open={sale !== undefined} onClose={() => setSelected(null)} size="lg"
            title={sale?.seriesNumber ?? "Property sale (IGP)"}
            subtitle={sale?.buyerName}
            badge={sale ? statusLabel(sale) : undefined}
            sections={sale ? [
              {
                title: "Sale",
                rows: [
                  { label: "Project", value: sale.project },
                  { label: "Unit or lot", value: sale.unit },
                  { label: "Property owner", value: sale.propertyOwner },
                  { label: "Contract price", value: <Money value={sale.priceCentavos} /> },
                  { label: "Approved collections", value: <Money value={sale.collectedCentavos} /> },
                  { label: "Closing seller reference", value: `${sale.seriesNumber} - ${sale.sellerJadNumber}` },
                  { label: "Referrer", value: sale.referrerName ?? (sale.referrerMemberId ? "Recorded" : EMPTY) },
                  { label: "Confirmed Sale", value: sale.closedDealDate ? formatDate(sale.closedDealDate) : `At ${sale.thresholdBp / 100}% approved` },
                  { label: "Stage 1", value: sale.stage1Date ? formatDate(sale.stage1Date) : "At 40% approved" },
                  { label: "Full payment", value: sale.fullPaymentDate ? formatDate(sale.fullPaymentDate) : "At 100% approved" },
                  ...(sale.refund ? [{ label: "Refund", value: <><Money value={sale.refund.amountCentavos} />{sale.refund.date ? ` on ${formatDate(sale.refund.date)}` : ""}</> }] : []),
                ],
              },
              ...(sale.expiryReminders.length > 0 || sale.commissionReviewReason ? [{
                title: "Needs Attention",
                rows: [
                  ...sale.expiryReminders.map(({ party, validUntil }) => ({ label: `${party} JA&D accreditation`, value: `Expired ${formatDate(validUntil)}. Remind the seller to renew with JA&D.` })),
                  ...(sale.commissionReviewReason ? [{ label: "Commission needs review", value: sale.commissionReviewReason }] : []),
                ],
              }] : []),
              ...(sellerAccreditations.length > 0 ? [{
                title: "JA&D Accreditation History",
                rows: sellerAccreditations.map((item) => ({
                  label: item.number,
                  value: `Approved ${formatDate(item.approvedDate)} · Valid until ${formatDate(item.validUntil)}${item.replaces ? ` · Replaces ${item.replaces}` : ""}`,
                })),
              }] : []),
              {
                title: "Receipts",
                rows: paymentQuery.isLoading ? [{ label: "Receipts", value: "Loading receipts…" }]
                  : paymentQuery.error ? [{ label: "Receipts", value: "Receipts could not be loaded." }]
                  : receipts.length === 0 ? [{ label: "Receipts", value: "No receipts are linked to this Series Number." }]
                  : receipts.map((receipt) => ({
                    label: formatDate(receipt.paidDate),
                    value: <span className="tw:flex tw:flex-wrap tw:items-center tw:gap-2">
                      <Button variant="link" className="tw:h-auto tw:p-0" onClick={() => paymentActions.open(receipt)}>{receipt.referenceNo ?? "View receipt"}</Button>
                      <Money value={receipt.amountCentavos} />
                      <BizBadge status={receipt.status} label={receipt.status === "verified" ? "Approved" : undefined} />
                      {paymentActions.rowActions(receipt)}
                    </span>,
                  })),
              },
              {
                title: "Document Checklist",
                rows: sale.documents.map(({ key, signedDate, signers }) => {
                  const { name, signedBy } = IGP_DOCUMENT_LABELS[key];
                  return {
                    label: name,
                    value: <span className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
                      <span>{signedDate ? `Signed ${formatDate(signedDate)} by ${signers}` : `Waiting for ${signedBy}`}</span>
                      {canEnter && !closed && <Button variant="outline" size="sm" onClick={() => { setDocument(key); setDialog("document"); }}>{signedDate ? "Edit Signature" : "Record Signature"}</Button>}
                    </span>,
                  };
                }),
              },
            ] : []}
            footer={saleActions || linkActions ? <div className="tw:flex tw:flex-wrap tw:gap-2">{saleActions}{linkActions}</div> : undefined} />
          {headerDialog === "record" && <IgpSaleDialog mode="record" register={register} onClose={onHeaderDialogClose} />}
          {(dialog === "correct" || dialog === "reissue") && sale && <IgpSaleDialog mode={dialog} register={register} sale={sale} onClose={close} />}
          {(headerDialog === "accredit" || headerDialog === "threshold") && <IgpSettingsDialog mode={headerDialog} register={register} onClose={onHeaderDialogClose} />}
          {sale && (dialog === "cancel" || dialog === "default" || dialog === "document") &&
            <IgpRecordDetailDialog sale={sale} mode={dialog} documentKey={document} onClose={close} />}
          {sale && dialog === "receipt" && <PaymentSubmitDialog contractId={sale.id} open onClose={close} />}
        </>}
      </QueryState>
      {paymentActions.dialogs}
      {confirmation}
    </AdminPage>
  );
}
