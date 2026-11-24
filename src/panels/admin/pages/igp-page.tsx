"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Ban, Check, Crown, FileSignature, FileText, Gift, History, Info, KeyRound, Landmark, Plus, Receipt, ReceiptText, RefreshCw, ScrollText, ShieldAlert, Wrench, type LucideIcon } from "lucide-react";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { useOperation, usePayments } from "@/data/business-queries";
import type { IgpSaleView } from "@/data/contracts/igp-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { useIgpAction, useIgpRegister } from "@/data/igp-queries";
import { useEffectiveModuleIds } from "@/data/queries";
import { IGP_DOCUMENT_LABELS, IGP_BUYER_NO_POINTS_COPY } from "@/modules/igp/rules";
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

/** A different icon for each document action, so the checklist buttons are distinguishable at a glance. */
const DOCUMENT_ICONS: Record<IgpDocumentKey, LucideIcon> = {
  reservation: FileText,
  cts: ScrollText,
  goodwill_grant: Gift,
  deed: Landmark,
  formal_grant: Crown,
  lease: KeyRound,
  spa: FileSignature,
};

type IgpDialog = "reissue" | "correct" | "cancel" | "default" | "document" | "receipt";

/** Dialogs opened from the page heading buttons; the Sales area page owns their open state. */
export type IgpHeaderDialog = "record" | "accredit" | "threshold" | "grant-tiers";

function statusLabel(sale: IgpSaleView): string {
  return sale.defaultReviewDue ? "Due for stopped-paying review" : sale.status === "approved" && sale.closedDealDate ? "Confirmed Sale" : STATUS_LABELS[sale.status];
}

function SaleStatusBadge({ sale }: { sale: IgpSaleView }) {
  const status = sale.defaultReviewDue ? "on_hold" : sale.status === "approved" && sale.closedDealDate ? "confirmed" : sale.status;
  return <BizBadge status={status} label={statusLabel(sale)} />;
}

const REGISTER_COLUMNS: ColumnDef<IgpSaleView, unknown>[] = [
  { id: "seriesNumber", header: "Series Number", cell: ({ row }) => <span className="tw:font-semibold">{row.original.seriesNumber}</span> },
  { accessorKey: "buyerName", header: "Buyer" },
  { id: "project", header: "Project", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => displayValue(row.original.project) },
  { id: "price", header: "Contract Price", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => <SaleStatusBadge sale={row.original} /> },
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
  return <DetailActions header actions={[
    canEnter && { key: "record", label: "Record Sale", next: true, icon: Receipt, onClick: () => onOpen("record") },
    canManage && { key: "accredit", label: "Record Accreditation", variant: "teal", icon: BadgeCheck, onClick: () => onOpen("accredit") },
    canManage && register.accreditations.length > 0 && { key: "history", label: "Approval History", variant: "indigo", icon: History, onClick: onOpenHistory },
    canManage && { key: "threshold", label: "Sale Rules", variant: "info", icon: Info, onClick: () => onOpen("threshold") },
    canManage && { key: "grant", label: "Card Levels", variant: "violet", icon: Crown, onClick: () => onOpen("grant-tiers") },
  ]} />;
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
  const membership = sale ? register?.buyerMemberships.find(({ saleId }) => saleId === sale.id) : undefined;

  const footer = sale ? <DetailActions actions={[
    !closed && canManage && sale.status === "pending" && { key: "approve", label: "Approve Sale", next: true, variant: "success", icon: Check, onClick: () => confirmRun({
      title: "Approve Property Sale (IGP)?", description: "Finance can approve receipts after the sale is approved.", confirmText: "Approve Sale", tone: "success",
      action: () => action.mutateAsync({ type: "approve", id: sale.id }), successTitle: "Property sale (IGP) approved.", errorTitle: "Could not approve the property sale (IGP).",
    }) },
    !closed && canSubmit && { key: "receipt", label: "Enter Receipt", next: true, icon: ReceiptText, onClick: () => setDialog("receipt") },
    !closed && canEnter && !sale.stage1Date && (canManage || sale.collectedCentavos === 0) && { key: "correct", label: "Correct Sale", variant: "warning", icon: Wrench, onClick: () => setDialog("correct") },
    !closed && canManage && { key: "reissue", label: "Reissue Number", variant: "rose", icon: RefreshCw, onClick: () => setDialog("reissue") },
    sale.replacesId ? { key: "previous", label: "Previous Number", variant: "indigo", icon: ArrowLeft, onClick: () => setSelected(sale.replacesId) } : null,
    sale.replacedById ? { key: "replacement", label: "New Number", next: closed, variant: "violet", icon: Plus, onClick: () => setSelected(sale.replacedById) } : null,
    !closed && canManage && sale.defaultReviewDue && { key: "default", label: "Stopped Paying", variant: "burgundy", icon: ShieldAlert, onClick: () => setDialog("default") },
    !closed && canManage && { key: "cancel", label: "Cancel Sale", variant: "destructive", icon: Ban, onClick: () => setDialog("cancel") },
  ]} /> : undefined;

  return (
    <AdminPage anyOf={["sales", "finance"]} title="Property Sales" crumbs={[{ label: "Sales" }, { label: "Property Sales" }]} embedded>
      <QueryState isLoading={registerQuery.isLoading} error={registerQuery.error}>
        {register && <>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search property sales (IGP)" filters={[{ label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions }]} />
          <DataTable data={visibleSales} columns={REGISTER_COLUMNS} getRowId={({ id }) => id} caption="Property Sales" orderBy={IGP_SALE_ORDER}
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
            badge={sale ? <SaleStatusBadge sale={sale} /> : undefined}
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
                  ...(sale.grantTier !== undefined ? [{ label: "VIP Grant card level", value: sale.grantTier ?? "None (below the lowest price)" }] : []),
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
              ...(membership ? [{
                title: "IGP Buyer Membership",
                rows: [
                  { label: "Series Number", value: membership.seriesNumber },
                  { label: "Card level", value: membership.tier ?? "None (below the lowest price)" },
                  { label: "Grant signed", value: formatDate(membership.grantSignedDate) },
                  { label: "Status", value: "Recorded" },
                  { label: "Stay Points", value: `None. ${IGP_BUYER_NO_POINTS_COPY}` },
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
                layout: "list",
                rows: sale.documents.map(({ key, signedDate, signers }) => {
                  const { name, signedBy } = IGP_DOCUMENT_LABELS[key];
                  const DocumentIcon = DOCUMENT_ICONS[key];
                  return {
                    label: name,
                    value: signedDate ? `Signed ${formatDate(signedDate)} by ${signers}` : `Waiting for ${signedBy}`,
                      action: canEnter && !closed ? <Button variant={signedDate ? "warning" : "default"} size="sm" className="tw:min-h-11 tw:sm:min-h-8" aria-label={`${signedDate ? "Edit" : "Record"} Signature for ${name}`} onClick={() => { setDocument(key); setDialog("document"); }}><DocumentIcon aria-hidden="true" />{signedDate ? "Edit Signature" : "Record Signature"}</Button> : null,
                  };
                }),
              },
            ] : []}
            footer={footer} />
          {headerDialog === "record" && <IgpSaleDialog mode="record" register={register} onClose={onHeaderDialogClose} />}
          {(dialog === "correct" || dialog === "reissue") && sale && <IgpSaleDialog mode={dialog} register={register} sale={sale} onClose={close} />}
          {(headerDialog === "accredit" || headerDialog === "threshold" || headerDialog === "grant-tiers") && <IgpSettingsDialog mode={headerDialog} register={register} onClose={onHeaderDialogClose} />}
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
