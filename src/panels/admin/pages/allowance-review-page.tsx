"use client";

import { useState } from "react";
import { useAllowanceReviews, useOperation, useSaveAllowanceReview } from "@/data/business-queries";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceStretch, type AllowanceTotals } from "@/modules/commissions/allowances";
import { AdminPage, AdminSection, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { MoneyField, SelectField, TextField } from "@/shared/forms/modern";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/shared/components/modern/data-table";
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

export function AllowanceReviewPage() {
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
  const reviewKey = `${month}-${memberId}`;
  const priorReview = query.data?.reviews.findLast((item) => item.month === month && item.memberId === memberId);
  const withholding = withholdingDraft?.key === reviewKey ? withholdingDraft.reason : priorReview?.withholdingReason ?? "";

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
          month, memberId, qualifying: qualifyingValues, extended: extendedValues, workbook: workbookTotals,
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
    <AdminPage anyOf={["commissions"]} allowed={allowed} title="Allowance Review"
      description="Compare the monthly allowance calculation with the company workbook."
      crumbs={[{ label: "Commissions", href: "/admin/commissions" }, { label: "Allowance Review" }]}>
      <InfoNote title="Workbook comparison">Enter the eligible days and totals from the company workbook. The calculation uses the published position terms.</InfoNote>
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
          <MoneyField label="Workbook BA" value={workbook.ba} onChange={(ba) => setWorkbook({ ...workbook, ba })} />
          <MoneyField label="Workbook PA" value={workbook.pa} onChange={(pa) => setWorkbook({ ...workbook, pa })} />
          <MoneyField label="Workbook PB" value={workbook.pb} onChange={(pb) => setWorkbook({ ...workbook, pb })} />
        </div>
        {canWithhold ? <TextField label="BA withholding reason" value={withholding} onChange={(reason) => { setWithholdingDraft({ key: reviewKey, reason }); setResult(undefined); }} /> : null}
      </AdminSection>
      <div className="tw:flex tw:flex-wrap tw:gap-2">
        <Button type="button" variant="outline" onClick={() => void calculate()}>Calculate allowances</Button>
        <Button type="button" disabled={save.isPending} onClick={() => void calculate(true)}>Save review</Button>
      </div>
      {error ? <p role="alert" className="tw:text-destructive">{error}</p> : null}
      {result ? <AdminStatGrid columns={3}>
        <AdminStatCard label="Basic allowance (BA)" value={<Money value={result.baCentavos} />} icon={Banknote} tone="neutral" />
        <AdminStatCard label="Performance allowance (PA)" value={<Money value={result.paCentavos} />} icon={Banknote} tone="neutral" />
        <AdminStatCard label="Performance bonus (PB)" value={<Money value={result.pbCentavos} />} icon={Banknote} tone="neutral" />
      </AdminStatGrid> : null}
      <AdminSection title="Saved reviews">
        <QueryState isLoading={query.isLoading} error={query.error}>
          <DataTable data={(query.data?.reviews ?? []).slice().reverse()} caption="Allowance review history" emptyText="No reviews saved." getRowId={(row) => row.id} columns={[
            { header: "Month", accessorKey: "month" },
            { header: "Leader", accessorKey: "memberName" },
            { header: "BA", cell: ({ row }) => <Money value={row.original.result.baCentavos} /> },
            { header: "PA", cell: ({ row }) => <Money value={row.original.result.paCentavos} /> },
            { header: "PB", cell: ({ row }) => <Money value={row.original.result.pbCentavos} /> },
            { header: "Workbook difference", cell: ({ row }) => row.original.workbook ? (
              <div className="tw:grid tw:gap-1">
                <span>BA <Money value={row.original.result.baCentavos - row.original.workbook.baCentavos} /></span>
                <span>PA <Money value={row.original.result.paCentavos - row.original.workbook.paCentavos} /></span>
                <span>PB <Money value={row.original.result.pbCentavos - row.original.workbook.pbCentavos} /></span>
              </div>
            ) : "Awaiting workbook figures" },
          ]} />
        </QueryState>
      </AdminSection>
    </AdminPage>
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
