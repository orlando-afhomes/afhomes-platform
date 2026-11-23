"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import { useMonthSwitchStatus, useReconciliationEntries, useReconciliationTotals, useRecordMonthSwitch, useRecordReconciliation } from "@/data/reconciliation-queries";
import { MEASURE_LABELS, latestEntry, type ReconciliationEntry, type SourceTotal } from "@/modules/reconciliation/rules";
import { ReportExport, type ReportColumn } from "../components/report-shell";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { formatDate } from "@/shared/lib/format-date";
import { MoneyField, SelectField, TextAreaField } from "@/shared/forms/modern";
import { manilaToday } from "@/shared/lib/dates";
import { formatPeso, parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { useDevIdentity } from "@/shared/providers/dev-identity-provider";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";

/** The last 24 months, newest first, as YYYY-MM options. */
function monthOptions(): Array<{ value: string; label: string }> {
  const [year, month] = manilaToday().split("-").map(Number);
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" }).format(date) };
  });
}

/** How one measure stands for the chosen month. A decision made against a different live total no longer describes the records, so it is stale. */
type MeasureStatus = "matches" | "explained" | "unchecked" | "stale";

type MeasureRow = { total: SourceTotal; entry: ReconciliationEntry | undefined; status: MeasureStatus };

const STATUS_BADGE: Record<MeasureStatus, { status: string; label: string }> = {
  matches: { status: "approved", label: "Matches" },
  explained: { status: "on_hold", label: "Difference explained" },
  unchecked: { status: "inactive", label: "Not checked yet" },
  stale: { status: "pending", label: "Needs a new check" },
};

function StatusBadge({ status }: { status: MeasureStatus }) {
  return <BizBadge status={STATUS_BADGE[status].status} label={STATUS_BADGE[status].label} />;
}

function statusOf(total: SourceTotal, entry: ReconciliationEntry | undefined): MeasureStatus {
  if (!entry) return "unchecked";
  if (entry.liveCentavos !== total.totalCentavos) return "stale";
  return entry.decision === "signed_off" ? "matches" : "explained";
}

/** Difference against the system total as it stands now; empty until a spreadsheet total has been entered. */
const differenceOf = (row: MeasureRow) => (row.entry ? <Money value={row.entry.workbookCentavos - row.total.totalCentavos} /> : null);

const MEASURE_COLUMNS: ColumnDef<MeasureRow, unknown>[] = [
  { id: "measure", header: "Measure", cell: ({ row }) => <span className="tw:font-semibold">{MEASURE_LABELS[row.original.total.measure]}</span> },
  { id: "system", header: "System Total", cell: ({ row }) => <Money value={row.original.total.totalCentavos} /> },
  { id: "spreadsheet", header: "Company Spreadsheet Total", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.entry ? <Money value={row.original.entry.workbookCentavos} /> : null) },
  { id: "difference", header: "Difference", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => differenceOf(row.original) },
  { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
];

const decisionLabel = (entry: ReconciliationEntry) => (entry.decision === "signed_off" ? "Matches" : "Difference explained");

const ENTRY_COLUMNS: ColumnDef<ReconciliationEntry, unknown>[] = [
  { id: "measure", header: "Measure", cell: ({ row }) => <span className="tw:font-semibold">{MEASURE_LABELS[row.original.measure]}</span> },
  { id: "workbook", header: "Company Spreadsheet Total", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => <Money value={row.original.workbookCentavos} /> },
  { id: "platform", header: "System Total", cell: ({ row }) => <Money value={row.original.liveCentavos} /> },
  { id: "difference", header: "Difference", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => <Money value={row.original.differenceCentavos} /> },
  { id: "decision", header: "Decision", cell: ({ row }) => <BizBadge status={row.original.decision === "signed_off" ? "approved" : "on_hold"} label={decisionLabel(row.original)} /> },
];

const ENTRY_EXPORT: ReportColumn<ReconciliationEntry>[] = [
  { header: "Measure", value: (entry) => MEASURE_LABELS[entry.measure] },
  { header: "Company Spreadsheet Total", value: (entry) => formatPeso(entry.workbookCentavos) },
  { header: "System Total", value: (entry) => formatPeso(entry.liveCentavos) },
  { header: "Difference", value: (entry) => formatPeso(entry.differenceCentavos) },
  { header: "Decision", value: decisionLabel },
  { header: "Reason", value: (entry) => entry.reason ?? "" },
  { header: "Recorded", value: (entry) => entry.recordedAt.slice(0, 10) },
];

/** F11.3: compare the platform's live source totals with the company spreadsheet, month by month. Differences are confirmed or explained, never hidden. */
export function ReconciliationPanel() {
  const canReconcile = useOperation("reconciliation.manage");
  const options = useMemo(() => monthOptions(), []);
  const [period, setPeriod] = useState(options[0].value);
  const totals = useReconciliationTotals(period, canReconcile);
  const entries = useReconciliationEntries(canReconcile);
  const [recording, setRecording] = useState<SourceTotal | null>(null);
  const [measureId, setMeasureId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const monthEntries = (entries.data ?? []).filter((entry) => entry.period === period).reverse();
  const detail = detailId ? (entries.data ?? []).find((entry) => entry.id === detailId) ?? null : null;

  const rows = useMemo<MeasureRow[]>(
    () => (totals.data ?? []).map((total) => {
      const entry = latestEntry(entries.data ?? [], period, total.measure);
      return { total, entry, status: statusOf(total, entry) };
    }),
    [totals.data, entries.data, period],
  );
  const checked = rows.filter((row) => row.status === "matches" || row.status === "explained").length;
  const differences = rows.filter((row) => row.status === "explained").length;
  const measure = measureId ? rows.find((row) => row.total.measure === measureId) ?? null : null;

  const startRecording = (total: SourceTotal) => {
    setMeasureId(null);
    setRecording(total);
  };

  return (
    <>
      {canReconcile ? (
        <>
          <section aria-label="Month to check" className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4">
            <div className="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-3">
              <SelectField label="Month" value={period} options={options} onChange={setPeriod} className="tw:w-full tw:sm:w-64" />
              <div role="status" className="tw:flex tw:flex-wrap tw:items-center tw:gap-x-4 tw:gap-y-1 tw:text-sm">
                <span><span className="tw:font-semibold">{checked} of {rows.length}</span> measures checked</span>
                <span className="tw:text-muted-foreground">{differences} {differences === 1 ? "difference" : "differences"}</span>
              </div>
            </div>
            <div role="progressbar" aria-label="Measures checked" aria-valuemin={0} aria-valuemax={rows.length} aria-valuenow={checked} className="tw:h-1.5 tw:overflow-hidden tw:rounded-full tw:bg-muted">
              <div className="tw:h-full tw:rounded-full tw:bg-success tw:transition-[width]" style={{ width: rows.length === 0 ? "0%" : `${(checked / rows.length) * 100}%` }} />
            </div>
          </section>
          <QueryState isLoading={totals.isLoading || entries.isLoading} error={totals.error ?? entries.error}>
            <DataTable data={rows} columns={MEASURE_COLUMNS} getRowId={(row) => row.total.measure} emptyText="Nothing to check for this month." caption="Measures to Check" onRowOpen={(row) => setMeasureId(row.total.measure)} getRowLabel={(row) => `Open ${MEASURE_LABELS[row.total.measure]}`} />
            <section aria-label="Decisions for this month" className="tw:flex tw:flex-col tw:gap-2">
              <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2">
                <h2 className="tw:text-base tw:font-semibold">Decisions for This Month</h2>
                <ReportExport report="Spreadsheet Comparison" fileName={`reconciliation-${period}`} columns={ENTRY_EXPORT} rows={monthEntries} range={{ from: period, to: period }} printable={false} />
              </div>
              <DataTable data={monthEntries} columns={ENTRY_COLUMNS} getRowId={(row) => row.id} emptyText="No decision has been recorded for this month." caption="Spreadsheet Comparison Decisions" onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `View decision for ${MEASURE_LABELS[row.measure]}`} />
              <RecordDetailsSheet
                open={detail !== null}
                onClose={() => setDetailId(null)}
                title={detail ? MEASURE_LABELS[detail.measure] : "Decision"}
                badge={detail ? <BizBadge status={detail.decision === "signed_off" ? "approved" : "on_hold"} label={decisionLabel(detail)} /> : undefined}
                sections={
                  detail
                    ? [
                        {
                          rows: [
                            { label: "Company spreadsheet total", value: <Money value={detail.workbookCentavos} /> },
                            { label: "System total", value: <Money value={detail.liveCentavos} /> },
                            { label: "Difference", value: <Money value={detail.differenceCentavos} /> },
                            { label: "Reason", value: detail.reason, wide: true },
                            { label: "Recorded", value: formatDate(detail.recordedAt) },
                          ],
                        },
                      ]
                    : []
                }
              />
            </section>
          </QueryState>
          <MonthSwitchSection period={period} enabled={canReconcile} />
          <RecordDetailsSheet
            open={measure !== null}
            onClose={() => setMeasureId(null)}
            size="lg"
            title={measure ? MEASURE_LABELS[measure.total.measure] : "Measure"}
            badge={measure ? <StatusBadge status={measure.status} /> : undefined}
            sections={
              measure
                ? [
                    {
                      title: "Totals",
                      rows: [
                        { label: "System total", value: <Money value={measure.total.totalCentavos} /> },
                        { label: "Company spreadsheet total", value: measure.entry ? <Money value={measure.entry.workbookCentavos} /> : null },
                        { label: "Difference", value: differenceOf(measure) },
                        { label: "Records counted", value: measure.total.records.length },
                        { label: "Last checked", value: measure.entry ? formatDate(measure.entry.recordedAt) : null },
                        { label: "Reason", value: measure.entry?.reason, wide: true },
                      ],
                    },
                    {
                      title: "Records Behind the System Total",
                      rows: measure.total.records.map((record) => ({
                        label: `${formatDate(record.date)} · ${record.label}`,
                        value: <><Money value={record.amountCentavos} />{record.note ? ` · ${record.note}` : ""}</>,
                      })),
                    },
                  ]
                : []
            }
            footer={
              measure ? (
                measure.entry ? (
                  <Button type="button" variant="warning" onClick={() => startRecording(measure.total)}>Record Again</Button>
                ) : (
                  <Button type="button" variant="info" onClick={() => startRecording(measure.total)}>Enter Company Spreadsheet Total</Button>
                )
              ) : undefined
            }
          />
          {recording ? <RecordDialog period={period} total={recording} onClose={() => setRecording(null)} /> : null}
        </>
      ) : (
        <InfoNote title="Access Restricted">Comparing with the spreadsheet is limited to the Administrator, the Super Administrator and Finance.</InfoNote>
      )}
    </>
  );
}

/** F11.5: the Super Administrator signs off the switch after a month closes with no unexplained differences. */
function MonthSwitchSection({ period, enabled }: { period: string; enabled: boolean }) {
  const { identity } = useDevIdentity();
  const isSuper = identity.roles.includes("super_admin");
  const status = useMonthSwitchStatus(period, enabled);
  const record = useRecordMonthSwitch();
  const { confirmRun, dialog } = useConfirmRun();

  function signOff() {
    confirmRun({
      title: "Sign Off the Switch?",
      description: `Record that ${period} closed with no unexplained differences. This completes the workbook comparison for the month; payout confirmation keeps its existing controls and is unchanged by this record. This is audited with your name and the time.`,
      confirmText: "Sign Off", tone: "success",
      action: () => record.mutateAsync(period),
      successTitle: "Switch signed off.", errorTitle: "Could not sign off",
    });
  }

  const current = status.data;
  return (
    <section aria-label="Switch off the company spreadsheets" className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4">
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
        <h2 className="tw:text-base tw:font-semibold">Switch Off the Company Spreadsheets</h2>
        {current?.signOff ? <BizBadge status="approved" label="Signed off" /> : null}
      </div>
      <p className="tw:text-sm tw:text-muted-foreground">A comparison-only record under doc 08 section 16: signing off completes the spreadsheet comparison for the month. It does not change payout rules.</p>
      <QueryState isLoading={status.isLoading} error={status.error ?? record.error}>
        {current?.signOff ? (
          <p className="tw:text-sm">
            Signed off for {current.signOff.month} by {current.signOff.actorId} on {formatDate(current.signOff.recordedAt)}: {current.signOff.checkedMeasures} measures and {current.signOff.checkedLeaders} leaders checked with no unexplained differences.
          </p>
        ) : !current?.closed ? (
          <p className="tw:text-sm tw:text-muted-foreground">Close the month before the switch can be signed off.</p>
        ) : current.unexplained.length > 0 ? (
          <div className="tw:flex tw:flex-col tw:gap-2">
            <p className="tw:text-sm">Resolve every item before the switch can be signed off:</p>
            <ul className="tw:list-disc tw:pl-5 tw:text-sm">
              {current.unexplained.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : isSuper ? (
          <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
            <p className="tw:text-sm">No unexplained differences for {period}. The switch can be signed off.</p>
            <Button type="button" variant="success" loading={record.isPending} onClick={signOff}>Sign Off the Switch</Button>
          </div>
        ) : (
          <p className="tw:text-sm tw:text-muted-foreground">No unexplained differences for {period}. Only the Super Administrator signs off the switch.</p>
        )}
      </QueryState>
      {dialog}
    </section>
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
    if (workbook === null) return setError("Enter the company spreadsheet total, for example 98500.00.");
    try {
      await record.mutateAsync({ period, measure: total.measure, workbookCentavos: workbook, decision, reason });
      toast.success(decision === "signed_off" ? "Totals match." : "Difference recorded with its explanation.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record.");
    }
  };

  return (
    <FormDialog open title={MEASURE_LABELS[total.measure]} description={`System total for ${period}: ${formatPeso(total.totalCentavos)}`} submitText={decision === "signed_off" ? "Confirm Match" : "Record Difference"} submitVariant={decision === "signed_off" ? "success" : "warning"} pending={record.isPending} error={error} onClose={onClose} onSubmit={() => void send()}>
      <MoneyField label="Company spreadsheet total" required value={amount} onChange={setAmount} />
      {difference === null ? null : (
        <p className="tw:text-sm" role="status">
          {difference === 0 ? "The totals match." : `Difference: ${formatPeso(difference)}. A reason is required.`}
        </p>
      )}
      {difference !== null && difference !== 0 ? <TextAreaField label="Reason for the difference" required value={reason} onChange={setReason} /> : null}
    </FormDialog>
  );
}
