"use client";

import { useMemo, useState } from "react";
import { useAllowanceReviews, useAssembledAllowanceInputs, useOperation, useSaveAllowanceReview } from "@/data/business-queries";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview, type AllowanceStretch } from "@/modules/commissions/allowances";
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
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

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


function centavosInput(value: number): string {
  const amount = Math.abs(value);
  return `${value < 0 ? "-" : ""}${Math.trunc(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function toInputs(part: AllowanceStretch): Inputs {
  return {
    days: String(part.days),
    team: centavosInput(part.teamTcpCentavos),
    collections: centavosInput(part.collectionsCentavos),
    assumed: centavosInput(part.assumedCreditCentavos),
  };
}

export function AllowanceReviewPanel() {
  const allowed = useOperation("commission.approve");
  const query = useAllowanceReviews(allowed);
  const save = useSaveAllowanceReview();
  const [memberId, setMemberId] = useState("");
  const [month, setMonth] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const member = query.data?.members.find(({ id }) => id === memberId);
  const detail = query.data?.reviews.find(({ id }) => id === detailId);
  const prior = query.data?.reviews.findLast((item) => item.month === month && item.memberId === memberId);
  const selected = allowed && Boolean(member) && MONTH_PATTERN.test(month);
  const assembly = useAssembledAllowanceInputs(month, selected && !prior);
  const row = assembly.data?.month === month ? assembly.data.leaders.find((item) => item.memberId === memberId) : undefined;
  const aaByMember = useMemo(() => new Map((query.data?.members ?? []).map(({ id, aaNumber }) => [id, aaNumber])), [query.data?.members]);
  const reviewColumns = useMemo<ColumnDef<AllowanceReview, unknown>[]>(() => [
    { header: "Month", cell: ({ row }) => <span className="tw:font-semibold">{row.original.month}</span> },
    { header: "Leader", cell: ({ row }) => (
      <span className="tw:grid">
        {aaByMember.get(row.original.memberId) ? <span className="tw:text-xs tw:font-semibold tw:tabular-nums tw:text-muted-foreground">{aaByMember.get(row.original.memberId)}</span> : null}
        <span>{row.original.memberName}</span>
        {row.original.clawbackOffsetCentavos ? <span className="tw:text-xs tw:text-muted-foreground">Payback taken out: <Money value={row.original.clawbackOffsetCentavos} /></span> : null}
      </span>
    ) },
    { header: "Basic Allowance", cell: ({ row }) => <Money value={row.original.result.baCentavos} /> },
    { header: "Performance Allowance", cell: ({ row }) => <Money value={row.original.result.paCentavos} /> },
    { header: "Performance Bonus", cell: ({ row }) => <Money value={row.original.result.pbCentavos} /> },
  ], [aaByMember]);


  return (
    <>
      <StepBlock step={1} title="Month and Leader" connector={selected}>
        <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2">
          <MonthField label="Month" required value={month} onChange={setMonth} />
          <SelectField label="Internal Seller (IST) leader" required value={memberId} onChange={setMemberId}
            // The AA number comes first and is part of the label, so typing it finds the leader (it identifies them better than the name).
            options={(query.data?.members ?? []).map(({ id, name, position, aaNumber }) => ({ value: id, label: `${aaNumber ? `${aaNumber} · ` : ""}${name} · ${position}` }))} />
        </div>
      </StepBlock>
      {selected && member ? (
        <QueryState isLoading={!prior && assembly.isLoading} error={prior || row ? null : assembly.error} onRetry={() => void assembly.refetch()}>
          {prior || row ? <AllowanceDraft key={`${month}:${memberId}`} month={month} memberId={memberId} position={member.position} prior={prior} row={row} save={save} /> :
            <p role="status">No allowance figures are available for this leader and month.</p>}
        </QueryState>
      ) : null}
      <AdminSection title="Saved Reviews">
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => void query.refetch()}>
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

        ] : []} />
    </>
  );
}

function AllowanceDraft({ month, memberId, position, prior, row, save }: {
  month: string;
  memberId: string;
  position: AllowanceReview["position"];
  prior?: AllowanceReview;
  row?: LeaderAllowanceAssembly;
  save: ReturnType<typeof useSaveAllowanceReview>;
}) {
  const canWithhold = useOperation("commission.rates.manage");
  const [qualifying, setQualifying] = useState<Inputs>(() => prior ? toInputs(prior.qualifying) : row ? {
    days: String(row.eligibleDays), team: centavosInput(row.teamTcpCentavos),
    collections: centavosInput(row.teamCollectionsCentavos), assumed: "",
  } : empty);
  const [extended, setExtended] = useState<Inputs>(() => prior ? toInputs(prior.extended) : empty);
  const [confirmed, setConfirmed] = useState(false);
  const [withholding, setWithholding] = useState(prior?.withholdingReason ?? "");
  const [withholdOn, setWithholdOn] = useState(Boolean(prior?.withholdingReason));
  const [saveError, setSaveError] = useState("");
  const withholdingReason = withholdOn ? withholding.trim() : "";
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  function preview() {
    if (!confirmed) return null;
    try {
      if (withholdOn && !withholdingReason) throw new Error("Enter the reason for withholding the basic allowance.");
      const values = { qualifying: readStretch(qualifying), extended: readStretch(extended) };
      return { values, result: calculateAllowances({ daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[position], ...values, withholdBa: Boolean(withholdingReason) }) };
    } catch (failure) {
      return { error: failure instanceof Error ? failure.message : "Could not calculate allowances." };
    }
  }

  const calculation = preview();
  const result = calculation?.result;
  const error = calculation?.error || saveError;
  function clearConfirmation() {
    setConfirmed(false);
    setSaveError("");
  }

  async function saveReview() {
    if (!calculation?.values || save.isPending) return;
    setSaveError("");
    try {
      await save.mutateAsync({ month, memberId, ...calculation.values, workbook: null, ...(canWithhold ? { withholdingReason } : {}) });
      toast.success("Allowance review saved.");
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : "Could not save the allowance review.");
    }
  }

  return (
    <div className="tw:flex tw:flex-col tw:gap-6">
      <StepBlock step={2} title="Figures for Each Period" description={prior
        ? "The latest saved review fills this draft. Check eligible days against appointment, suspension, and end dates, then confirm both periods."
        : "Monthly totals start in the Qualifying Period. Check eligible days against appointment, suspension, and end dates. Split the totals between periods, and enter any collections credited to the leader. Blank fields count as zero."}>
        <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:lg:grid-cols-2">
          <Stretch title="Qualifying Period" value={qualifying} onChange={(value) => { setQualifying(value); clearConfirmation(); }} />
          <Stretch title="Extended Period" value={extended} onChange={(value) => { setExtended(value); clearConfirmation(); }} />
        </div>
      </StepBlock>
      {canWithhold ? (
        <div className="tw:flex tw:flex-col tw:gap-3">
          <label className="tw:flex tw:items-center tw:gap-3">
            <Switch checked={withholdOn} onCheckedChange={(on) => { setWithholdOn(on); clearConfirmation(); }} />
            <span>Withhold basic allowance this month</span>
          </label>
          {withholdOn ? <TextField label="Reason for withholding" required value={withholding} onChange={(reason) => { setWithholding(reason); clearConfirmation(); }} /> : null}
        </div>
      ) : null}
      <label className="tw:flex tw:items-center tw:gap-3">
        <Switch checked={confirmed} onCheckedChange={(on) => { setConfirmed(on); setSaveError(""); }} />
        <span>The figures for both periods are correct</span>
      </label>
      {error ? <p role="alert" className="tw:text-destructive">{error}</p> : null}
      {result ? (
        <section aria-label="Calculated allowances" className="tw:grid tw:gap-4">
          <h2 className="tw:text-lg tw:font-semibold">Calculated Allowances</h2>
          <AdminStatGrid columns={3}>
            <AdminStatCard label="Basic Allowance" value={<Money value={result.baCentavos} />} icon={Banknote} tone="brand" />
            <AdminStatCard label="Performance Allowance" value={<Money value={result.paCentavos} />} icon={TrendingUp} tone="info" />
            <AdminStatCard label="Performance Bonus" value={<Money value={result.pbCentavos} />} icon={Award} tone="success" />
          </AdminStatGrid>
        </section>
      ) : null}
      <div>
        <Button type="button" disabled={!result} loading={save.isPending} onClick={() => void saveReview()}>Save Review</Button>
      </div>
    </div>
  );
}

function Stretch({ title, value, onChange }: { title: string; value: Inputs; onChange: (value: Inputs) => void }) {
  return (
    <div className="tw:@container tw:flex tw:flex-col tw:gap-4 tw:rounded-xl tw:border tw:border-border tw:bg-muted/30 tw:p-4">
      <h3 className="tw:m-0 tw:text-base tw:font-semibold">{title}</h3>
      <div className="tw:grid tw:items-end tw:gap-4 tw:@sm:grid-cols-2">
        <TextField label="Eligible days" hint="Number of days" inputMode="numeric" maxLength={2} transform={(next) => next.replace(/\D/g, "")} value={value.days} onChange={(days) => onChange({ ...value, days })} />
        <MoneyField label="Team confirmed sales value" hint="In pesos" value={value.team} onChange={(team) => onChange({ ...value, team })} />
        <MoneyField label="Collections" hint="In pesos" value={value.collections} onChange={(collections) => onChange({ ...value, collections })} />
        <MoneyField label="Collections credited to the leader" hint="In pesos" value={value.assumed} onChange={(assumed) => onChange({ ...value, assumed })} />
      </div>
    </div>
  );
}
