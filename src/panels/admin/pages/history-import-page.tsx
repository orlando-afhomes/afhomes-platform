"use client";

import { useMemo, useState } from "react";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { useOperation, usePayments } from "@/data/business-queries";
import { useReceiptImportAction, useReceiptImportBatches } from "@/data/reconciliation-queries";
import { buildReceiptImportRows, importedReceiptStatusLabel, RECEIPT_IMPORT_COLUMNS, rowsToReceiptRecords, type ReceiptImportBatch, type ReceiptImportRecord, type ReceiptImportRow } from "@/modules/imports/receipt-import";
import { AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, TextAreaField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { downloadCsv, readSpreadsheet, SPREADSHEET_ACCEPT } from "@/shared/lib/spreadsheet";
import { formatPeso } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { TemplateStep, UploadDropzone } from "../components/customer-import-steps";

const SHEET_NAME = "Receipts";

const BATCH_BADGE: Record<ReceiptImportBatch["status"], string> = { pending_signoff: "pending", signed_off: "approved", rejected: "rejected" };

const ROW_COLUMNS: ColumnDef<ReceiptImportRow, unknown>[] = [
  { id: "row", header: "Row", cell: ({ row }) => row.original.rowNumber },
  { id: "reference", header: "Receipt", cell: ({ row }) => <span className="tw:font-semibold">{row.original.receipt?.referenceNo ?? "-"}</span> },
  { id: "amount", header: "Amount", cell: ({ row }) => (row.original.receipt ? <Money value={row.original.receipt.amountCentavos} /> : "-") },
  { id: "status", header: "Result", cell: ({ row }) => <BizBadge status={row.original.status === "ready" ? "verified" : "rejected"} label={row.original.status === "ready" ? "Ready" : "Invalid"} /> },
  { id: "issues", header: "Issues", cell: ({ row }) => (row.original.errors.length === 0 ? <span className="tw:text-muted-foreground">None</span> : <ul className="tw:space-y-0.5 tw:text-xs">{row.original.errors.map((message) => <li key={message} className="tw:text-destructive">{message}</li>)}</ul>) },
];

/** F11.5: bring unfinished-sale receipt history in as a batch. Counts only after an Administrator signs the batch off. */
export function HistoryImportPage() {
  const canManage = useOperation("history-import.manage");
  const [tab, setTab] = useState("import");
  const batches = useReceiptImportBatches(canManage);
  return (
    <AdminPage anyOf={["reports"]} title="Historical Import" description="Import receipts of unfinished sales from the workbook. They count as Approved (imported) after an Administrator signs off the batch." crumbs={[{ label: "Reports" }, { label: "Historical Import" }]}>
      {canManage ? (
        <>
          <InfoNote title="What this import does not do">It does not issue VIP Numbers, create or pay commissions, or change any live payment. Finished sales stay in the Excel archives and are not imported.</InfoNote>
          <TabBar label="Historical import" value={tab} onChange={setTab} tabs={[{ value: "import", label: "New import" }, { value: "batches", label: "Batches", count: batches.data?.length ?? 0 }]} />
          {tab === "import" ? <ImportPanel onImported={() => setTab("batches")} /> : <BatchesPanel batches={batches.data ?? []} isLoading={batches.isLoading} error={batches.error} />}
        </>
      ) : (
        <InfoNote title="Access restricted">Historical import is limited to the Administrator and the Super Administrator.</InfoNote>
      )}
    </AdminPage>
  );
}

function ImportPanel({ onImported }: { onImported: () => void }) {
  const payments = usePayments();
  const batches = useReceiptImportBatches(true);
  const action = useReceiptImportAction();
  const [preview, setPreview] = useState<{ fileName: string; records: ReceiptImportRecord[] } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [declaration, setDeclaration] = useState(false);

  const rows = useMemo(
    () => (preview ? buildReceiptImportRows(preview.records, { payments: payments.data ?? [], batches: batches.data ?? [], today: manilaToday() }) : []),
    [preview, payments.data, batches.data],
  );
  const ready = rows.filter((row) => row.status === "ready").length;

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setFileError(null);
    setDeclaration(false);
    if (!file) return;
    setReading(true);
    try {
      setPreview({ fileName: file.name, records: rowsToReceiptRecords(await readSpreadsheet(file, SHEET_NAME)) });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "The file could not be read.");
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    try {
      const batch = await action.mutateAsync({ action: "create", fileName: preview.fileName, records: preview.records, declaration });
      if ("receipts" in batch) toast.success(`Batch ${batch.id} created with ${batch.receipts.length} receipt(s). It awaits an Administrator sign-off.`);
      setPreview(null);
      setDeclaration(false);
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The import failed.");
    }
  };

  return (
    <>
      <TemplateStep
        step={1}
        title="Get the template"
        description="Required in every row: Receipt reference, Receipt date (YYYY-MM-DD), Amount, Payment method, Customer, Sale reference and Sale status. Sale status must be Unfinished."
        connector
        actions={
          <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => downloadCsv("receipt-import-template.csv", [[...RECEIPT_IMPORT_COLUMNS]])}>
            <Download aria-hidden="true" /> CSV template
          </Button>
        }
      />
      <TemplateStep step={2} title="Upload and review" description={<Label htmlFor="receipt-import-file">Receipt file (.xlsx or .csv, up to 10 MB)</Label>} connector={preview !== null}>
        <UploadDropzone inputId="receipt-import-file" accept={SPREADSHEET_ACCEPT} disabled={action.isPending} reading={reading} error={fileError} onFile={(file) => void onFile(file)} />
        {preview ? (
          <div className="tw:mt-4">
            <p className="tw:mb-2 tw:text-sm tw:text-muted-foreground">{rows.length} row(s): {ready} ready, {rows.length - ready} invalid. Invalid rows are skipped and listed on the batch.</p>
            <DataTable data={rows} columns={ROW_COLUMNS} getRowId={(row) => String(row.rowNumber)} emptyText="The file has no data rows." caption={`Import preview for ${preview.fileName}`} />
          </div>
        ) : null}
      </TemplateStep>
      {preview ? (
        <TemplateStep step={3} title="Create the batch">
          <div className="tw:flex tw:flex-col tw:gap-3">
            <CheckboxField label="I confirm these rows come from official company records." checked={declaration} onChange={setDeclaration} />
            <div>
              <Button className="tw:min-h-11 tw:sm:min-h-8" loading={action.isPending} disabled={!declaration || ready === 0} onClick={() => void confirm()}>
                {action.isPending ? null : <Upload aria-hidden="true" />} {`Create batch (${ready} receipt${ready === 1 ? "" : "s"})`}
              </Button>
            </div>
          </div>
        </TemplateStep>
      ) : null}
    </>
  );
}

function BatchesPanel({ batches, isLoading, error }: { batches: ReceiptImportBatch[]; isLoading: boolean; error: unknown }) {
  const canSignOff = useOperation("history-import.signoff");
  const action = useReceiptImportAction();
  const { confirmRun, dialog } = useConfirmRun();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<ReceiptImportBatch | null>(null);
  const detail = batches.find((batch) => batch.id === detailId) ?? null;

  const columns = useMemo<ColumnDef<ReceiptImportBatch, unknown>[]>(
    () => [
      { id: "id", header: "Batch", cell: ({ row }) => <span className="tw:font-semibold">{row.original.id}</span> },
      { id: "file", header: "File", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.fileName },
      { id: "receipts", header: "Receipts", cell: ({ row }) => row.original.receipts.length },
      { id: "skipped", header: "Skipped", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.skipped.length },
      { id: "total", header: "Total", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => <Money value={row.original.receipts.reduce((sum, receipt) => sum + receipt.amountCentavos, 0)} /> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={BATCH_BADGE[row.original.status]} label={row.original.status === "signed_off" ? "Signed off" : row.original.status === "rejected" ? "Rejected" : "Awaiting sign-off"} /> },
    ],
    [],
  );

  const itemsFor = (batch: ReceiptImportBatch) =>
    batch.status !== "pending_signoff"
      ? []
      : [
          ...(canSignOff
            ? [{ key: "signoff", label: "Sign off batch", onClick: () => confirmRun({ title: "Sign off this batch?", description: `All ${batch.receipts.length} receipt(s) become Approved (imported) and count in reports. This cannot be undone.`, confirmText: "Sign off", action: () => action.mutateAsync({ action: "signOff", id: batch.id }), successTitle: "Batch signed off.", errorTitle: "Could not sign off" }) }]
            : []),
          { key: "reject", label: "Reject batch", danger: true, onClick: () => setRejecting(batch) },
        ];

  return (
    <QueryState isLoading={isLoading} error={error}>
      {dialog}
      <DataTable
        data={batches}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="No import batch yet."
        caption="Historical import batches"
        onRowOpen={(row) => setDetailId(row.id)}
        getRowLabel={(row) => `Open import batch ${row.id}`}
        rowActions={(row) => <RowActionsMenu itemName={`batch ${row.id}`} onView={() => setDetailId(row.id)} extraItems={itemsFor(row)} />}
      />
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? `Batch ${detail.id}` : "Batch"}
        subtitle={detail?.fileName}
        badge={detail ? <BizBadge status={BATCH_BADGE[detail.status]} label={detail.status === "signed_off" ? "Signed off" : detail.status === "rejected" ? "Rejected" : "Awaiting sign-off"} /> : undefined}
        sections={
          detail
            ? [
                { title: "Batch", rows: [{ label: "Rows in file", value: detail.totalRows }, { label: "Prepared", value: detail.createdAt.slice(0, 10) }, { label: "Decided", value: detail.decidedAt ? detail.decidedAt.slice(0, 10) : "" }, { label: "Reason", value: detail.decisionReason ?? "" }, { label: "Self sign-off", value: detail.selfSignedOff ? "Yes, the signer also prepared this batch" : "No" }] },
                { title: "Receipts", rows: detail.receipts.map((receipt) => ({ label: receipt.referenceNo, value: `${receipt.paidDate} · ${formatPeso(receipt.amountCentavos)} · ${importedReceiptStatusLabel(detail.status)}` })) },
                { title: "Skipped rows", rows: detail.skipped.map((item) => ({ label: `Row ${item.rowNumber}`, value: item.reason })) },
              ]
            : []
        }
      />
      {rejecting ? <RejectDialog batch={rejecting} onClose={() => setRejecting(null)} /> : null}
    </QueryState>
  );
}

function RejectDialog({ batch, onClose }: { batch: ReceiptImportBatch; onClose: () => void }) {
  const action = useReceiptImportAction();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const send = async () => {
    if (!reason.trim()) return setError("A reason is required.");
    try {
      await action.mutateAsync({ action: "reject", id: batch.id, reason });
      toast.success("Batch rejected. None of its receipts count.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not reject.");
    }
  };
  return (
    <FormDialog open title={`Reject batch ${batch.id}`} description="The whole batch is rejected and none of its receipts count. Fix the file and import it again." submitText="Reject batch" pending={action.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <TextAreaField label="Reason" required value={reason} onChange={setReason} />
    </FormDialog>
  );
}
