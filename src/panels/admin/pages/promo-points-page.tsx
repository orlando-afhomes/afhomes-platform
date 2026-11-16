"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { useOperation, useStayPoints } from "@/data/business-queries";
import type { PromoLedgerRow } from "@/data/contracts/promo-repository";
import { usePromoLedger, usePromos, useRecordPromoUse, useVoidPromoUse } from "@/data/promo-queries";
import { useOutlets } from "@/data/settings-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { PointsField, SelectField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";

/** Signed points for display: credits are positive, debits negative. */
const SIGN: Record<PromoLedgerRow["type"], 1 | -1> = { earn: 1, use_void: 1, earn_reversal: -1, use: -1, expiry: -1 };
export const signedPoints = (row: Pick<PromoLedgerRow, "type" | "points">) => SIGN[row.type] * row.points;
const pointsText = (row: PromoLedgerRow) => signedPoints(row).toLocaleString("en-PH", { signDisplay: "exceptZero" });

const ENTRY_TYPE_LABELS: Record<PromoLedgerRow["type"], string> = {
  earn: "Earned", earn_reversal: "Earn reversed", use: "Used", use_void: "Use voided", expiry: "Expired",
};
const entryType = (row: PromoLedgerRow) => `${ENTRY_TYPE_LABELS[row.type]}${row.voided ? " (voided)" : ""}`;

/** "Record points use" (promo-points.use). Owns its form dialog. */
export function RecordPromoUseButton() {
  const canUse = useOperation("promo-points.use");
  const [open, setOpen] = useState(false);
  if (!canUse) return null;
  return (
    <>
      <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setOpen(true)}>
        <Coins aria-hidden="true" /> Record Points Use
      </Button>
      {open ? <UseDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Promo Points ledger with details; Void use needs promo-points.use. */
export function PromoPointsPanel() {
  const canUse = useOperation("promo-points.use");
  const ledger = usePromoLedger();
  const voidUse = useVoidPromoUse();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [promoId, setPromoId] = useState("all");
  const [voiding, setVoiding] = useState<PromoLedgerRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const data = useMemo(() => ledger.data ?? [], [ledger.data]);
  const rows = useMemo(
    () => data.filter((row) => (type === "all" || row.type === type) && (promoId === "all" || row.promoId === promoId)
      && matchesSearch(search, row.customerName, row.vipNumber, row.promoName, row.outletName, row.sourceBillId, row.note)),
    [data, type, promoId, search],
  );
  const promoOptions = useMemo(() => [{ value: "all", label: "All promos" }, ...[...new Map(data.map((row) => [row.promoId, row.promoName])).entries()].map(([value, label]) => ({ value, label }))], [data]);

  const columns = useMemo<ColumnDef<PromoLedgerRow, unknown>[]>(() => [
    { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    { id: "customer", header: "Cardholder", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
    { id: "points", header: "Points", cell: ({ row }) => <span className="tw:font-semibold">{pointsText(row.original)}</span> },
    { id: "type", header: "Type", cell: ({ row }) => entryType(row.original) },
    { id: "promo", header: "Promo", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.promoName },
    {
      id: "actions", header: "Actions",
      cell: ({ row }) => (
        <RowActionsMenu itemName={`${row.original.customerName} ${ENTRY_TYPE_LABELS[row.original.type].toLowerCase()} entry`}
          extraItems={canUse && row.original.type === "use" && !row.original.voided ? [{ key: "void", label: "Void Use", danger: true, onClick: () => setVoiding(row.original) }] : []} />
      ),
    },
  ], [canUse]);
  const detail = detailId ? data.find((row) => row.id === detailId) ?? null : null;

  return (
    <>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search Promo Points" filters={[
        { label: "Promo filter", value: promoId, onChange: setPromoId, options: promoOptions },
        { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", data.map((row) => row.type), (value) => ENTRY_TYPE_LABELS[value as PromoLedgerRow["type"]] ?? value) },
      ]} />
      <DataTable<PromoLedgerRow> caption="Promo Points Ledger" data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No Promo Points entries yet." loading={ledger.isLoading}
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open ${row.customerName} ${ENTRY_TYPE_LABELS[row.type].toLowerCase()} entry`} />
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.customerName ?? "Promo Points entry"}
        subtitle={detail ? entryType(detail) : undefined}
        sections={detail ? [{
          rows: [
            { label: "Date", value: formatDate(detail.date) },
            { label: "VIP Number", value: detail.vipNumber },
            { label: "Promo", value: detail.promoName },
            { label: "Type", value: entryType(detail) },
            { label: "Points", value: pointsText(detail) },
            { label: "Outlet", value: detail.outletName },
            { label: "Note", value: detail.note },
          ],
        }] : []}
      />
      <ReasonDialog
        open={voiding !== null}
        title="Void This Points Use?"
        description={voiding ? `${voiding.points.toLocaleString("en-PH")} points used by ${voiding.customerName} go back to their Promo Points balance.` : ""}
        label="Reason for the Void"
        confirmText="Void Use"
        danger
        successText="Points use voided."
        onClose={() => setVoiding(null)}
        onSubmit={(reason) => voidUse.mutateAsync({ entryId: voiding!.id, reason })}
      />
    </>
  );
}

function UseDialog({ onClose }: { onClose: () => void }) {
  const record = useRecordPromoUse();
  const memberships = useStayPoints();
  const promos = usePromos();
  const [membershipId, setMembershipId] = useState("");
  const [promoId, setPromoId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const active = (promos.data ?? []).filter((promo) => promo.status === "active");
  const promo = active.find((item) => item.id === promoId);
  const outletList = useOutlets();
  const outlets = useMemo(() => new Map((outletList.data ?? []).map((outlet) => [outlet.id, outlet.name])), [outletList.data]);

  const submit = async () => {
    const amount = Number(points.replace(/,/g, ""));
    if (!membershipId || !promoId || !outletId) return setError("Select the member, the promo and the outlet.");
    if (!Number.isSafeInteger(amount) || amount <= 0) return setError("Points to use must be a whole number above zero.");
    try {
      await record.mutateAsync({ membershipId, promoId, outletId, points: amount, note });
      toast.success("Points use recorded.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not record the use.");
    }
  };

  return (
    <FormDialog open title="Record Points Use" submitText="Record Use" pending={record.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <SelectField label="Member" required value={membershipId} placeholder="Select a member"
        options={(memberships.data ?? []).filter((item) => item.cardId).map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.cardId}` }))}
        onChange={(value) => { setMembershipId(value); setError(undefined); }} />
      <SelectField label="Promo" required value={promoId} placeholder="Select a promo" options={active.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(value) => { setPromoId(value); setOutletId(""); setError(undefined); }} />
      <SelectField label="Outlet" required value={outletId} placeholder="Select an outlet" disabled={!promo}
        options={(promo?.redeemOutletIds ?? []).map((id) => ({ value: id, label: outlets.get(id) ?? EMPTY }))}
        onChange={(value) => { setOutletId(value); setError(undefined); }} />
      <PointsField label="Points to use" required value={points} onChange={(value) => { setPoints(value); setError(undefined); }} />
      <TextField label="Note" value={note} maxLength={200} onChange={setNote} />
    </FormDialog>
  );
}
