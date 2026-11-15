"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useOperation, useStayPoints, useStayPointsAction, useStayPointsVenues } from "@/data/business-queries";
import type { MembershipPoints, StayPointsAction } from "@/data/contracts/stay-points-repository";
import { WAIVER_GROUNDS } from "@/modules/stay-points/types";
import type { GiftLedgerEntry, PointsTranche, ResortSpend, WaiverRequest } from "@/modules/stay-points/types";
import { AdminSectionHeading, AdminStatCard, AdminStatGrid, AreaPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet, type DetailSection } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { Button } from "@/shared/ui/button";
import { Clock, Coins, Gift, Wallet } from "lucide-react";
import { usePromoPointsBalanceSection } from "../components/promo-points-balance-card";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { PromoPointsPanel, RecordPromoUseButton } from "./promo-points-page";
import { AddPromoButton, PromosPanel } from "./promos-page";

const TRANCHE_LABELS: Record<PointsTranche["status"], string> = {
  unreleased: "Unreleased", released: "Released", released_by_waiver: "Released by waiver",
  non_activated: "Non-activated", forfeited: "Forfeited",
};

const GIFT_ACTIONS: Record<GiftLedgerEntry["type"], string> = {
  release: "Released", waiver_release: "Released by waiver", expiry: "Expired", transfer: "Forfeited on transfer",
};

const dayType = (entry: GiftLedgerEntry) => (entry.bucket === "weekday" ? "Weekday" : "Weekend");
const entryKey = (entry: GiftLedgerEntry) => `${entry.tranche}:${entry.bucket}:${entry.type}`;
const count = (value: number | undefined) => (value ?? 0).toLocaleString("en-PH");
const decisionLabel = (waiver: WaiverRequest) => (waiver.decision ? (waiver.decision.granted ? "Granted" : "Refused") : "Pending");

const trancheColumns: ColumnDef<PointsTranche, unknown>[] = [
  { id: "year", header: "Tranche", cell: ({ row }) => row.original.number },
  { id: "due", header: "Due", cell: ({ row }) => formatDate(row.original.dueDate) },
  { id: "spend", header: "Qualifying spend", cell: ({ row }) => <Money value={row.original.qualifyingCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => TRANCHE_LABELS[row.original.status] },
  { id: "released", header: "Released on", cell: ({ row }) => formatDate(row.original.releaseDate) },
];

const giftColumns: ColumnDef<GiftLedgerEntry, unknown>[] = [
  { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "year", header: "Tranche", accessorKey: "tranche" },
  { id: "day", header: "Day type", cell: ({ row }) => dayType(row.original) },
  { id: "action", header: "Action", cell: ({ row }) => GIFT_ACTIONS[row.original.type] },
  { id: "points", header: "Points", cell: ({ row }) => count(row.original.points) },
];

const billColumns: ColumnDef<ResortSpend, unknown>[] = [
  { id: "or", header: "Official receipt", cell: ({ row }) => row.original.verificationRef ?? "—" },
  { id: "date", header: "Bill date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "spend", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
];

const waiverColumns: ColumnDef<WaiverRequest, unknown>[] = [
  { id: "year", header: "Tranche", cell: ({ row }) => row.original.tranche },
  { id: "date", header: "Request received", cell: ({ row }) => formatDate(row.original.date) },
  { id: "ground", header: "Ground", cell: ({ row }) => row.original.ground },
  { id: "status", header: "Decision", cell: ({ row }) => decisionLabel(row.original) },
  { id: "release", header: "Release date", cell: ({ row }) => formatDate(row.original.decision?.releaseDate ?? null) },
];

type Dialog = { kind: "bill" } | { kind: "refund"; id: string } | { kind: "request" }
  | { kind: "grant" | "refuse"; id: string };

type Picker = { picked: string | undefined; setPicked: (id: string) => void };
const PickerContext = createContext<Picker | null>(null);

/** Shares the chosen membership between the picker and the Welcome Gift, Resort bills and Waivers panels. */
export function StayPointsMembershipProvider({ children }: { children: ReactNode }) {
  const [picked, setPicked] = useState<string | undefined>();
  const value = useMemo(() => ({ picked, setPicked }), [picked]);
  return <PickerContext.Provider value={value}>{children}</PickerContext.Provider>;
}

/** The chosen membership's points. Without a provider, each panel keeps its own choice. */
function useSelectedMembership() {
  const shared = useContext(PickerContext);
  const [localPicked, setLocalPicked] = useState<string | undefined>();
  const points = useStayPoints();
  const picked = shared ? shared.picked : localPicked;
  const list = points.data ?? [];
  const current = list.find((item) => item.membershipId === picked) ?? list[0];
  return { points, list, current, setPicked: shared ? shared.setPicked : setLocalPicked };
}

/** Membership picker with its loading, empty and Financial Hold states. */
export function StayPointsMembershipPicker() {
  const { points, list, current, setPicked } = useSelectedMembership();
  return (
    <QueryState isLoading={points.isLoading} error={points.error}>
      {!current ? <InfoNote>No memberships with a VIP Number are visible.</InfoNote> : (
        <>
          <SelectField label="Membership" value={current.membershipId} options={list.map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.cardId ?? "No card number"}` }))} onChange={setPicked} />
          {current.financialHold ? <InfoNote>Financial Hold pauses new point releases and redemption.</InfoNote> : null}
        </>
      )}
    </QueryState>
  );
}

type GiftDetail = { kind: "summary" } | { kind: "tranche"; number: number } | { kind: "entry"; key: string };

/** Welcome Gift balances, tranches and gift history of the chosen membership. */
export function WelcomeGiftPanel() {
  const { current } = useSelectedMembership();
  const promoSection = usePromoPointsBalanceSection(current?.membershipId);
  const [detail, setDetail] = useState<GiftDetail | null>(null);
  if (!current) return null;
  const ledger = current.ledger;
  const balances = ledger?.balances;
  const padDate = ledger?.padDate ? formatDate(ledger.padDate) : "Not set";
  const tranche = detail?.kind === "tranche" ? ledger?.tranches.find((item) => item.number === detail.number) : undefined;
  const entry = detail?.kind === "entry" ? ledger?.entries.find((item) => entryKey(item) === detail.key) : undefined;

  let sheetTitle = "Points summary";
  let sections: DetailSection[] = [];
  if (detail?.kind === "summary") {
    sections = [
      { title: "Membership", rows: [{ label: "Card number", value: current.cardId }, { label: "Points Activation Date", value: padDate }] },
      {
        title: "Stay Points",
        rows: [
          { label: "Available weekday", value: count(balances?.spendableWeekday) },
          { label: "Available weekend", value: count(balances?.spendableWeekend) },
          { label: "Released", value: count(balances?.released) },
          { label: "Reserved", value: count(balances?.reserved) },
          { label: "Redeemed", value: count(balances?.redeemed) },
          { label: "Forfeited", value: count(balances?.forfeited) },
        ],
      },
      promoSection,
    ];
  } else if (tranche) {
    sheetTitle = `Tranche ${tranche.number}`;
    sections = [{
      rows: [
        { label: "Spend period", value: `${formatDate(tranche.startDate)} to ${formatDate(tranche.endDate)}` },
        { label: "Due", value: formatDate(tranche.dueDate) },
        { label: "Qualifying spend", value: <Money value={tranche.qualifyingCentavos} /> },
        { label: "Required minimum", value: <Money value={tranche.minimumCentavos} /> },
        { label: "Status", value: TRANCHE_LABELS[tranche.status] },
        { label: "Released on", value: tranche.releaseDate ? formatDate(tranche.releaseDate) : null },
        { label: "Points Activation Date", value: padDate },
      ],
    }];
  } else if (entry) {
    sheetTitle = `${GIFT_ACTIONS[entry.type]} · Tranche ${entry.tranche}`;
    sections = [{
      rows: [
        { label: "Date", value: formatDate(entry.date) },
        { label: "Tranche", value: entry.tranche },
        { label: "Day type", value: dayType(entry) },
        { label: "Action", value: GIFT_ACTIONS[entry.type] },
        { label: "Points", value: count(entry.points) },
        { label: "Reference", value: entry.reference },
      ],
    }];
  }

  return (
    <>
      <AdminStatGrid columns={4}>
        <AdminStatCard label="Available weekday" value={count(balances?.spendableWeekday)} icon={Wallet} tone="success" />
        <AdminStatCard label="Available weekend" value={count(balances?.spendableWeekend)} icon={Coins} tone="success" />
        <AdminStatCard label="Released" value={count(balances?.released)} icon={Gift} />
        <AdminStatCard label="Redeemed" value={count(balances?.redeemed)} icon={Clock} />
      </AdminStatGrid>
      <div>
        <Button type="button" variant="outline" onClick={() => setDetail({ kind: "summary" })}>View full details</Button>
      </div>
      <DataTable data={ledger?.tranches ?? []} columns={trancheColumns} getRowId={(row) => String(row.number)} emptyText="Tranche dates appear after the Points Activation Date is set." caption="Annual Welcome Gift"
        onRowOpen={(row) => setDetail({ kind: "tranche", number: row.number })} getRowLabel={(row) => `Open tranche ${row.number}`} />
      <AdminSectionHeading title="Gift history" />
      <DataTable data={ledger?.entries ?? []} columns={giftColumns} getRowId={entryKey} emptyText="No gift movements recorded." caption="Gift history"
        onRowOpen={(row) => setDetail({ kind: "entry", key: entryKey(row) })} getRowLabel={(row) => `Open ${GIFT_ACTIONS[row.type].toLowerCase()} entry for tranche ${row.tranche}`} />
      <RecordDetailsSheet open={detail !== null && sections.length > 0} onClose={() => setDetail(null)} title={sheetTitle} subtitle={current.customerName} sections={sections} />
    </>
  );
}

/** Resort bills of the chosen membership. Approve from the row menu or details; refunds are recorded from a bill's details. */
export function ResortBillsPanel() {
  const { current } = useSelectedMembership();
  const action = useStayPointsAction();
  const canEnter = useOperation("stay-points.enter");
  const canApprove = useOperation("stay-points.approve");
  const canRefund = useOperation("stay-points.refund");
  const venues = useStayPointsVenues(canEnter);
  const { confirmRun, dialog: confirmation } = useConfirmRun();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  if (!current) return null;

  const approve = (bill: ResortSpend) => confirmRun({
    title: "Approve this resort bill?", description: "Its qualifying spend will count in the period of its bill date.",
    confirmText: "Approve bill", successTitle: "Resort bill approved.", errorTitle: "Could not approve the bill",
    action: () => action.mutateAsync({ action: "approve", spendId: bill.id }),
  });
  const mayApprove = (bill: ResortSpend) => canApprove && bill.status === "submitted";
  const mayRefund = (bill: ResortSpend) => canRefund && bill.status === "verified";
  const billName = (bill: ResortSpend) => `resort bill ${bill.verificationRef ?? formatDate(bill.date)}`;
  const bill = detailId ? current.spends.find((item) => item.id === detailId) : undefined;
  const venueName = bill?.venueId ? venues.data?.find((item) => item.id === bill.venueId)?.name : undefined;
  const refunds = bill ? current.refunds.filter((item) => item.spendId === bill.id) : [];

  return (
    <>
      <DataTable data={current.spends} columns={billColumns} getRowId={(row) => row.id} emptyText="No resort bills recorded." caption="Resort bills"
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open ${billName(row)}`}
        rowActions={(row) => <RowActionsMenu itemName={billName(row)} onView={() => setDetailId(row.id)}
          extraItems={mayApprove(row) ? [{ key: "approve", label: "Approve bill", onClick: () => approve(row) }] : []} />} />
      <RecordDetailsSheet
        open={bill !== undefined}
        onClose={() => setDetailId(null)}
        title={bill?.verificationRef ?? "Resort bill"}
        subtitle={current.customerName}
        badge={bill ? <BizBadge status={bill.status} /> : undefined}
        sections={bill ? [
          {
            title: "Bill",
            rows: [
              { label: "Official receipt", value: bill.verificationRef },
              { label: "Bill date", value: formatDate(bill.date) },
              ...(venueName ? [{ label: "AFhomes Direct Operation", value: venueName }] : []),
              ...(bill.holder ? [{ label: "Cardholder", value: bill.holder === "supplementary" ? "Supplementary" : "Primary" }] : []),
              ...(bill.grossCentavos !== undefined ? [{ label: "Gross amount", value: <Money value={bill.grossCentavos} /> }] : []),
              ...(bill.excludedCentavos !== undefined ? [{ label: "Excluded amount", value: <Money value={bill.excludedCentavos} /> }] : []),
              { label: "Qualifying amount", value: <Money value={bill.amountCentavos} /> },
              { label: "Notes", value: bill.description },
              ...(bill.approvedDate ? [{ label: "Approved on", value: formatDate(bill.approvedDate) }] : []),
            ],
          },
          ...refunds.map((refund, index) => ({
            title: refunds.length > 1 ? `Refund ${index + 1}` : "Refund",
            rows: [
              { label: "Refund date", value: formatDate(refund.date) },
              { label: "Qualifying amount refunded", value: <Money value={refund.amountCentavos} /> },
              { label: "Reason", value: refund.reason },
            ],
          })),
        ] : []}
        footer={bill && (mayApprove(bill) || mayRefund(bill)) ? (
          <>
            {mayApprove(bill) ? <Button type="button" onClick={() => approve(bill)}>Approve bill</Button> : null}
            {mayRefund(bill) ? <Button type="button" variant="outline" onClick={() => { setDetailId(null); setDialog({ kind: "refund", id: bill.id }); }}>Record refund</Button> : null}
          </>
        ) : undefined}
      />
      {dialog ? <StayPointsDialog dialog={dialog} membershipId={current.membershipId} gold={current.productCode === "G1"} venues={venues.data ?? []}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setDialog(null)} /> : null}
      {confirmation}
    </>
  );
}

/** Compassionate Waiver requests of the chosen membership. Recording and deciding need stay-points.waiver. */
export function WaiversPanel() {
  const { current } = useSelectedMembership();
  const action = useStayPointsAction();
  const canWaive = useOperation("stay-points.waiver");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  if (!current) return null;

  const waiver = detailId ? current.waivers.find((item) => item.id === detailId) : undefined;

  return (
    <>
      <DataTable data={current.waivers} columns={waiverColumns} getRowId={(row) => row.id} caption="Compassionate Waivers" emptyText="No waiver requests."
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open waiver request for tranche ${row.tranche}`}
        rowActions={(row) => <RowActionsMenu itemName={`waiver request for tranche ${row.tranche}`} onView={() => setDetailId(row.id)}
          extraItems={canWaive && !row.decision ? [
            { key: "grant", label: "Grant", onClick: () => setDialog({ kind: "grant", id: row.id }) },
            { key: "refuse", label: "Refuse", onClick: () => setDialog({ kind: "refuse", id: row.id }) },
          ] : []} />} />
      <RecordDetailsSheet
        open={waiver !== undefined}
        onClose={() => setDetailId(null)}
        title={waiver ? `Waiver request · Tranche ${waiver.tranche}` : "Waiver request"}
        subtitle={current.customerName}
        sections={waiver ? [
          {
            title: "Request",
            rows: [
              { label: "Tranche", value: waiver.tranche },
              { label: "Request received", value: formatDate(waiver.date) },
              { label: "Ground", value: waiver.ground },
              { label: "Document reference", value: waiver.supportingReference },
            ],
          },
          {
            title: "Decision",
            rows: [
              { label: "Decision", value: decisionLabel(waiver) },
              ...(waiver.decision ? [
                { label: "Decided on", value: formatDate(waiver.decision.date) },
                { label: "Release date", value: waiver.decision.releaseDate ? formatDate(waiver.decision.releaseDate) : null },
                { label: "Written reason", value: waiver.decision.reason },
              ] : []),
            ],
          },
        ] : []}
      />
      {dialog ? <StayPointsDialog dialog={dialog} membershipId={current.membershipId} gold={current.productCode === "G1"} venues={[]}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

/** Tranches that can still take a waiver request: non-activated, with no pending or granted request. */
const waiverTranches = (current: MembershipPoints) => current.ledger?.tranches.filter((item) => item.status === "non_activated" &&
  !current.waivers.some((waiver) => waiver.tranche === item.number && waiver.decision?.granted !== false)) ?? [];

/** "Enter resort bill" for the chosen membership (stay-points.enter). Owns its form dialog. */
export function EnterResortBillButton() {
  const { current } = useSelectedMembership();
  const action = useStayPointsAction();
  const canEnter = useOperation("stay-points.enter");
  const venues = useStayPointsVenues(canEnter);
  const [open, setOpen] = useState(false);
  if (!canEnter || !current) return null;
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Enter resort bill</Button>
      {open ? <StayPointsDialog dialog={{ kind: "bill" }} membershipId={current.membershipId} gold={current.productCode === "G1"} venues={venues.data ?? []}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** "Record waiver request" for the chosen membership (stay-points.waiver, while a tranche can take one). Owns its form dialog. */
export function RecordWaiverRequestButton() {
  const { current } = useSelectedMembership();
  const action = useStayPointsAction();
  const canWaive = useOperation("stay-points.waiver");
  const [open, setOpen] = useState(false);
  const tranches = current ? waiverTranches(current) : [];
  if (!canWaive || !current || (!tranches.length && !open)) return null;
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Record waiver request</Button>
      {open ? <StayPointsDialog dialog={{ kind: "request" }} membershipId={current.membershipId} gold={current.productCode === "G1"} venues={[]}
        tranches={tranches} pending={action.isPending} submit={action.mutateAsync} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

const STAY_TAB_ACTIONS: Record<string, () => ReactNode> = {
  "resort-bills": () => <EnterResortBillButton />,
  waivers: () => <RecordWaiverRequestButton />,
  promos: () => <AddPromoButton />,
  "promo-points": () => <RecordPromoUseButton />,
};

/**
 * Stay Points area (ADMIN_AREA_TABS["stay-points"]). The membership picker is shared by the
 * Welcome Gift, Resort bills and Waivers tabs; Promos and Promo Points do not use it.
 */
export function StayPointsAreaPage() {
  const access = useAdminAreaTabAccess("stay-points");
  const withPicker = (panel: ReactNode) => <><StayPointsMembershipPicker />{panel}</>;
  return (
    <StayPointsMembershipProvider>
      <AreaPage
        anyOf={["stay-points"]}
        title="Stay Points"
        actions={(tab) => STAY_TAB_ACTIONS[tab]?.() ?? null}
        tabs={[
          { value: "welcome-gift", label: "Welcome Gift", allowed: access["welcome-gift"], render: () => withPicker(<WelcomeGiftPanel />) },
          { value: "resort-bills", label: "Resort bills", allowed: access["resort-bills"], render: () => withPicker(<ResortBillsPanel />) },
          { value: "waivers", label: "Waivers", allowed: access.waivers, render: () => withPicker(<WaiversPanel />) },
          { value: "promos", label: "Promos", allowed: access.promos, render: () => <PromosPanel /> },
          { value: "promo-points", label: "Promo Points", allowed: access["promo-points"], render: () => <PromoPointsPanel /> },
        ]}
      />
    </StayPointsMembershipProvider>
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
