"use client";

import { useMemo, useState } from "react";
import { useOperation, useReconcileHold, useStayPoints } from "@/data/business-queries";
import type { MembershipPoints } from "@/data/contracts/stay-points-repository";
import type { CycleSummary, PointsEntry } from "@/modules/stay-points/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { SelectField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { formatDate } from "@/shared/lib/format-date";
import { ModulePage } from "../components/module-page";

export function StayPointsPage() {
  const points = useStayPoints();
  const reconcile = useReconcileHold();
  const canReconcile = useOperation("stay-points.reconcile");
  const [picked, setPicked] = useState<string | undefined>();
  const [entryId, setEntryId] = useState<string | null>(null);
  const [cycleNo, setCycleNo] = useState<number | null>(null);
  const [reconciling, setReconciling] = useState<{ spendId: string; decision: "release" | "void" } | null>(null);

  const list = useMemo(() => points.data ?? [], [points.data]);
  const current: MembershipPoints | undefined = list.find((item) => item.membershipId === picked) ?? list[0];
  const spendsById = useMemo(() => new Map((current?.spends ?? []).map((spend) => [spend.id, spend])), [current]);

  const entryColumns = useMemo<ColumnDef<PointsEntry, unknown>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
      { id: "spend", header: "Verified spend", cell: ({ row }) => { const spend = spendsById.get(row.original.spendId); return spend ? <span><Money value={spend.amountCentavos} /><span className="tw:block tw:text-xs tw:text-muted-foreground">{spend.description}</span></span> : "—"; } },
      { id: "weekday", header: "Weekday", cell: ({ row }) => row.original.earnedWeekday.toLocaleString("en-PH") },
      { id: "weekend", header: "Weekend", cell: ({ row }) => row.original.earnedWeekend.toLocaleString("en-PH") },
      { id: "status", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.status} />{row.original.note ? <span className="tw:text-xs tw:text-muted-foreground">{row.original.note}</span> : null}</div> },
    ],
    [spendsById],
  );
  const reconcileItems = (entry: PointsEntry) =>
    canReconcile && entry.status === "held"
      ? [
          { key: "release", label: "Release held points", onClick: () => setReconciling({ spendId: entry.spendId, decision: "release" }) },
          { key: "void", label: "Void held points", danger: true, onClick: () => setReconciling({ spendId: entry.spendId, decision: "void" }) },
        ]
      : [];
  const entryDetail = entryId ? (current?.ledger.entries ?? []).find((item) => item.spendId === entryId) ?? null : null;
  const cycleDetail = cycleNo !== null ? (current?.ledger.cycles ?? []).find((item) => item.cycle === cycleNo) ?? null : null;
  const entrySpend = entryDetail ? spendsById.get(entryDetail.spendId) : undefined;
  const cycleColumns = useMemo<ColumnDef<CycleSummary, unknown>[]>(
    () => [
      { id: "cycle", header: "Cycle", cell: ({ row }) => `Cycle ${row.original.cycle}` },
      { id: "period", header: "Period", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${formatDate(row.original.startDate)} to ${formatDate(row.original.endDate)}` },
      { id: "spend", header: "Spend toward minimum", cell: ({ row }) => <span><Money value={row.original.verifiedSpendCentavos} /> of <Money value={row.original.minimumSpendCentavos} /></span> },
      { id: "min", header: "Minimum", cell: ({ row }) => <BizBadge status={row.original.minimumReached ? "confirmed" : "pending"} label={row.original.minimumReached ? "Reached" : "Not reached"} /> },
      { id: "wd", header: "Weekday", cell: ({ row }) => `${row.original.weekdayCredited.toLocaleString("en-PH")} / ${row.original.weekdayCap.toLocaleString("en-PH")}` },
      { id: "we", header: "Weekend", cell: ({ row }) => `${row.original.weekendCredited.toLocaleString("en-PH")} / ${row.original.weekendCap.toLocaleString("en-PH")}` },
    ],
    [],
  );

  const balances = current?.ledger.balances;
  return (
    <ModulePage anyOf={["stay-points"]} title="Stay Points" description="Points ledger by membership. ₱1 of verified resort spend earns 1 point, split 70% Weekday and 30% Weekend." crumbs={[{ label: "Stay Points" }]}>
      <InfoNote title="Redemption is not available">Redemption and Services are disabled. Points are earned and tracked here but cannot be redeemed or reserved yet, and 1 point is not a peso value.</InfoNote>
      <QueryState isLoading={points.isLoading} error={points.error}>
        {!current ? (
          <InfoNote>No active memberships are visible to this account.</InfoNote>
        ) : (
          <>
            <SelectField label="Membership" value={current.membershipId} options={list.map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.productCode}${item.cardId ? ` · ${item.cardId}` : ""}` }))} onChange={setPicked} showSearch={list.length > 6} />
            {current.financialHold ? <InfoNote title="Financial Hold">New VIP benefit usage is restricted while this membership has a Financial Hold. Finance reconciliation restores eligibility. Points already earned stay on the ledger.</InfoNote> : null}
            <StatTiles items={[{ label: "Spendable weekday", value: balances?.spendableWeekday.toLocaleString("en-PH") }, { label: "Spendable weekend", value: balances?.spendableWeekend.toLocaleString("en-PH") }, { label: "Pending", value: balances?.pending.toLocaleString("en-PH"), hint: "Unlocks when the cycle minimum is reached" }, { label: "Held", value: balances?.held.toLocaleString("en-PH"), hint: "Awaiting Finance reconciliation" }, { label: "Remaining capacity", value: balances?.remainingCapacity.toLocaleString("en-PH"), hint: "Current cycle" }, { label: "Redeemed", value: balances?.redeemed.toLocaleString("en-PH"), hint: "Redemption disabled" }]} />
            <Section title="Cycles" description="Caps apply per bucket and in total. Redeeming never gives cap back, and refund-driven cap restoration is not defined yet.">
              <DataTable data={current.ledger.cycles} columns={cycleColumns} getRowId={(row) => String(row.cycle)} emptyText="No spend has been recorded in a cycle yet." caption="Cycles" onRowOpen={(row) => setCycleNo(row.cycle)} getRowLabel={(row) => `Open cycle ${row.cycle}`} rowActions={(row) => <RowActionsMenu itemName={`cycle ${row.cycle}`} onView={() => setCycleNo(row.cycle)} />} />
            </Section>
            <Section title="Ledger" description="Entries come from Finance-verified direct resort spending. Fractional amounts are blocked until a rounding policy is approved.">
              <DataTable data={current.ledger.entries} columns={entryColumns} getRowId={(row) => row.spendId} emptyText="No points entries." caption="Points ledger" onRowOpen={(row) => setEntryId(row.spendId)} getRowLabel={(row) => `Open points entry of ${formatDate(row.date)}`} rowActions={(row) => <RowActionsMenu itemName={`points entry of ${formatDate(row.date)}`} onView={() => setEntryId(row.spendId)} extraItems={reconcileItems(row)} />} />
            </Section>
          </>
        )}
      </QueryState>
      <RecordDetailsSheet
        open={cycleDetail !== null}
        onClose={() => setCycleNo(null)}
        title={cycleDetail ? `Cycle ${cycleDetail.cycle}` : "Cycle"}
        subtitle={cycleDetail ? `${formatDate(cycleDetail.startDate)} to ${formatDate(cycleDetail.endDate)}` : undefined}
        badge={cycleDetail ? <BizBadge status={cycleDetail.minimumReached ? "confirmed" : "pending"} label={cycleDetail.minimumReached ? "Minimum reached" : "Minimum not reached"} /> : undefined}
        sections={
          cycleDetail
            ? [
                {
                  title: "Spend",
                  rows: [
                    { label: "Verified spend", value: <Money value={cycleDetail.verifiedSpendCentavos} /> },
                    { label: "Minimum", value: <Money value={cycleDetail.minimumSpendCentavos} /> },
                  ],
                },
                {
                  title: "Points credited",
                  rows: [
                    { label: "Weekday", value: `${cycleDetail.weekdayCredited.toLocaleString("en-PH")} of ${cycleDetail.weekdayCap.toLocaleString("en-PH")}` },
                    { label: "Weekend", value: `${cycleDetail.weekendCredited.toLocaleString("en-PH")} of ${cycleDetail.weekendCap.toLocaleString("en-PH")}` },
                  ],
                },
              ]
            : []
        }
      />
      <RecordDetailsSheet
        open={entryDetail !== null}
        onClose={() => setEntryId(null)}
        title={entryDetail ? `Points entry, ${formatDate(entryDetail.date)}` : "Points entry"}
        subtitle={entrySpend?.description}
        badge={entryDetail ? <BizBadge status={entryDetail.status} /> : undefined}
        sections={
          entryDetail
            ? [
                {
                  title: "Entry",
                  rows: [
                    { label: "Verified spend", value: entrySpend ? <Money value={entrySpend.amountCentavos} /> : null },
                    { label: "Weekday points", value: entryDetail.earnedWeekday.toLocaleString("en-PH") },
                    { label: "Weekend points", value: entryDetail.earnedWeekend.toLocaleString("en-PH") },
                    { label: "Note", value: entryDetail.note },
                  ],
                },
              ]
            : []
        }
        footer={entryDetail && reconcileItems(entryDetail).length > 0 ? reconcileItems(entryDetail).map((item) => <Button key={item.key} type="button" variant={item.danger ? "danger" : "outline"} onClick={item.onClick}>{item.label}</Button>) : undefined}
      />
      <ReasonDialog open={reconciling !== null} title={reconciling?.decision === "release" ? "Release held points" : "Void held points"} description={reconciling?.decision === "release" ? "The refund was reversed, so the points are restored to Pending or Spendable." : "The points are removed. Cap capacity is not restored."} confirmText={reconciling?.decision === "release" ? "Release" : "Void"} danger={reconciling?.decision === "void"} successText="Held points reconciled." onClose={() => setReconciling(null)} onSubmit={(reason) => (reconciling ? reconcile.mutateAsync({ spendId: reconciling.spendId, decision: reconciling.decision, reason }) : Promise.resolve())} />
    </ModulePage>
  );
}
