"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import { useReconciliationEntries, useReconciliationTotals, useRecordReconciliation } from "@/data/reconciliation-queries";
import { MEASURE_LABELS, latestEntry, type ReconciliationEntry, type SourceRecord, type SourceTotal } from "@/modules/reconciliation/rules";
import { AdminPage } from "@/shared/components/admin";
import { ReportExport, type ReportColumn } from "../components/report-shell";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { MoneyField, SelectField, TextAreaField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

/** The last 24 months, newest first, as YYYY-MM options. */
function monthOptions(): Array<{ value: string; label: string }> {
  const [year, month] = manilaToday().split("-").map(Number);
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(date) };
  });
}

const RECORD_COLUMNS: ColumnDef<SourceRecord, unknown>[] = [
  { id: "date", header: "Date", cell: ({ row }) => row.original.date },
  { id: "label", header: "Record", cell: ({ row }) => <span className="tw:font-semibold">{row.original.label}</span> },
  { id: "note", header: "Note", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.note ?? "" },
  { id: "amount", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
];

const ENTRY_COLUMNS: ColumnDef<ReconciliationEntry, unknown>[] = [
  { id: "measure", header: "Measure", cell: ({ row }) => MEASURE_LABELS[row.original.measure] },
  { id: "workbook", header: "Workbook", cell: ({ row }) => <Money value={row.original.workbookCentavos} /> },
  { id: "platform", header: "Platform", cell: ({ row }) => <Money value={row.original.liveCentavos} /> },
  { id: "difference", header: "Difference", cell: ({ row }) => <Money value={row.original.differenceCentavos} /> },
  { id: "decision", header: "Decision", cell: ({ row }) => <BizBadge status={row.original.decision === "signed_off" ? "approved" : "on_hold"} label={row.original.decision === "signed_off" ? "Signed off" : "Explained variance"} /> },
  { id: "reason", header: "Reason", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.reason ?? "" },
  { id: "recorded", header: "Recorded", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.recordedAt.slice(0, 10) },
];

const ENTRY_EXPORT: ReportColumn<ReconciliationEntry>[] = [
  { header: "Measure", value: (entry) => MEASURE_LABELS[entry.measure] },
  { header: "Workbook", value: (entry) => formatPeso(entry.workbookCentavos) },
  { header: "Platform", value: (entry) => formatPeso(entry.liveCentavos) },
  { header: "Difference", value: (entry) => formatPeso(entry.differenceCentavos) },
  { header: "Decision", value: (entry) => (entry.decision === "signed_off" ? "Signed off" : "Explained variance") },
  { header: "Reason", value: (entry) => entry.reason ?? "" },
  { header: "Recorded", value: (entry) => entry.recordedAt.slice(0, 10) },
];

/** F11.3: compare the platform's live source totals with the workbook, month by month. Differences are signed off or explained, never hidden. */
export function ReconciliationPage() {
  const canReconcile = useOperation("reconciliation.manage");
  const options = useMemo(() => monthOptions(), []);
  const [period, setPeriod] = useState(options[0].value);
  const totals = useReconciliationTotals(period, canReconcile);
  const entries = useReconciliationEntries(canReconcile);
  const [recording, setRecording] = useState<SourceTotal | null>(null);
  const [drill, setDrill] = useState<SourceTotal | null>(null);
  const monthEntries = (entries.data ?? []).filter((entry) => entry.period === period).reverse();

  return (
    <AdminPage anyOf={["reports"]} title="Reconciliation" description="Compare the platform's totals for a month with the workbook. Sign off matching totals or explain each difference." crumbs={[{ label: "Reports" }, { label: "Reconciliation" }]}>
      {canReconcile ? (
        <>
          <InfoNote title="Parallel run">The workbook keeps paying until a month closes with no unexplained differences. Enter the workbook total for each measure; a difference needs a written reason.</InfoNote>
          <div className="tw:max-w-xs">
            <SelectField label="Month" value={period} options={options} onChange={setPeriod} />
          </div>
          <QueryState isLoading={totals.isLoading || entries.isLoading} error={totals.error ?? entries.error}>
            <div className="tw:flex tw:flex-col tw:gap-3">
              {(totals.data ?? []).map((total) => {
                const entry = latestEntry(entries.data ?? [], period, total.measure);
                // A decision made against a different live total no longer describes the records.
                const stale = entry !== undefined && entry.liveCentavos !== total.totalCentavos;
                return (
                  <section key={total.measure} aria-label={MEASURE_LABELS[total.measure]} className="tw:flex tw:flex-col tw:gap-2 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4 tw:sm:flex-row tw:sm:items-center tw:sm:justify-between">
                    <div className="tw:min-w-0">
                      <h2 className="tw:text-sm tw:font-semibold">{MEASURE_LABELS[total.measure]}</h2>
                      <p className="tw:text-sm tw:text-muted-foreground">Platform: <Money value={total.totalCentavos} className="tw:font-semibold tw:text-foreground" /> from {total.records.length} record{total.records.length === 1 ? "" : "s"}</p>
                      {entry ? (
                        <p className="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:text-sm">
                          <BizBadge status={stale ? "pending" : entry.decision === "signed_off" ? "approved" : "on_hold"} label={stale ? "Platform total changed" : entry.decision === "signed_off" ? "Signed off" : "Explained variance"} />
                          <span>Workbook <Money value={entry.workbookCentavos} />, difference <Money value={entry.differenceCentavos} /></span>
                        </p>
                      ) : (
                        <p className="tw:mt-1 tw:text-sm tw:text-muted-foreground">Not reconciled yet.</p>
                      )}
                    </div>
                    <div className="tw:flex tw:flex-wrap tw:gap-2">
                      <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setDrill(total)}>View records</Button>
                      <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setRecording(total)}>{entry ? "Record again" : "Record workbook total"}</Button>
                    </div>
                  </section>
                );
              })}
            </div>
            <section aria-label="Decisions for this month" className="tw:flex tw:flex-col tw:gap-2">
              <h2 className="tw:text-base tw:font-semibold">Decisions for this month</h2>
              <ReportExport report="Reconciliation" fileName={`reconciliation-${period}`} columns={ENTRY_EXPORT} rows={monthEntries} range={{ from: period, to: period }} printable={false} />
              <DataTable data={monthEntries} columns={ENTRY_COLUMNS} getRowId={(row) => row.id} emptyText="No decision has been recorded for this month." caption="Reconciliation decisions" />
            </section>
          </QueryState>
          {recording ? <RecordDialog period={period} total={recording} onClose={() => setRecording(null)} /> : null}
          <Dialog open={drill !== null} onOpenChange={(next) => (next ? undefined : setDrill(null))}>
            <DialogContent className="tw:max-h-[90vh] tw:overflow-y-auto tw:sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>{drill ? MEASURE_LABELS[drill.measure] : "Records"}</DialogTitle>
                <DialogDescription>The records behind the platform total. Corrections are made on the records themselves, never here.</DialogDescription>
              </DialogHeader>
              {drill ? <DataTable data={drill.records} columns={RECORD_COLUMNS} getRowId={(row) => row.id} emptyText="No records in this month." caption="Source records" /> : null}
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <InfoNote title="Access restricted">Reconciliation is limited to the Administrator, the Super Administrator and Finance.</InfoNote>
      )}
    </AdminPage>
  );
}

function RecordDialog({ period, total, onClose }: { period: string; total: SourceTotal; onClose: () => void }) {
  const record = useRecordReconciliation();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const workbook = parsePesoToCentavos(amount);
  const difference = workbook === null ? null : workbook - total.totalCentavos;
  const decision = difference === 0 ? "signed_off" : "explained_variance";

  const send = async () => {
    if (workbook === null) return setError("Enter the workbook total, for example 98500.00.");
    try {
      await record.mutateAsync({ period, measure: total.measure, workbookCentavos: workbook, decision, reason });
      toast.success(decision === "signed_off" ? "Totals signed off." : "Difference recorded with its explanation.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record.");
    }
  };

  return (
    <FormDialog open title={MEASURE_LABELS[total.measure]} description={`Platform total for ${period}: ${formatPeso(total.totalCentavos)}`} submitText={decision === "signed_off" ? "Sign off" : "Record explained variance"} pending={record.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <MoneyField label="Workbook total" required value={amount} onChange={setAmount} />
      {difference === null ? null : (
        <p className="tw:text-sm" role="status">
          {difference === 0 ? "The totals match. This will be signed off." : `Difference: ${formatPeso(difference)}. A reason is required.`}
        </p>
      )}
      {difference !== null && difference !== 0 ? <TextAreaField label="Reason for the difference" required value={reason} onChange={setReason} /> : null}
    </FormDialog>
  );
}
