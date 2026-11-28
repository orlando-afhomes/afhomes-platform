"use client";

import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { notify } from "@/shared/components/modern/app-toaster";
import type { IgpRegister } from "@/data/contracts/igp-repository";
import { useIgpHistoryImport } from "@/data/igp-queries";
import {
  buildIgpHistoryImportRows,
  IGP_HISTORY_COLUMNS,
  IGP_HISTORY_EXAMPLE_ROW,
  rowsToIgpHistoryRecords,
  type IgpHistoryImportRow,
  type IgpHistoryRecord,
} from "@/modules/igp/history-import";
import type { IgpHistoryBatch } from "@/modules/igp/types";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { CheckboxField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format-date";
import { downloadCsv, downloadXlsx, readSpreadsheet, SPREADSHEET_ACCEPT } from "@/shared/lib/spreadsheet";
import { EMPTY } from "@/shared/lib/empty-value";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Button } from "@/shared/ui/button";
import { TemplateDownloadMenu, TemplateStep, UploadDropzone } from "./customer-import-steps";

const SHEET_NAME = "IGP History";

const PREVIEW_COLUMNS: ColumnDef<IgpHistoryImportRow, unknown>[] = [
  { id: "row", header: "Row", cell: ({ row }) => row.original.rowNumber },
  { id: "series", header: "Series Number", cell: ({ row }) => <span className="tw:font-semibold">{row.original.row?.seriesNumber ?? EMPTY}</span> },
  { id: "buyer", header: "Buyer", cell: ({ row }) => row.original.row?.buyerLabel ?? EMPTY },
  { id: "result", header: "Result", cell: ({ row }) => <BizBadge status={row.original.status === "ready" ? "verified" : "rejected"} label={row.original.status === "ready" ? "Ready" : "Invalid"} /> },
  {
    id: "issues", header: "Issues",
    cell: ({ row }) => row.original.errors.length === 0 ? EMPTY : (
      <span className="tw:text-xs tw:font-medium tw:text-destructive">
        {row.original.errors.length} {row.original.errors.length === 1 ? "issue" : "issues"}
      </span>
    ),
  },
];

const BATCH_COLUMNS: ColumnDef<IgpHistoryBatch, unknown>[] = [
  { id: "file", header: "File", cell: ({ row }) => <span className="tw:font-semibold">{row.original.fileName}</span> },
  { id: "rows", header: "Rows", cell: ({ row }) => row.original.rows.length },
  { id: "skipped", header: "Skipped", cell: ({ row }) => row.original.skipped.length },
  { id: "status", header: "Status", cell: () => <BizBadge status="approved" label="Imported" /> },
];

/** IGP-2: import validated IGP history rows. Imported rows are history only: no live sales, receipts, commissions or VIP Numbers. */
export function IgpHistoryDialog({ register, onClose }: { register: IgpRegister; onClose: () => void }) {
  const importHistory = useIgpHistoryImport();
  const [preview, setPreview] = useState<{ fileName: string; records: IgpHistoryRecord[] } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [declaration, setDeclaration] = useState(false);
  const [detailRowNumber, setDetailRowNumber] = useState<number | null>(null);
  const [detailBatchId, setDetailBatchId] = useState<string | null>(null);

  const taken = useMemo(
    () => [
      ...register.sales.map(({ seriesNumber }) => seriesNumber),
      ...register.historyBatches.flatMap((batch) => batch.rows.map(({ seriesNumber }) => seriesNumber)),
    ],
    [register],
  );
  const rows = useMemo(
    () => (preview ? buildIgpHistoryImportRows(preview.records, { taken, today: manilaToday() }) : []),
    [preview, taken],
  );
  const ready = rows.filter((row) => row.status === "ready").length;
  const detailRow = detailRowNumber === null ? null : rows.find((row) => row.rowNumber === detailRowNumber) ?? null;
  const detailBatch = detailBatchId === null ? null : register.historyBatches.find((batch) => batch.id === detailBatchId) ?? null;

  const onFile = async (file: File | undefined) => {
    setPreview(null);
    setFileError(null);
    setDeclaration(false);
    setDetailRowNumber(null);
    if (!file) return;
    setReading(true);
    try {
      setPreview({ fileName: file.name, records: rowsToIgpHistoryRecords(await readSpreadsheet(file, SHEET_NAME)) });
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "The file could not be read.");
    } finally {
      setReading(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    try {
      const batch = await importHistory.mutateAsync({ fileName: preview.fileName, records: preview.records, declaration });
      toast.success(`Imported ${batch.rows.length} IGP history row(s)${batch.skipped.length > 0 ? `, ${batch.skipped.length} skipped` : ""}. The numbers are reserved.`);
      setPreview(null);
      setDeclaration(false);
    } catch (error) {
      notify.actionError(error, "The import failed.");
    }
  };

  return (
    <Dialog open onOpenChange={(next) => (!next && !importHistory.isPending ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[90vh] tw:overflow-y-auto tw:sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import IGP History</DialogTitle>
          <DialogDescription>
            History rows never create live sales, receipts or commissions.
          </DialogDescription>
        </DialogHeader>
        <div className="tw:flex tw:flex-col tw:gap-5">
          <TemplateStep
            step={1}
            title="Get the Template"
            description="Columns: Series Number, Issue date, Contract price, Status, Replaces."
            connector
            actions={
              <TemplateDownloadMenu
                onExcel={() => void downloadXlsx("igp-history-template.xlsx", [{ name: SHEET_NAME, rows: [[...IGP_HISTORY_COLUMNS], IGP_HISTORY_EXAMPLE_ROW] }]).catch(() => toast.error("The template could not be created."))}
                onCsv={() => downloadCsv("igp-history-template.csv", [[...IGP_HISTORY_COLUMNS], IGP_HISTORY_EXAMPLE_ROW])}
              />
            }
          />
          <TemplateStep step={2} title="Upload and Review" description={<Label htmlFor="igp-history-file">IGP history file (.xlsx or .csv, up to 10 MB)</Label>} connector={preview !== null}>
            <UploadDropzone inputId="igp-history-file" accept={SPREADSHEET_ACCEPT} disabled={importHistory.isPending} reading={reading} error={fileError} onFile={(file) => void onFile(file)} />
            {preview ? (
              <div className="tw:mt-4">
                <p className="tw:mb-2 tw:text-sm tw:text-muted-foreground">{rows.length} row(s): {ready} ready, {rows.length - ready} invalid.</p>
                <DataTable
                  data={rows}
                  columns={PREVIEW_COLUMNS}
                  getRowId={(row) => String(row.rowNumber)}
                  emptyText="The file has no data rows."
                  caption={`Import Preview for ${preview.fileName}`}
                  onRowOpen={(row) => setDetailRowNumber(row.rowNumber)}
                  getRowLabel={(row) => `View IGP history row ${row.rowNumber}`}
                />
                <RecordDetailsSheet
                  open={detailRow !== null}
                  onClose={() => setDetailRowNumber(null)}
                  title={detailRow ? `History Row ${detailRow.rowNumber}` : "History Row"}
                  subtitle={detailRow?.row?.seriesNumber}
                  badge={detailRow ? <BizBadge status={detailRow.status === "ready" ? "verified" : "rejected"} label={detailRow.status === "ready" ? "Ready" : "Invalid"} /> : undefined}
                  footer={<Button type="button" variant="outline" onClick={() => setDetailRowNumber(null)}>Close</Button>}
                  sections={detailRow ? rowSections(detailRow) : []}
                />
              </div>
            ) : null}
          </TemplateStep>
          {preview ? (
            <TemplateStep step={3} title="Confirm the Import">
              <div className="tw:flex tw:flex-col tw:gap-3">
                <CheckboxField label="I confirm these rows come from official company records." checked={declaration} onChange={setDeclaration} />
                <div>
                  <Button className="tw:min-h-11 tw:sm:min-h-8" loading={importHistory.isPending} disabled={!declaration || ready === 0} onClick={() => void confirm()}>
                    {importHistory.isPending ? null : <Upload aria-hidden="true" />} {`Import History (${ready} row${ready === 1 ? "" : "s"})`}
                  </Button>
                </div>
              </div>
            </TemplateStep>
          ) : null}
          <section aria-label="Imported IGP history" className="tw:flex tw:flex-col tw:gap-2">
            <h2 className="tw:text-base tw:font-semibold">Imported History</h2>
            <DataTable
              data={register.historyBatches}
              columns={BATCH_COLUMNS}
              getRowId={(row) => row.id}
              emptyText="No IGP history has been imported yet."
              caption="Imported IGP History Batches"
              onRowOpen={(row) => setDetailBatchId(row.id)}
              getRowLabel={(row) => `Open imported IGP history batch ${row.fileName}`}
            />
            <RecordDetailsSheet
              open={detailBatch !== null}
              onClose={() => setDetailBatchId(null)}
              title={detailBatch ? `Batch ${detailBatch.fileName}` : "Batch"}
              subtitle={detailBatch ? `${detailBatch.rows.length} row(s) imported` : undefined}
              footer={<Button type="button" variant="outline" onClick={() => setDetailBatchId(null)}>Close</Button>}
              sections={detailBatch ? [
                {
                  title: "Rows",
                  rows: detailBatch.rows.map((row) => ({
                    label: row.seriesNumber,
                    value: `${row.status === "replaced" ? `Replaced by ${row.replaces}` : row.status === "cancelled" ? "Cancelled" : "Active"} · ${row.buyerLabel}`,
                  })),
                },
                {
                  title: "Skipped Rows",
                  rows: detailBatch.skipped.length > 0
                    ? detailBatch.skipped.map((item) => ({ label: `Row ${item.rowNumber}`, value: item.reason }))
                    : [{ label: "Skipped", value: EMPTY }],
                },
              ] : []}
            />
          </section>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={importHistory.isPending} onClick={onClose} className="tw:min-h-11 tw:sm:min-h-8">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function rowSections(row: IgpHistoryImportRow) {
  const parsed = row.row;
  return [
    {
      title: "Row",
      rows: [
        { label: "Series Number", value: parsed?.seriesNumber },
        { label: "Issue date", value: parsed ? formatDate(parsed.date) : null },
        { label: "Contract price", value: parsed ? <Money value={parsed.priceCentavos} /> : null },
        { label: "Result", value: row.status === "ready" ? "Ready" : "Invalid" },
        ...(parsed?.status === "replaced" ? [{ label: "Replaces", value: `Replaced by ${parsed.replaces}` }] : []),
      ],
    },
    {
      title: "Issues",
      rows: row.errors.length > 0
        ? row.errors.map((message, index) => ({ label: `Issue ${index + 1}`, value: message }))
        : [{ label: "Issues", value: EMPTY }],
    },
  ];
}
