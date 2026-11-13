"use client";

import { useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { useOperation, useStayPoints } from "@/data/business-queries";
import type { PromoLedgerRow } from "@/data/contracts/promo-repository";
import { usePromoLedger, usePromos, useRecordPromoUse, useVoidPromoUse } from "@/data/promo-queries";
import { useOutlets } from "@/data/settings-queries";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { PointsField, SelectField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { humanize } from "@/shared/lib/humanize";
import { matchesSearch, optionsFrom } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";

/** Signed points for display: credits are positive, debits negative. */
const SIGN: Record<PromoLedgerRow["type"], 1 | -1> = { earn: 1, use_void: 1, earn_reversal: -1, use: -1, expiry: -1 };
export const signedPoints = (row: Pick<PromoLedgerRow, "type" | "points">) => SIGN[row.type] * row.points;

export function PromoPointsPage() {
  const canUse = useOperation("promo-points.use");
  const ledger = usePromoLedger();
  const voidUse = useVoidPromoUse();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [promoId, setPromoId] = useState("all");
  const [useOpen, setUseOpen] = useState(false);
  const [voiding, setVoiding] = useState<PromoLedgerRow | null>(null);

  const data = useMemo(() => ledger.data ?? [], [ledger.data]);
  const rows = useMemo(
    () => data.filter((row) => (type === "all" || row.type === type) && (promoId === "all" || row.promoId === promoId)
      && matchesSearch(search, row.customerName, row.vipNumber, row.promoName, row.outletName, row.sourceBillId, row.note)),
    [data, type, promoId, search],
  );
  const promoOptions = useMemo(() => [{ value: "all", label: "All promos" }, ...[...new Map(data.map((row) => [row.promoId, row.promoName])).entries()].map(([value, label]) => ({ value, label }))], [data]);

  const columns = useMemo<ColumnDef<PromoLedgerRow, unknown>[]>(() => [
    { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    { id: "customer", header: "Customer", cell: ({ row }) => row.original.customerName },
    { id: "vip", header: "VIP Number", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.vipNumber ?? "—" },
    { id: "promo", header: "Promo", cell: ({ row }) => row.original.promoName },
    { id: "type", header: "Type", cell: ({ row }) => `${humanize(row.original.type)}${row.original.voided ? " (voided)" : ""}` },
    { id: "outlet", header: "Outlet", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.outletName ?? "—" },
    { id: "points", header: "Points", cell: ({ row }) => signedPoints(row.original).toLocaleString("en-PH", { signDisplay: "exceptZero" }) },
    { id: "note", header: "Note", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.note ?? row.original.sourceBillId ?? "—" },
    {
      id: "actions", header: () => <span className="tw:sr-only">Actions</span>,
      cell: ({ row }) => (canUse && row.original.type === "use" && !row.original.voided
        ? <RowActionsMenu itemName={`${row.original.customerName} points use`} extraItems={[{ key: "void", label: "Void use", danger: true, onClick: () => setVoiding(row.original) }]} />
        : null),
    },
  ], [canUse]);

  return (
    <AdminPage
      anyOf={["stay-points"]}
      title="Promo Points"
      description="Every earn, reversal, use and void of Promo Points. This wallet is separate from Grant Stay Points."
      crumbs={[{ label: "Membership" }, { label: "Promos", href: "/admin/promos" }, { label: "Promo Points" }]}
      actions={canUse ? (
        <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setUseOpen(true)}>
          <Coins aria-hidden="true" /> Record points use
        </Button>
      ) : undefined}
    >
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search Promo Points" filters={[
        { label: "Promo filter", value: promoId, onChange: setPromoId, options: promoOptions },
        { label: "Entry type filter", value: type, onChange: setType, options: optionsFrom("All entry types", data.map((row) => row.type), humanize) },
      ]} />
      <DataTable<PromoLedgerRow> caption="Promo Points ledger" data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No Promo Points entries yet." loading={ledger.isLoading} />
      {useOpen ? <UseDialog onClose={() => setUseOpen(false)} /> : null}
      <ReasonDialog
        open={voiding !== null}
        title="Void this points use?"
        description={voiding ? `${voiding.points.toLocaleString("en-PH")} points used by ${voiding.customerName} go back to their Promo Points balance.` : ""}
        label="Reason for the void"
        confirmText="Void use"
        danger
        successText="Points use voided."
        onClose={() => setVoiding(null)}
        onSubmit={(reason) => voidUse.mutateAsync({ entryId: voiding!.id, reason })}
      />
    </AdminPage>
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
    <FormDialog open title="Record points use" description="Records Promo Points used by a member at an outlet. Grant Stay Points are not affected." submitText="Record use" pending={record.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      <SelectField label="Member" required value={membershipId} placeholder="Select a member"
        options={(memberships.data ?? []).filter((item) => item.cardId).map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.cardId}` }))}
        onChange={(value) => { setMembershipId(value); setError(undefined); }} />
      <SelectField label="Promo" required value={promoId} placeholder="Select a promo" options={active.map((item) => ({ value: item.id, label: item.name }))}
        onChange={(value) => { setPromoId(value); setOutletId(""); setError(undefined); }} />
      <SelectField label="Outlet" required value={outletId} placeholder="Select an outlet" disabled={!promo}
        options={(promo?.redeemOutletIds ?? []).map((id) => ({ value: id, label: outlets.get(id) ?? id }))}
        onChange={(value) => { setOutletId(value); setError(undefined); }} />
      <PointsField label="Points to use" required value={points} onChange={(value) => { setPoints(value); setError(undefined); }} />
      <TextField label="Note" value={note} maxLength={200} onChange={setNote} />
    </FormDialog>
  );
}
