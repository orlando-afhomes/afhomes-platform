"use client";

import { useCallback, useMemo, useState } from "react";
import { useAllowanceReviews, useAssembledAllowanceInputs, useOperation, useSaveAllowanceReview } from "@/data/business-queries";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview, type AllowanceStretch, type AllowanceTotals } from "@/modules/commissions/allowances";
import type { LeaderAllowanceAssembly } from "@/modules/commissions/allowance-assembly";
import { AdminSection, AdminStatCard, AdminStatGrid, StepBlock } from "@/shared/components/admin";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { Money } from "@/shared/components/modern/money";
import { MoneyField, SelectField, TextField } from "@/shared/forms/modern";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Award, Banknote, Calculator, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { MonthField } from "../components/commission-shared";

const empty = { days: "", team: "", collections: "", assumed: "" };
type Inputs = typeof empty;
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

type ComparisonRow = { key: string; label: string; calculated: number; company: number };

// Module constant: TanStack renders cell functions as components, so columns must be stable.
const comparisonColumns: ColumnDef<ComparisonRow, unknown>[] = [
  { id: "label", header: "Allowance", cell: ({ row }) => <span className="tw:font-semibold">{row.original.label}</span> },
  { id: "calculated", header: "Calculated by the System", cell: ({ row }) => <Money value={row.original.calculated} /> },
  { id: "company", header: "Company Spreadsheet", cell: ({ row }) => <Money value={row.original.company} /> },
  {
    id: "difference",
    header: "Difference",
    cell: ({ row }) => {
      const difference = row.original.calculated - row.original.company;
      return difference === 0
        ? <span className="tw:font-medium tw:text-success">Matches</span>
        : <span className="tw:font-medium tw:text-warning"><Money value={difference} /></span>;
    },
  },
];

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

/** Centavos back to a form amount the MoneyField parses, without floating-point arithmetic. */
const centavosInput = (value: number) => `${Math.trunc(value / 100)}.${String(value % 100).padStart(2, "0")}`;

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
  const [copiedAssembly, setCopiedAssembly] = useState(false);
  const [splitConfirmed, setSplitConfirmed] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof calculateAllowances>>();
  const [error, setError] = useState<string>();
  const [withholdingDraft, setWithholdingDraft] = useState<{ key: string; reason: string }>();
  const [withholdSwitch, setWithholdSwitch] = useState<{ key: string; on: boolean }>();
  // The company spreadsheet amounts stay as typed text, converted with parsePesoToCentavos.
  const [company, setCompany] = useState({ ba: "", pa: "", pb: "" });
  const [differenceDraft, setDifferenceDraft] = useState<{ key: string; reason: string }>();
  const [detailId, setDetailId] = useState<string | null>(null);
  const monthValid = MONTH_PATTERN.test(month);
  const assembly = useAssembledAllowanceInputs(month, allowed && monthValid);
  const detail = detailId ? query.data?.reviews.find(({ id }) => id === detailId) : undefined;
  const reviewKey = `${month}-${memberId}`;
  const priorReview = query.data?.reviews.findLast((item) => item.month === month && item.memberId === memberId);
  const differenceReason = differenceDraft?.key === reviewKey ? differenceDraft.reason : priorReview?.workbookDifferenceReason ?? "";
  const withholding = withholdingDraft?.key === reviewKey ? withholdingDraft.reason : priorReview?.withholdingReason ?? "";
  const withholdOn = withholdSwitch?.key === reviewKey ? withholdSwitch.on : Boolean(priorReview?.withholdingReason);
  // Only people who may withhold can change it; for everyone else a saved withholding still applies to the preview.
  const effectiveWithholding = canWithhold ? (withholdOn ? withholding.trim() : "") : withholding.trim();
  const companyEntered = Object.values(company).some(Boolean);
  const companyTotals = useMemo<AllowanceTotals | null>(() => {
    const [baCentavos, paCentavos, pbCentavos] = [company.ba, company.pa, company.pb].map(parsePesoToCentavos);
    return baCentavos !== null && paCentavos !== null && pbCentavos !== null ? { baCentavos, paCentavos, pbCentavos } : null;
  }, [company]);
  const comparison: ComparisonRow[] = result && companyTotals ? [
    { key: "ba", label: "Basic allowance", calculated: result.baCentavos, company: companyTotals.baCentavos },
    { key: "pa", label: "Performance allowance", calculated: result.paCentavos, company: companyTotals.paCentavos },
    { key: "pb", label: "Performance bonus", calculated: result.pbCentavos, company: companyTotals.pbCentavos },
  ] : [];

  // Memoized: TanStack renders cell functions as components, so a new columns
  // array on every render would remount every cell.
  const reviewColumns = useMemo<ColumnDef<AllowanceReview, unknown>[]>(() => [
    { header: "Month", cell: ({ row }) => <span className="tw:font-semibold">{row.original.month}</span> },
    { header: "Leader", cell: ({ row }) => (
      <span className="tw:grid">
        <span>{row.original.memberName}</span>
        {row.original.clawbackOffsetCentavos ? <span className="tw:text-xs tw:text-muted-foreground">Payback taken out: <Money value={row.original.clawbackOffsetCentavos} /></span> : null}
      </span>
    ) },
    { header: "Basic Allowance", cell: ({ row }) => <Money value={row.original.result.baCentavos} /> },
    { header: "Performance Allowance", cell: ({ row }) => <Money value={row.original.result.paCentavos} /> },
    { header: "Performance Bonus", cell: ({ row }) => <Money value={row.original.result.pbCentavos} /> },
  ], []);

  function resetCopiedFigures() {
    setResult(undefined);
    setError(undefined);
    setSplitConfirmed(false);
    if (!copiedAssembly) return;
    setQualifying(empty);
    setExtended(empty);
    setCopiedAssembly(false);
  }

  /** Copy starts in Qualifying. Saving requires explicit review of both periods. */
  const copyAssembly = useCallback((row: LeaderAllowanceAssembly) => {
    setMemberId(row.memberId);
    setQualifying({
      days: String(row.eligibleDays),
      team: centavosInput(row.teamTcpCentavos),
      collections: centavosInput(row.teamCollectionsCentavos),
      assumed: centavosInput(row.assumedCreditCentavos),
    });
    setExtended({ days: "0", team: "", collections: "", assumed: "" });
    setCopiedAssembly(true);
    setSplitConfirmed(false);
    setResult(undefined);
    toast.success("Assembled month figures copied. Split them into the Qualifying and Extended stretches.");
  }, []);

  const assemblyColumns = useMemo<ColumnDef<LeaderAllowanceAssembly, unknown>[]>(() => [
    { header: "Leader", cell: ({ row }) => (
      <span className="tw:grid">
        <span>{row.original.memberName} · {row.original.position}</span>
        {row.original.vacantWholeMonth ? <span className="tw:text-xs tw:text-muted-foreground">Vacant the whole month: earns no allowance</span> : null}
      </span>
    ) },
    { header: "Eligible Days", cell: ({ row }) => <span>{row.original.eligibleDays} of {assembly.data?.daysInMonth ?? ""}</span> },
    { header: "Team Confirmed Value", cell: ({ row }) => <Money value={row.original.teamTcpCentavos} /> },
    { header: "Month Collections", cell: ({ row }) => <Money value={row.original.teamCollectionsCentavos} /> },
    { header: "Copy", cell: ({ row }) => <Button type="button" variant="outline" onClick={() => copyAssembly(row.original)}>Copy</Button> },
  ], [assembly.data?.daysInMonth, copyAssembly]);

  async function calculate(persist = false) {
    if (persist && save.isPending) return;
    setResult(undefined);
    setError(undefined);
    const match = MONTH_PATTERN.exec(month);
    if (!match) { setError("Choose the month."); return; }
    if (!member) { setError("Choose an Internal Seller (IST) leader."); return; }
    if (canWithhold && withholdOn && !withholding.trim()) { setError("Enter the reason for withholding the basic allowance."); return; }
    try {
      const daysInMonth = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
      const qualifyingValues = readStretch(qualifying);
      const extendedValues = readStretch(extended);
      if (persist) {
        if (copiedAssembly && !splitConfirmed) throw new Error("Confirm the Qualifying/Extended split before saving copied figures.");
        let companyFigures: AllowanceTotals | null = null;
        if (companyEntered) {
          if (!companyTotals) throw new Error("Enter all three company spreadsheet amounts, including any zeros.");
          companyFigures = companyTotals;
        }
        const review = await save.mutateAsync({
          month, memberId, qualifying: qualifyingValues, extended: extendedValues, workbook: companyFigures, workbookDifferenceReason: differenceReason,
          ...(canWithhold ? { withholdingReason: effectiveWithholding } : {}),
        });
        setResult(review.result);
        toast.success("Allowance review saved.");
      } else {
        setResult(calculateAllowances({
          daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[member.position],
          qualifying: qualifyingValues, extended: extendedValues, withholdBa: Boolean(effectiveWithholding),
        }));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not calculate allowances.");
    }
  }

  return (
    <>
      <div className="tw:flex tw:flex-col tw:gap-6">
        <StepBlock step={1} title="Month and Leader" connector>
          <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2">
            <MonthField label="Month" required value={month} onChange={(value) => { if (value !== month) resetCopiedFigures(); setMonth(value); }} />
            <SelectField label="Internal Seller (IST) leader" required value={memberId} onChange={(value) => { if (value !== memberId) resetCopiedFigures(); setMemberId(value); }}
              options={(query.data?.members ?? []).map(({ id, name, position }) => ({ value: id, label: `${name} · ${position}` }))} />
          </div>
        </StepBlock>
        {monthValid ? (
          <AdminSection title="Assembled Month Figures">
            <QueryState isLoading={assembly.isLoading} error={assembly.error}>
              <DataTable data={assembly.data?.leaders ?? []} columns={assemblyColumns} getRowId={(row) => row.memberId} caption="Assembled Month Figures" emptyText="No Internal Seller leaders found." />
              <p className="tw:text-sm tw:text-muted-foreground">Assembled from the month&apos;s business data:
              Closed Deal value and collections per leader, with vacant seats rolled up. Copy fills the form; split the
              figures into the Qualifying and Extended stretches, enter assumed collection credit, and confirm the
              appointment, window and engagement checks against the company spreadsheet.</p>
            </QueryState>
          </AdminSection>
        ) : null}
        <StepBlock step={2} title="Figures for Each Period" description="Fill in both periods. Leave a field empty if the amount is zero." connector>
          <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:lg:grid-cols-2">
            <Stretch title="Qualifying Period" value={qualifying} onChange={(value) => { setQualifying(value); setSplitConfirmed(false); setResult(undefined); }} />
            <Stretch title="Extended Period" value={extended} onChange={(value) => { setExtended(value); setSplitConfirmed(false); setResult(undefined); }} />
          </div>
        </StepBlock>
        <StepBlock step={3} title="Company Spreadsheet Figures (Optional)" description="Type the amounts from the company Excel file so the system can compare them.">
          <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-3">
            <MoneyField label="Basic allowance" value={company.ba} onChange={(ba) => { setCompany({ ...company, ba }); setResult(undefined); }} />
            <MoneyField label="Performance allowance" value={company.pa} onChange={(pa) => { setCompany({ ...company, pa }); setResult(undefined); }} />
            <MoneyField label="Performance bonus" value={company.pb} onChange={(pb) => { setCompany({ ...company, pb }); setResult(undefined); }} />
          </div>
          {companyEntered ? <TextField label="Explanation of any difference" hint="Fill this in if the system's amounts differ from the company spreadsheet." value={differenceReason} onChange={(reason) => setDifferenceDraft({ key: reviewKey, reason })} /> : null}
        </StepBlock>
        {canWithhold ? (
          <div className="tw:flex tw:flex-col tw:gap-4 tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-5 tw:shadow-(--shadow-soft)">
            <div className="tw:flex tw:items-center tw:gap-3">
              <Switch checked={withholdOn} onCheckedChange={(on) => { setWithholdSwitch({ key: reviewKey, on }); setResult(undefined); }} aria-label="Withhold basic allowance this month" />
              <p className="tw:text-sm tw:font-medium">Withhold basic allowance this month</p>
            </div>
            {withholdOn ? <TextField label="Reason for withholding" required value={withholding} onChange={(reason) => { setWithholdingDraft({ key: reviewKey, reason }); setResult(undefined); }} /> : null}
          </div>
        ) : null}
        {copiedAssembly ? (
          <div className="tw:flex tw:items-center tw:gap-3">
            <Switch checked={splitConfirmed} onCheckedChange={(on) => { setSplitConfirmed(on); setResult(undefined); }} aria-label="The Qualifying/Extended split above is correct" />
            <p className="tw:text-sm tw:font-medium">The Qualifying/Extended split above is correct</p>
          </div>
        ) : null}
        <div className="tw:flex tw:flex-wrap tw:gap-2">
          <Button type="button" loading={save.isPending} onClick={() => void calculate(true)}>Save Review</Button>
          <Button type="button" variant="info" onClick={() => void calculate()}>Calculate Allowances</Button>
        </div>
      </div>
      {error ? <p role="alert" className="tw:text-destructive">{error}</p> : null}
      {result ? (
        <section aria-label="Calculated allowances" className="tw:grid tw:gap-4">
          <h2 className="tw:text-lg tw:font-semibold">Calculated Allowances</h2>
          <AdminStatGrid columns={3}>
            <AdminStatCard label="Basic Allowance" value={<Money value={result.baCentavos} />} icon={Banknote} tone="brand" />
            <AdminStatCard label="Performance Allowance" value={<Money value={result.paCentavos} />} icon={TrendingUp} tone="info" />
            <AdminStatCard label="Performance Bonus" value={<Money value={result.pbCentavos} />} icon={Award} tone="success" />
          </AdminStatGrid>
          {companyTotals ? (
            <DataTable data={comparison} columns={comparisonColumns} getRowId={(row) => row.key} caption="Comparison with the Company Spreadsheet" emptyText="No figures to compare." />
          ) : (
            <p className="tw:text-sm tw:text-muted-foreground">Enter the three company spreadsheet amounts in step 3 to see how they compare.</p>
          )}
        </section>
      ) : null}
      <AdminSection title="Saved Reviews">
        <QueryState isLoading={query.isLoading} error={query.error}>
          <DataTable data={(query.data?.reviews ?? []).slice().reverse()} caption="Allowance Review History" emptyText="No reviews saved." getRowId={(row) => row.id}
            onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open allowance review for ${row.memberName}, ${row.month}`}
            columns={reviewColumns} />
        </QueryState>
      </AdminSection>
      <RecordDetailsSheet open={detail !== undefined} onClose={() => setDetailId(null)}
        title={detail ? detail.memberName : "Allowance Review"} subtitle={detail ? `${detail.month}, ${detail.position}` : undefined}
        icon={<Calculator />}
        sections={detail ? [
          {
            title: "Calculated",
            rows: [
              { label: "Basic allowance", value: <Money value={detail.result.baCentavos} /> },
              { label: "Performance allowance", value: <Money value={detail.result.paCentavos} /> },
              { label: "Performance bonus", value: <Money value={detail.result.pbCentavos} /> },
              { label: "Basic allowance withholding reason", value: detail.withholdingReason, wide: true },
            ],
          },
          {
            title: "Difference from the Company Spreadsheet",
            rows: detail.workbook ? [
              { label: "Basic allowance", value: <Money value={detail.result.baCentavos - detail.workbook.baCentavos} /> },
              { label: "Performance allowance", value: <Money value={detail.result.paCentavos - detail.workbook.paCentavos} /> },
              { label: "Performance bonus", value: <Money value={detail.result.pbCentavos - detail.workbook.pbCentavos} /> },
              ...(detail.workbookDifferenceReason ? [{ label: "Explanation", value: detail.workbookDifferenceReason, wide: true }] : []),
            ] : [{ label: "Company spreadsheet", value: "Awaiting company spreadsheet figures" }],
          },
        ] : []} />
    </>
  );
}

function Stretch({ title, value, onChange }: { title: string; value: Inputs; onChange: (value: Inputs) => void }) {
  return (
    <div className="tw:@container tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-border tw:bg-muted/30 tw:p-4">
      <h3 className="tw:m-0 tw:text-base tw:font-semibold">{title}</h3>
      <div className="tw:grid tw:gap-4 tw:@sm:grid-cols-2">
        <TextField label="Eligible days" hint="Number of days" inputMode="numeric" maxLength={2} transform={(next) => next.replace(/\D/g, "")} value={value.days} onChange={(days) => onChange({ ...value, days })} />
        <MoneyField label="Team confirmed sales value" hint="In pesos" value={value.team} onChange={(team) => onChange({ ...value, team })} />
        <MoneyField label="Collections" hint="In pesos" value={value.collections} onChange={(collections) => onChange({ ...value, collections })} />
        <MoneyField label="Collections credited to the leader" hint="In pesos" value={value.assumed} onChange={(assumed) => onChange({ ...value, assumed })} />
      </div>
    </div>
  );
}
