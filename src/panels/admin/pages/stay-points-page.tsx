"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useOperation, useStayPoints, useStayPointsAction, useStayPointsVenues } from "@/data/business-queries";
import type { StayPointsAction } from "@/data/contracts/stay-points-repository";
import { WAIVER_GROUNDS } from "@/modules/stay-points/types";
import type { GiftLedgerEntry, PointsTranche, ResortSpend, WaiverRequest } from "@/modules/stay-points/types";
import { AdminPage, AdminSectionHeading, AdminStatCard, AdminStatGrid } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Clock, Coins, Gift, Wallet } from "lucide-react";
import { PromoPointsBalanceCard } from "../components/promo-points-balance-card";

const TRANCHE_LABELS: Record<PointsTranche["status"], string> = {
  unreleased: "Unreleased", released: "Released", released_by_waiver: "Released by waiver",
  non_activated: "Non-activated", forfeited: "Forfeited",
};

const trancheColumns: ColumnDef<PointsTranche, unknown>[] = [
  { id: "year", header: "Tranche", cell: ({ row }) => row.original.number },
  { id: "period", header: "Spend period", cell: ({ row }) => `${formatDate(row.original.startDate)} to ${formatDate(row.original.endDate)}` },
  { id: "due", header: "Due", cell: ({ row }) => formatDate(row.original.dueDate) },
  { id: "spend", header: "Qualifying spend", cell: ({ row }) => <><Money value={row.original.qualifyingCentavos} /> of <Money value={row.original.minimumCentavos} /></> },
  { id: "status", header: "Status", cell: ({ row }) => TRANCHE_LABELS[row.original.status] },
  { id: "released", header: "Released on", cell: ({ row }) => formatDate(row.original.releaseDate) },
];

const billColumns: ColumnDef<ResortSpend, unknown>[] = [
  { id: "or", header: "Official receipt", cell: ({ row }) => row.original.verificationRef ?? "—" },
  { id: "date", header: "Bill date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "spend", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
];

const giftActions: Record<GiftLedgerEntry["type"], string> = {
  release: "Released", waiver_release: "Released by waiver", expiry: "Expired", transfer: "Forfeited on transfer",
};

const giftColumns: ColumnDef<GiftLedgerEntry, unknown>[] = [
  { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "year", header: "Tranche", accessorKey: "tranche" },
  { id: "bucket", header: "Bucket", cell: ({ row }) => row.original.bucket === "weekday" ? "Weekday" : "Weekend" },
  { id: "action", header: "Action", cell: ({ row }) => giftActions[row.original.type] },
  { id: "points", header: "Points", cell: ({ row }) => row.original.points.toLocaleString("en-PH") },
  { id: "reference", header: "Reference", cell: ({ row }) => row.original.reference ?? "—" },
];

const waiverColumns: ColumnDef<WaiverRequest, unknown>[] = [
  { id: "year", header: "Tranche", cell: ({ row }) => row.original.tranche },
  { id: "date", header: "Request received", cell: ({ row }) => formatDate(row.original.date) },
  { id: "ground", header: "Ground", cell: ({ row }) => row.original.ground },
  { id: "reference", header: "Document reference", cell: ({ row }) => row.original.supportingReference },
  { id: "status", header: "Decision", cell: ({ row }) => row.original.decision ? (row.original.decision.granted ? "Granted" : "Refused") : "Pending" },
  { id: "release", header: "Release date", cell: ({ row }) => formatDate(row.original.decision?.releaseDate ?? null) },
];

type Dialog = { kind: "bill" } | { kind: "refund"; id: string } | { kind: "request" }
  | { kind: "grant" | "refuse"; id: string };

export function StayPointsPage() {
  const points = useStayPoints();
  const action = useStayPointsAction();
  const canEnter = useOperation("stay-points.enter");
  const canApprove = useOperation("stay-points.approve");
  const canRefund = useOperation("stay-points.refund");
  const canWaive = useOperation("stay-points.waiver");
  const venues = useStayPointsVenues(canEnter);
  const { confirmRun, dialog: confirmation } = useConfirmRun();
  const [picked, setPicked] = useState<string | undefined>();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const list = points.data ?? [];
  const current = list.find((item) => item.membershipId === picked) ?? list[0];
  const ledger = current?.ledger;
  const balances = ledger?.balances;
  const availableWaivers = ledger?.tranches.filter((item) => item.status === "non_activated" &&
    !current?.waivers.some((waiver) => waiver.tranche === item.number && waiver.decision?.granted !== false)) ?? [];

  return (
    <AdminPage anyOf={["stay-points"]} title="Stay Points" description="Annual Welcome Gifts are released in fixed yearly amounts when qualifying spend reaches the required minimum." crumbs={[{ label: "Stay Points" }]}>
      <QueryState isLoading={points.isLoading} error={points.error}>
        {!current ? <InfoNote>No memberships with a VIP Number are visible.</InfoNote> : (
          <>
            <SelectField label="Membership" value={current.membershipId} options={list.map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.productCode} · ${item.cardId}` }))} onChange={setPicked} />
            {current.financialHold ? <InfoNote>Financial Hold pauses new point releases and redemption.</InfoNote> : null}
            <p className="tw:text-sm">Points Activation Date: {ledger?.padDate ? formatDate(ledger.padDate) : "Awaiting first redemption or second Card Claim Date anniversary"}</p>
            <AdminStatGrid columns={3}>
              <AdminStatCard label="Available weekday" value={balances?.spendableWeekday.toLocaleString("en-PH") ?? "0"} icon={Wallet} tone="success" />
              <AdminStatCard label="Available weekend" value={balances?.spendableWeekend.toLocaleString("en-PH") ?? "0"} icon={Coins} tone="success" />
              <AdminStatCard label="Released" value={balances?.released.toLocaleString("en-PH") ?? "0"} icon={Gift} />
              <AdminStatCard label="Reserved" value={balances?.reserved.toLocaleString("en-PH") ?? "0"} icon={Clock} />
              <AdminStatCard label="Redeemed" value={balances?.redeemed.toLocaleString("en-PH") ?? "0"} icon={Gift} />
              <AdminStatCard label="Forfeited" value={balances?.forfeited.toLocaleString("en-PH") ?? "0"} icon={Clock} />
            </AdminStatGrid>
            <PromoPointsBalanceCard membershipId={current.membershipId} />
            <AdminSectionHeading title="Annual Welcome Gift" />
            <DataTable data={ledger?.tranches ?? []} columns={trancheColumns} getRowId={(row) => String(row.number)} emptyText="Tranche dates appear after the Points Activation Date is set." caption="Annual Welcome Gift" />
            <AdminSectionHeading title="Gift history" />
            <DataTable data={ledger?.entries ?? []} columns={giftColumns} getRowId={(row) => `${row.tranche}:${row.bucket}:${row.type}`} emptyText="No gift movements recorded." caption="Gift history" />
            <AdminSectionHeading title="Resort bills" />
            {canEnter ? <Button type="button" onClick={() => setDialog({ kind: "bill" })}>Enter resort bill</Button> : null}
            <DataTable data={current.spends} columns={billColumns} getRowId={(row) => row.id} emptyText="No resort bills recorded." caption="Resort bills"
              rowActions={(row) => canApprove && row.status === "submitted" ? <Button type="button" size="sm" onClick={() => confirmRun({
                title: "Approve this resort bill?", description: "Its qualifying spend will count in the period of its bill date.",
                confirmText: "Approve bill", successTitle: "Resort bill approved.", errorTitle: "Could not approve the bill",
                action: () => action.mutateAsync({ action: "approve", spendId: row.id }),
              })}>Approve bill</Button> : canRefund && row.status === "verified" ? <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "refund", id: row.id })}>Record refund</Button> : null} />
            {current.refunds.length ? (
              <DataTable data={current.refunds} getRowId={(row) => row.id} caption="Refund history" emptyText="No refunds." columns={[
                { id: "reference", header: "Official receipt", cell: ({ row }) => current.spends.find((bill) => bill.id === row.original.spendId)?.verificationRef ?? "—" },
                { id: "date", header: "Refund date", cell: ({ row }) => formatDate(row.original.date) },
                { id: "amount", header: "Qualifying amount refunded", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
                { id: "reason", header: "Reason", accessorKey: "reason" },
              ]} />
            ) : null}
            {canWaive || current.waivers.length ? <AdminSectionHeading title="Compassionate Waivers" /> : null}
            {canWaive && availableWaivers.length ? <Button type="button" onClick={() => setDialog({ kind: "request" })}>Record waiver request</Button> : null}
            {canWaive || current.waivers.length ? <DataTable data={current.waivers} columns={waiverColumns} getRowId={(row) => row.id} caption="Compassionate Waivers" emptyText="No waiver requests."
              rowActions={(row) => canWaive && !row.decision ? <div className="tw:flex tw:gap-2">
                <Button type="button" size="sm" onClick={() => setDialog({ kind: "grant", id: row.id })}>Grant</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setDialog({ kind: "refuse", id: row.id })}>Refuse</Button>
              </div> : null} /> : null}
            {dialog ? <StayPointsDialog dialog={dialog} membershipId={current.membershipId} gold={current.productCode === "G1"} venues={venues.data ?? []}
              tranches={availableWaivers} pending={action.isPending} submit={action.mutateAsync} onClose={() => setDialog(null)} /> : null}
          </>
        )}
      </QueryState>
      {confirmation}
    </AdminPage>
  );
}

function StayPointsDialog({ dialog, membershipId, gold, venues, tranches, pending, submit, onClose }: {
  dialog: Dialog; membershipId: string; gold: boolean; venues: { id: string; name: string }[]; tranches: PointsTranche[];
  pending: boolean; submit: (input: StayPointsAction) => Promise<unknown>; onClose: () => void;
}) {
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [excluded, setExcluded] = useState("");
  const [venue, setVenue] = useState("");
  const [holder, setHolder] = useState<"primary" | "supplementary">("primary");
  const [reason, setReason] = useState("");
  const [tranche, setTranche] = useState("");
  const [ground, setGround] = useState<WaiverRequest["ground"]>();
  const [error, setError] = useState<string>();

  const titles = { bill: "Enter resort bill", refund: "Record resort bill refund", request: "Record waiver request", grant: "Grant Compassionate Waiver", refuse: "Refuse Compassionate Waiver" };
  const save = async () => {
    try {
      if (dialog.kind === "bill" || dialog.kind === "refund") {
        const amountCentavos = parsePesoToCentavos(amount);
        if (amountCentavos === null) throw new Error("Enter the amount in pesos.");
        if (dialog.kind === "refund") await submit({ action: "refund", spendId: dialog.id, date, amountCentavos, reason });
        else {
          const excludedCentavos = excluded ? parsePesoToCentavos(excluded) : 0;
          if (excludedCentavos === null) throw new Error("Enter exclusions in pesos.");
          await submit({ action: "enter", membershipId, venueId: venue, date, reference, grossCentavos: amountCentavos, excludedCentavos, holder, description: reason });
        }
      } else if (dialog.kind === "request") {
        if (!ground) throw new Error("Choose a waiver ground.");
        await submit({ action: "request-waiver", membershipId, tranche: Number(tranche), date, ground, supportingReference: reference });
      } else {
        await submit({ action: "decide-waiver", waiverId: dialog.id, granted: dialog.kind === "grant", releaseDate: date || null, reason });
      }
      toast.success("Saved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return <FormDialog open title={titles[dialog.kind]} submitText="Save" pending={pending} error={error} onClose={onClose} onSubmit={() => void save()}>
    {dialog.kind !== "refuse" ? <StandardDateField required label={dialog.kind === "bill" ? "Bill date" : dialog.kind === "refund" ? "Refund date" : dialog.kind === "grant" ? "Next administrative cycle date" : "Date written request received"} value={date} onChange={setDate} /> : null}
    {dialog.kind === "bill" ? <>
      <SelectField label="AFhomes Direct Operation" required value={venue} options={venues.map((item) => ({ value: item.id, label: item.name }))} onChange={setVenue} />
      {gold ? <SelectField label="Cardholder" value={holder} options={[{ value: "primary", label: "Primary" }, { value: "supplementary", label: "Supplementary" }]} onChange={(value) => setHolder(value === "supplementary" ? value : "primary")} /> : null}
      <TextField label="Official receipt number" required value={reference} onChange={setReference} />
      <MoneyField label="Gross pre-discount amount" required value={amount} onChange={setAmount} />
      <MoneyField label="Excluded amount" value={excluded} onChange={setExcluded} hint="Exclude taxes, government fees, gratuities, points, and other amounts that do not qualify." />
      <TextAreaField label="Notes" value={reason} onChange={setReason} />
    </> : null}
    {dialog.kind === "refund" ? <MoneyField label="Qualifying amount refunded" required value={amount} onChange={setAmount} /> : null}
    {dialog.kind === "refund" || dialog.kind === "grant" || dialog.kind === "refuse" ? <TextAreaField label="Written reason" required value={reason} onChange={setReason} /> : null}
    {dialog.kind === "request" ? <>
      <SelectField label="Tranche" required value={tranche} options={tranches.map((item) => ({ value: String(item.number), label: `Tranche ${item.number}` }))} onChange={setTranche} />
      <SelectField label="Ground" required value={ground} options={WAIVER_GROUNDS.map((item) => ({ value: item, label: item }))} onChange={(value) => setGround(WAIVER_GROUNDS.find((item) => item === value))} />
      <TextField label="Supporting document reference" required value={reference} onChange={setReference} />
    </> : null}
  </FormDialog>;
}
