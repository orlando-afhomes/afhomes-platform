"use client";

import { useMemo, useState } from "react";
import { useAllowanceReviews, useOperation, useSaveAllowanceReview } from "@/data/business-queries";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview, type AllowanceStretch, type AllowanceTotals } from "@/modules/commissions/allowances";
import { AdminSection, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { Money } from "@/shared/components/modern/money";
import { MoneyField, SelectField, TextField } from "@/shared/forms/modern";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";

const empty = { days: "", team: "", collections: "", assumed: "" };
type Inputs = typeof empty;

function readStretch(input: Inputs): AllowanceStretch {
  const money = (value: string) => {
    const amount = parsePesoToCentavos(value || "0");
    if (amount === null) throw new Error("Enter a valid peso amount.");
    return amount;
  };
  return {
    days: Number(input.days || "0"),
    teamTcpCentavos: money(input.team),
    collectionsCentavos: money(input.collections),
    assumedCreditCentavos: money(input.assumed),
  };
}

export function AllowanceReviewPanel() {
  const allowed = useOperation("commission.approve");
  const canWithhold = useOperation("commission.rates.manage");
  const query = useAllowanceReviews(allowed);
  const save = useSaveAllowanceReview();
  const [memberId, setMemberId] = useState("");
  const member = query.data?.members.find(({ id }) => id === memberId);
  const [month, setMonth] = useState("");
  const [qualifying, setQualifying] = useState<Inputs>(empty);
  const [extended, setExtended] = useState<Inputs>(empty);
  const [result, setResult] = useState<ReturnType<typeof calculateAllowances>>();
  const [error, setError] = useState<string>();
  const [withholdingDraft, setWithholdingDraft] = useState<{ key: string; reason: string }>();
  const [workbook, setWorkbook] = useState({ ba: "", pa: "", pb: "" });
  const [differenceDraft, setDifferenceDraft] = useState<{ key: string; reason: string }>();
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? query.data?.reviews.find(({ id }) => id === detailId) : undefined;
  const reviewKey = `${month}-${memberId}`;
  const priorReview = query.data?.reviews.findLast((item) => item.month === month && item.memberId === memberId);
  const differenceReason = differenceDraft?.key === reviewKey ? differenceDraft.reason : priorReview?.workbookDifferenceReason ?? "";
  const withholding = withholdingDraft?.key === reviewKey ? withholdingDraft.reason : priorReview?.withholdingReason ?? "";

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell (and close an open row menu).
  const reviewColumns = useMemo<ColumnDef<AllowanceReview, unknown>[]>(() => [
    { header: "Month", accessorKey: "month" },
    { header: "Leader", accessorKey: "memberName" },
    { header: "Basic allowance", cell: ({ row }) => <Money value={row.original.result.baCentavos} /> },
    { header: "Performance allowance", cell: ({ row }) => <Money value={row.original.result.paCentavos} /> },
    { header: "Performance bonus", cell: ({ row }) => <Money value={row.original.result.pbCentavos} /> },
  ], []);

  async function calculate(persist = false) {
    setResult(undefined);
    setError(undefined);
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
    if (!match) { setError("Enter the month as YYYY-MM."); return; }
    if (!member) { setError("Choose an IST leader."); return; }
    try {
      const daysInMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
      const qualifyingValues = readStretch(qualifying);
      const extendedValues = readStretch(extended);
      if (persist) {
        const values = [workbook.ba, workbook.pa, workbook.pb];
        const amounts = values.map(parsePesoToCentavos);
        let workbookTotals: AllowanceTotals | null = null;
        if (values.some(Boolean)) {
          const [baCentavos, paCentavos, pbCentavos] = amounts;
          if (baCentavos === null || paCentavos === null || pbCentavos === null) throw new Error("Enter all three workbook amounts, including any zeros.");
          workbookTotals = { baCentavos, paCentavos, pbCentavos };
        }
        const review = await save.mutateAsync({
          month, memberId, qualifying: qualifyingValues, extended: extendedValues, workbook: workbookTotals, workbookDifferenceReason: differenceReason,
          ...(canWithhold ? { withholdingReason: withholding } : {}),
        });
        setResult(review.result);
        toast.success("Allowance review saved.");
      } else {
        setResult(calculateAllowances({
          daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[member.position],
          qualifying: qualifyingValues, extended: extendedValues, withholdBa: Boolean(withholding.trim()),
        }));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not calculate allowances.");
    }
  }

  return (
    <>
      <AdminSection title="Month and position">
        <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
          <TextField label="Month (YYYY-MM)" required value={month} onChange={(value) => { setMonth(value); setResult(undefined); }} />
          <SelectField label="IST leader" required value={memberId} onChange={(value) => { setMemberId(value); setResult(undefined); }}
            options={(query.data?.members ?? []).map(({ id, name, position }) => ({ value: id, label: `${name} · ${position}` }))} />
        </div>
      </AdminSection>
      <div className="tw:grid tw:gap-4 tw:md:grid-cols-2">
        <Stretch title="Qualifying period" value={qualifying} onChange={(value) => { setQualifying(value); setResult(undefined); }} />
        <Stretch title="Extended period" value={extended} onChange={(value) => { setExtended(value); setResult(undefined); }} />
      </div>
      <AdminSection title="Workbook results">
        <div className="tw:grid tw:gap-3 tw:sm:grid-cols-3">
          <MoneyField label="Workbook basic allowance" value={workbook.ba} onChange={(ba) => setWorkbook({ ...workbook, ba })} />
          <MoneyField label="Workbook performance allowance" value={workbook.pa} onChange={(pa) => setWorkbook({ ...workbook, pa })} />
          <MoneyField label="Workbook performance bonus" value={workbook.pb} onChange={(pb) => setWorkbook({ ...workbook, pb })} />
        </div>
        {Object.values(workbook).some(Boolean) ? <TextField label="Workbook difference explanation" value={differenceReason} onChange={(reason) => setDifferenceDraft({ key: reviewKey, reason })} /> : null}
        {canWithhold ? <TextField label="Basic allowance withholding reason" value={withholding} onChange={(reason) => { setWithholdingDraft({ key: reviewKey, reason }); setResult(undefined); }} /> : null}
      </AdminSection>
      <div className="tw:flex tw:flex-wrap tw:gap-2">
        <Button type="button" variant="outline" onClick={() => void calculate()}>Calculate allowances</Button>
        <Button type="button" disabled={save.isPending} onClick={() => void calculate(true)}>Save review</Button>
      </div>
      {error ? <p role="alert" className="tw:text-destructive">{error}</p> : null}
      {result ? <AdminStatGrid columns={3}>
        <AdminStatCard label="Basic allowance" value={<Money value={result.baCentavos} />} icon={Banknote} tone="neutral" />
        <AdminStatCard label="Performance allowance" value={<Money value={result.paCentavos} />} icon={Banknote} tone="neutral" />
        <AdminStatCard label="Performance bonus" value={<Money value={result.pbCentavos} />} icon={Banknote} tone="neutral" />
      </AdminStatGrid> : null}
      <AdminSection title="Saved reviews">
        <QueryState isLoading={query.isLoading} error={query.error}>
          <DataTable data={(query.data?.reviews ?? []).slice().reverse()} caption="Allowance review history" emptyText="No reviews saved." getRowId={(row) => row.id}
            onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open allowance review for ${row.memberName}, ${row.month}`}
            rowActions={(row) => <RowActionsMenu itemName={`allowance review for ${row.memberName}, ${row.month}`} onView={() => setDetailId(row.id)} />}
            columns={reviewColumns} />
        </QueryState>
      </AdminSection>
      <RecordDetailsSheet open={detail !== undefined} onClose={() => setDetailId(null)}
        title={detail ? detail.memberName : "Allowance review"} subtitle={detail ? `${detail.month}, ${detail.position}` : undefined}
        sections={detail ? [
          {
            title: "Calculated",
            rows: [
              { label: "Basic allowance (BA)", value: <Money value={detail.result.baCentavos} /> },
              { label: "Performance allowance (PA)", value: <Money value={detail.result.paCentavos} /> },
              { label: "Performance bonus (PB)", value: <Money value={detail.result.pbCentavos} /> },
              { label: "BA withholding reason", value: detail.withholdingReason },
            ],
          },
          {
            title: "Difference from workbook",
            rows: detail.workbook ? [
              { label: "BA", value: <Money value={detail.result.baCentavos - detail.workbook.baCentavos} /> },
              { label: "PA", value: <Money value={detail.result.paCentavos - detail.workbook.paCentavos} /> },
              { label: "PB", value: <Money value={detail.result.pbCentavos - detail.workbook.pbCentavos} /> },
              ...(detail.workbookDifferenceReason ? [{ label: "Explanation", value: detail.workbookDifferenceReason }] : []),
            ] : [{ label: "Workbook", value: "Awaiting workbook figures" }],
          },
        ] : []} />
    </>
  );
}

function Stretch({ title, value, onChange }: { title: string; value: Inputs; onChange: (value: Inputs) => void }) {
  return (
    <AdminSection title={title}>
      <div className="tw:grid tw:gap-3">
        <TextField label="Eligible days" value={value.days} onChange={(days) => onChange({ ...value, days })} />
        <MoneyField label="Team Closed Deal value" value={value.team} onChange={(team) => onChange({ ...value, team })} />
        <MoneyField label="Collections" value={value.collections} onChange={(collections) => onChange({ ...value, collections })} />
        <MoneyField label="Assumed collection credit" value={value.assumed} onChange={(assumed) => onChange({ ...value, assumed })} />
      </div>
    </AdminSection>
  );
}
