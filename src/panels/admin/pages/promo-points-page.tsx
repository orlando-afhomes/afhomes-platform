"use client";


import { useQuery } from "@tanstack/react-query";
import type { CardHolder, MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { useRepositories } from "@/data/queries";
import { useDevIdentity } from "@/shared/providers/identity-provider";
import { useMemo, useState } from "react";
import { Ban, Coins, Gift, IdCard, Link2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useOperation, useStayPoints } from "@/data/business-queries";
import type { PromoLedgerRow } from "@/data/contracts/promo-repository";
import { usePromoBalances, usePromoLedger, usePromos, useRecordPromoUse, useVoidPromoUse } from "@/data/promo-queries";
import { useOutlets } from "@/data/settings-queries";
import { outletItems } from "../components/outlet-options";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { FormDialog, ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { CheckboxField, PointsField, SelectField, TextField } from "@/shared/forms/modern";
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
export function RecordPromoUseButton({ selected }: { selected?: MemberQrHolder } = {}) {
  const canUse = useOperation("promo-points.use");
  const { identity } = useDevIdentity();
  const [open, setOpen] = useState(false);
  if (!canUse || identity.roles.includes("gsd")) return null;
  return (
    <>
      <Button variant={selected ? "info" : undefined} className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setOpen(true)}>
        {selected ? <Link2 aria-hidden="true" /> : <Coins aria-hidden="true" />} Redeem Points
      </Button>
      {open ? <UseDialog selected={selected} onClose={() => setOpen(false)} /> : null}
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
          extraItems={canUse && row.original.type === "use" && !row.original.voided ? [{ key: "void", label: "Void Use", icon: Ban, danger: true, onClick: () => setVoiding(row.original) }] : []} />
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
      <QueryState isLoading={ledger.isLoading} error={ledger.error} onRetry={() => void ledger.refetch()}>
      <DataTable<PromoLedgerRow> caption="Promo Points Ledger" data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No Promo Points entries yet."
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open ${row.customerName} ${ENTRY_TYPE_LABELS[row.type].toLowerCase()} entry`} />
      </QueryState>
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

function UseDialog({ onClose, selected }: { onClose: () => void; selected?: MemberQrHolder }) {
  const record = useRecordPromoUse();
  const memberships = useStayPoints();
  const promos = usePromos();
  const [membershipId, setMembershipId] = useState(selected?.membershipId ?? "");
  const [holder, setHolder] = useState<CardHolder>(selected?.holder ?? "primary");
  const [identityChecked, setIdentityChecked] = useState(false);
  const [requestId] = useState(() => crypto.getRandomValues(new Uint32Array(4)).join("-"));
  const { confirmRun, dialog: confirmation } = useConfirmRun();
  const balances = usePromoBalances();
  const { memberQr } = useRepositories();
  const { identity } = useDevIdentity();
  const holders = useQuery({
    queryKey: ["bill-cardholders", identity.id, membershipId],
    queryFn: () => memberQr.identify(membershipId),
    enabled: Boolean(membershipId) && !selected,
  });
  const [promoId, setPromoId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | undefined>();

  const active = (promos.data ?? []).filter((promo) => promo.status !== "draft");
  const promo = active.find((item) => item.id === promoId);
  const available = balances.data?.find((item) => item.membershipId === membershipId)?.byPromo.find((item) => item.promoId === promoId)?.balance.available ?? 0;
  const outletList = useOutlets();
  const outlets = useMemo(() => new Map((outletList.data ?? []).map((outlet) => [outlet.id, outlet.name])), [outletList.data]);

  const submit = async () => {
    const amount = Number(points.replace(/,/g, ""));
    if (!membershipId || !promoId || !outletId) return setError("Select the member, the promo and the outlet.");
    if (!Number.isSafeInteger(amount) || amount <= 0) return setError("Points to use must be a whole number above zero.");
    if (!identityChecked) return setError("Confirm you checked the cardholder's ID.");
    if (balances.isPending) return setError("Wait for the current balance to load.");
    if (balances.isError) return setError("Could not load the current balance.");
    if (amount > available) return setError(`Only ${available.toLocaleString("en-PH")} Promo Points are available.`);
    confirmRun({
      title: "Use Promo Points?",
      description: `Use ${amount.toLocaleString("en-PH")} points from ${promo?.name} at ${outlets.get(outletId) ?? "the selected outlet"}. Expected balance: ${(available - amount).toLocaleString("en-PH")} points.`,
      confirmText: "Use Points",
      action: async () => {
        const entry = await record.mutateAsync({ membershipId, promoId, outletId, points: amount, note, requestId, holder, identityChecked, scannedCode: selected?.scannedCode });
        toast.success(`Reference ${entry.id}`);
        onClose();
      },
      successTitle: "Points use recorded.",
      errorTitle: "Could not record the use.",
    });
  };

  const membershipBalance = balances.data?.find((item) => item.membershipId === membershipId);
  const promoItems = active.map((item) => {
    const left = membershipBalance?.byPromo.find((entry) => entry.promoId === item.id)?.balance.available;
    return { value: item.id, label: item.name, icon: Gift, description: membershipId && left !== undefined ? `${left.toLocaleString("en-PH")} points available` : undefined };
  });
  const enteredPoints = Number(points.replace(/,/g, ""));
  const afterUse = Number.isSafeInteger(enteredPoints) && enteredPoints > 0 ? available - enteredPoints : null;

  return (
    <><FormDialog open title="Redeem Points" submitText="Redeem" pending={record.isPending} error={error} onClose={onClose} onSubmit={() => void submit()}>
      {selected ? (
        <div className="tw:flex tw:items-center tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-muted/40 tw:p-3">
          <span aria-hidden="true" className="tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:bg-(--color-brand-soft) tw:text-primary"><IdCard className="tw:size-5" /></span>
          <p className="tw:flex tw:min-w-0 tw:flex-col"><strong className="tw:truncate">{selected.holderName}</strong><span className="tw:truncate tw:text-xs tw:text-muted-foreground">VIP No. {selected.vipNumber}</span></p>
        </div>
      ) : <SelectField label="Member" required value={membershipId} placeholder="Select a member"
        options={(memberships.data ?? []).filter((item) => item.cardId).map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.cardId}` }))}
        onChange={(value) => { setMembershipId(value); setHolder("primary"); setIdentityChecked(false); setError(undefined); }} />}
      {!selected && Boolean(holders.data?.length) ? <SelectField label="Cardholder" required value={holder} options={holders.data!.map((item) => ({ value: item.holder, label: item.holderName }))} onChange={(value) => { setHolder(value === "supplementary" ? value : "primary"); setIdentityChecked(false); }} /> : null}
      <CheckboxField variant="card" icon={<ShieldCheck className="tw:size-5" />} label="I checked the cardholder’s ID" checked={identityChecked} onChange={setIdentityChecked} />
      <SelectField label="Promo" required value={promoId} placeholder="Select a promo" options={promoItems}
        onChange={(value) => { setPromoId(value); setOutletId(""); setError(undefined); }} />
      <SelectField label="Outlet" required value={outletId} placeholder="Select an outlet" disabled={!promo}
        options={outletItems((outletList.data ?? []).filter((outlet) => promo?.redeemOutletIds.includes(outlet.id)))}
        onChange={(value) => { setOutletId(value); setError(undefined); }} />
      <PointsField label="Points to use" required value={points} onChange={(value) => { setPoints(value); setError(undefined); }} />
      {promo ? (
        <dl className="tw:grid tw:grid-cols-2 tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-muted/40 tw:p-3 tw:text-sm" aria-label="Points summary">
          <div><dt className="tw:text-xs tw:text-muted-foreground">Available</dt><dd className="tw:font-semibold">{available.toLocaleString("en-PH")} points</dd></div>
          <div><dt className="tw:text-xs tw:text-muted-foreground">Left after this</dt><dd className={afterUse !== null && afterUse < 0 ? "tw:font-semibold tw:text-destructive" : "tw:font-semibold"}>{afterUse === null ? "—" : `${afterUse.toLocaleString("en-PH")} points`}</dd></div>
        </dl>
      ) : null}
      <TextField label="Note" value={note} maxLength={200} onChange={setNote} />
    </FormDialog>{confirmation}</>
  );
}
