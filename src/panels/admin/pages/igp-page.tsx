"use client";

import { useMemo, useState } from "react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { useOperation, usePayments } from "@/data/business-queries";
import type { IgpSaleView } from "@/data/contracts/igp-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { useIgpAction, useIgpRegister } from "@/data/igp-queries";
import { useEffectiveModuleIds } from "@/data/queries";
import { IGP_DOCUMENT_LABELS } from "@/modules/igp/rules";
import type { IgpDocumentKey, IgpStatus } from "@/modules/igp/types";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { Button } from "@/shared/ui/button";
import { IgpRecordDetailDialog, IgpSaleDialog, IgpSettingsDialog } from "../components/igp-dialogs";
import { PaymentSubmitDialog, usePaymentActions } from "../components/payment-actions";

const STATUS_LABELS: Record<IgpStatus, string> = {
  pending: "Pending approval", approved: "Approved", defaulted: "Defaulted",
  cancelled: "Cancelled", replaced: "Replaced", pending_review: "Pending review",
};

type IgpDialog = "record" | "reissue" | "correct" | "accredit" | "threshold" | "cancel" | "default" | "document" | "receipt";

const REGISTER_COLUMNS: ColumnDef<IgpSaleView, unknown>[] = [
  { accessorKey: "seriesNumber", header: "Series Number" },
  { accessorKey: "buyerName", header: "Buyer" },
  { id: "property", header: "Property", cell: ({ row }) => `${row.original.project} · ${row.original.unit}` },
  { id: "price", header: "Contract price", cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
  { id: "collected", header: "Approved collections", cell: ({ row }) => <Money value={row.original.collectedCentavos} /> },
  { id: "status", header: "Status", cell: ({ row: { original } }) =>
    original.defaultReviewDue ? "Due for default review" : original.status === "approved" && original.closedDealDate ? "Closed Deal" : STATUS_LABELS[original.status] },
];

export function IgpPage() {
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
  const sale =register?.sales.find(({ id }) => id === selected);
  const closed = sale?.status === "cancelled" || sale?.status === "replaced" || sale?.status === "pending_review";
  const close = () => setDialog(null);

  const columns: ColumnDef<IgpSaleView, unknown>[] = [...REGISTER_COLUMNS, {
    id: "open", header: "Actions", cell: ({ row }) => (
      <Button variant="outline" size="sm" aria-label={`View ${row.original.seriesNumber}`} onClick={() => setSelected(row.original.id)}>View</Button>
    ),
  }];
  const receiptColumns: ColumnDef<PaymentView, unknown>[] = [
    { id: "reference", header: "Receipt", cell: ({ row }) => <Button variant="link" className="tw:p-0" onClick={() => paymentActions.open(row.original)}>{row.original.referenceNo ?? "View receipt"}</Button> },
    { accessorKey: "paidDate", header: "Receipt date" },
    { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
    { id: "status", header: "Status", cell: ({ row }) => row.original.status === "verified" ? "Approved" : row.original.status.replaceAll("_", " ") },
    { id: "actions", header: "Actions", cell: ({ row }) => paymentActions.rowActions(row.original) },
  ];

  return (
    <AdminPage anyOf={["sales", "finance"]} title="IGP Sales" description="Track AFhomes-channel property sales, approved receipts, and signed documents."
      crumbs={[{ label: "Sales" }, { label: "IGP Sales" }]}
      actions={register && <>
        {canManage && <Button variant="outline" onClick={() => setDialog("accredit")}>Record JA&D accreditation</Button>}
        {canManage && <Button variant="outline" onClick={() => setDialog("threshold")}>Change threshold</Button>}
        {canEnter && <Button onClick={() => setDialog("record")}>Record sale</Button>}
      </>}>
      <QueryState isLoading={registerQuery.isLoading} error={registerQuery.error}>
        {register && <>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search IGP sales" filters={[{ label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: statusOptions }]} />
          <DataTable data={visibleSales} columns={columns} getRowId={({ id }) => id} caption="IGP Sales" emptyText={register.sales.length === 0 ? "No IGP sales are available." : "No IGP sales match the filters."} />
          {canManage && register.accreditations.length > 0 && <section aria-label="JA&D accreditation history">
            <h2 className="tw:mb-2 tw:text-base tw:font-semibold">JA&D accreditation history</h2>
            <DataTable caption="JA&D accreditation history" emptyText="No JA&D accreditation recorded." data={register.accreditations} getRowId={({ number }) => number} columns={[
              { id: "seller", header: "Seller", cell: ({ row }) => register.sellers.find(({ value }) => value === row.original.memberId)?.label ?? "Former seller" },
              { accessorKey: "number", header: "JA&D number" },
              { accessorKey: "approvedDate", header: "Approved date" },
              { accessorKey: "validUntil", header: "Valid until" },
              { accessorKey: "replaces", header: "Replaces" },
            ]} />
          </section>}
          {sale && <section aria-label="Selected IGP sale" className="tw:space-y-4 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4">
            <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3">
              <div>
                <h2 className="tw:text-base tw:font-semibold">{sale.seriesNumber}</h2>
                <p className="tw:text-sm tw:text-muted-foreground">{sale.buyerName} · {sale.project} · {sale.unit} · {STATUS_LABELS[sale.status]}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close details</Button>
            </div>
            <dl className="tw:grid tw:grid-cols-1 tw:gap-3 tw:text-sm tw:sm:grid-cols-2 tw:lg:grid-cols-3">
              {[
                ["Property owner", sale.propertyOwner],
                ["Closing seller reference", `${sale.seriesNumber} - ${sale.sellerJadNumber}`],
                ["Referrer", sale.referrerName ?? (sale.referrerMemberId ? "Recorded" : "None")],
                ["Closed Deal", sale.closedDealDate ?? `At ${sale.thresholdBp / 100}% approved`],
                ["Stage 1", sale.stage1Date ?? "At 40% approved"],
                ["Full payment", sale.fullPaymentDate ?? "At 100% approved"],
              ].map(([label, value]) => <div key={label}><dt className="tw:text-muted-foreground">{label}</dt><dd className="tw:break-words tw:font-medium">{value}</dd></div>)}
            </dl>
            {(sale.replacesId || sale.replacedById) && <div className="tw:flex tw:flex-wrap tw:gap-2">
              {sale.replacesId && <Button variant="outline" size="sm" onClick={() => setSelected(sale.replacesId)}>View previous number</Button>}
              {sale.replacedById && <Button variant="outline" size="sm" onClick={() => setSelected(sale.replacedById)}>View replacement number</Button>}
            </div>}
            {sale.refund && <p className="tw:text-sm">Recorded refund <Money value={sale.refund.amountCentavos} /> {sale.refund.date ?? ""}</p>}
            {sale.expiryReminders.map(({ party, validUntil }) => <InfoNote key={party} title={`${party} JA&D accreditation expired`}>Valid until {validUntil}. Remind the seller to renew with JA&D.</InfoNote>)}
            {sale.commissionReviewReason && <InfoNote title="Commission needs review">{sale.commissionReviewReason}</InfoNote>}
            {!closed && <div className="tw:flex tw:flex-wrap tw:gap-2">
              {canManage && sale.status === "pending" && <Button onClick={() => confirmRun({
                title: "Approve IGP sale?", description: "Finance can approve receipts after the sale is approved.", confirmText: "Approve sale",
                action: () => action.mutateAsync({ type: "approve", id: sale.id }), successTitle: "IGP sale approved.", errorTitle: "Could not approve the IGP sale.",
              })}>Approve sale</Button>}
              {canSubmit && <Button variant="outline" onClick={() => setDialog("receipt")}>Enter receipt</Button>}
              {canEnter && !sale.stage1Date && (canManage || sale.collectedCentavos === 0) && <Button variant="outline" onClick={() => setDialog("correct")}>Correct sale</Button>}
              {canManage && <Button variant="outline" onClick={() => setDialog("reissue")}>Reissue number</Button>}
              {canManage && sale.defaultReviewDue && <Button variant="outline" onClick={() => setDialog("default")}>Mark defaulted</Button>}
              {canManage && <Button variant="outline" onClick={() => setDialog("cancel")}>Cancel sale</Button>}
            </div>}
            <section aria-label="Receipts">
              <h3 className="tw:mb-2 tw:text-sm tw:font-semibold">Receipts</h3>
              <QueryState isLoading={paymentQuery.isLoading} error={paymentQuery.error}>
                <DataTable caption="IGP receipts" data={(paymentQuery.data ?? []).filter(({ contractId }) => contractId === sale.id)} columns={receiptColumns} getRowId={({ id }) => id} emptyText="No receipts are linked to this Series Number." />
              </QueryState>
            </section>
            <section aria-label="Document checklist" className="tw:space-y-2">
              <h3 className="tw:text-sm tw:font-semibold">Document checklist</h3>
              {sale.documents.map(({ key, signedDate, signers }) => {
                const { name, signedBy } = IGP_DOCUMENT_LABELS[key];
                return <div key={key} className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-b tw:border-border tw:py-2 tw:text-sm">
                  <div><p className="tw:font-medium">{name}</p><p className="tw:text-muted-foreground">{signedDate ? `Signed ${signedDate} · ${signers}` : `Pending · ${signedBy}`}</p></div>
                  {canEnter && !closed && <Button variant="outline" size="sm" onClick={() => { setDocument(key); setDialog("document"); }}>{signedDate ? "Edit signature" : "Record signature"}</Button>}
                </div>;
              })}
            </section>
          </section>}
          {(dialog === "record" || ((dialog === "correct" || dialog === "reissue") && sale)) &&
            <IgpSaleDialog mode={dialog} register={register} sale={dialog === "record" ? undefined : sale} onClose={close} />}
          {(dialog === "accredit" || dialog === "threshold") && <IgpSettingsDialog mode={dialog} register={register} onClose={close} />}
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
