"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Ban, Check, Clock, Coins, Gift, ReceiptText, Search, TriangleAlert, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useMemberships, useOperation, useStayPoints, useStayPointsAction, useStayPointsVenues, useVipProducts } from "@/data/business-queries";
import { useTierDisplayName } from "../components/use-tier-display-name";
import type { MembershipPoints, StayPointsAction } from "@/data/contracts/stay-points-repository";
import { manilaToday } from "@/modules/accreditation/dates";
import type { OutletType } from "@/modules/settings/lists";
import { outletItems } from "../components/outlet-options";
import { WAIVER_GROUNDS } from "@/modules/stay-points/types";
import type { GiftLedgerEntry, PointsTranche, ResortSpend, WaiverRequest } from "@/modules/stay-points/types";
import { AdminStatCard, AdminStatGrid, AreaPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { InfoGrid, InfoItem } from "@/shared/components/modern/info-grid";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet, type DetailSection } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { ToneBadge, StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { MoneyField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { initialsOf } from "@/shared/forms/formatting/text";
import { addYearsToDate } from "@/shared/lib/dates";
import { EMPTY } from "@/shared/lib/empty-value";
import { formatDate } from "@/shared/lib/format-date";
import { parsePesoToCentavos } from "@/shared/lib/money";
import { cn } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { usePromoPointsBalanceSection } from "../components/promo-points-balance-card";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { PromoPointsPanel, RecordPromoUseButton } from "./promo-points-page";
import { AddPromoButton, PromosPanel } from "./promos-page";

export const GIFT_ACTIONS: Record<GiftLedgerEntry["type"], string> = {
  release: "Given", waiver_release: "Given by exception", expiry: "Expired", transfer: "Lost on transfer",
};

const dayType = (entry: GiftLedgerEntry) => (entry.bucket === "weekday" ? "Weekday" : "Weekend");
const entryKey = (entry: GiftLedgerEntry) => `${entry.tranche}:${entry.bucket}:${entry.type}`;
const count = (value: number | undefined) => (value ?? 0).toLocaleString("en-PH");
const decisionLabel = (waiver: WaiverRequest) => (waiver.decision ? (waiver.decision.granted ? "Approved" : "Declined") : "Pending");
const decisionStatus = (waiver: WaiverRequest) => waiver.decision ? (waiver.decision.granted ? "approved" : "declined") : "pending";

/**
 * Plain-word status of a yearly gift. A gift that is due while a payment hold lasts is Paused; it
 * is released when the hold ends (doc 09 section 17.2). "Not earned" is the Non-Activated outcome.
 */
function giftStatus(tranche: PointsTranche, financialHold: boolean, today: string): { label: string; status: string } {
  switch (tranche.status) {
    case "released": return { label: "Given", status: "active" };
    case "released_by_waiver": return { label: "Given by exception", status: "released_by_waiver" };
    case "forfeited": return { label: "Lost", status: "forfeited" };
    case "non_activated": return { label: "Not earned", status: "non_activated" };
    default: return financialHold && tranche.dueDate <= today ? { label: "Paused", status: "on_hold" } : { label: "Waiting", status: "pending" };
  }
}

/** Qualifying spend against the yearly minimum, with the peso values as text. */
function SpendProgress({ spent, minimum }: { spent: number; minimum: number }) {
  const percent = minimum > 0 ? Math.min(100, Math.round((spent * 100) / minimum)) : 0;
  return (
    <div className="tw:flex tw:min-w-40 tw:flex-col tw:gap-1">
      <div role="progressbar" aria-label="Spending that counts" aria-valuemin={0} aria-valuemax={minimum} aria-valuenow={Math.min(spent, minimum)} className="tw:h-2 tw:overflow-hidden tw:rounded-full tw:bg-muted">
        <div className={cn("tw:h-full tw:rounded-full", spent >= minimum ? "tw:bg-success" : "tw:bg-primary")} style={{ width: `${percent}%` }} />
      </div>
      <span className="tw:text-xs tw:whitespace-nowrap tw:text-muted-foreground"><Money value={spent} /> of <Money value={minimum} /></span>
    </div>
  );
}

const trancheColumns = (financialHold: boolean, today: string): ColumnDef<PointsTranche, unknown>[] => [
  { id: "year", header: "Year", cell: ({ row }) => <span className="tw:font-semibold">{`Year ${row.original.number}`}</span> },
  { id: "due", header: "Due Date", cell: ({ row }) => formatDate(row.original.dueDate) },
  { id: "spend", header: "Spend", cell: ({ row }) => <SpendProgress spent={row.original.qualifyingCentavos} minimum={row.original.minimumCentavos} /> },
  {
    id: "status", header: "Status",
    cell: ({ row }) => { const status = giftStatus(row.original, financialHold, today); return <StatusBadge status={status.status} label={status.label} />; },
  },
  { id: "released", header: "Given on", cell: ({ row }) => formatDate(row.original.releaseDate) },
];

const giftColumns: ColumnDef<GiftLedgerEntry, unknown>[] = [
  { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "gift", header: "Gift", cell: ({ row }) => `Year ${row.original.tranche}` },
  { id: "type", header: "Type", cell: ({ row }) => dayType(row.original) },
  { id: "action", header: "Action", cell: ({ row }) => GIFT_ACTIONS[row.original.type] },
  { id: "points", header: "Points", cell: ({ row }) => <span className="tw:font-semibold">{count(row.original.points)}</span> },
];

const billColumns: ColumnDef<ResortSpend, unknown>[] = [
  { id: "or", header: "Official Receipt", cell: ({ row }) => <span className="tw:font-semibold">{row.original.verificationRef ?? EMPTY}</span> },
  { id: "date", header: "Bill Date", cell: ({ row }) => formatDate(row.original.date) },
  { id: "spend", header: "Amount", cell: ({ row }) => <Money value={row.original.amountCentavos} /> },
  { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
];

const waiverColumns: ColumnDef<WaiverRequest, unknown>[] = [
  { id: "year", header: "Year", cell: ({ row }) => <span className="tw:font-semibold">{`Year ${row.original.tranche}`}</span> },
  { id: "date", header: "Request Received", cell: ({ row }) => formatDate(row.original.date) },
  { id: "ground", header: "Ground", cell: ({ row }) => row.original.ground },
  { id: "status", header: "Decision", cell: ({ row }) => <StatusBadge status={decisionStatus(row.original)} label={decisionLabel(row.original)} /> },
  { id: "release", header: "Given on", cell: ({ row }) => formatDate(row.original.decision?.releaseDate ?? null) },
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

/** The chosen membership's points. Nobody is chosen until staff pick a cardholder. Without a provider, each panel keeps its own choice. */
function useSelectedMembership() {
  const shared = useContext(PickerContext);
  const [localPicked, setLocalPicked] = useState<string | undefined>();
  const points = useStayPoints();
  const picked = shared ? shared.picked : localPicked;
  const list = points.data ?? [];
  const current = list.find((item) => item.membershipId === picked);
  // A product that allows supplementary holders (Gold today) lets staff choose the holder.
  const products = useVipProducts();
  const supplementary = ((products.data ?? []).find((item) => item.code === current?.productCode)?.supplementaryHolders ?? 0) > 0;
  return { points, list, current, supplementary, setPicked: shared ? shared.setPicked : setLocalPicked };
}

/** Name, tier, card number and dates of the chosen cardholder, plus the payment-hold alert when one applies. */
function CardholderSummary({ current }: { current: MembershipPoints }) {
  const memberships = useMemberships();
  const tierName = useTierDisplayName();
  const membership = memberships.data?.find((item) => item.id === current.membershipId);
  const claimDate = membership?.cardClaimDate ?? null;
  const secondAnniversary = claimDate ? addYearsToDate(claimDate, 2) : null;
  const padDate = current.ledger?.padDate;
  const pointsStart = padDate
    ? formatDate(padDate)
    : secondAnniversary ? `Starts at the first stay, or on ${formatDate(secondAnniversary)}` : "Starts at the first stay, or two years after the card is claimed";
  return (
    <>
      <Card aria-label="Cardholder summary">
        <div className="tw:flex tw:items-center tw:gap-4">
          <Avatar className="tw:size-14 tw:bg-primary/10 tw:text-lg tw:text-primary"><AvatarFallback>{initialsOf(current.customerName)}</AvatarFallback></Avatar>
          <div className="tw:min-w-0">
            <p className="tw:m-0 tw:truncate tw:text-lg tw:font-semibold">{current.customerName}</p>
            <div className="tw:mt-1 tw:flex tw:flex-wrap tw:items-center tw:gap-2">
              <ToneBadge tone="info">{tierName(current.productCode) ?? EMPTY}</ToneBadge>
              {current.financialHold ? <BizBadge status="on_hold" label="Payment Hold" /> : <BizBadge status={current.status} />}
            </div>
          </div>
        </div>
        <InfoGrid label="Cardholder details" columns={3}>
          <InfoItem term="Card number"><span className="tw:font-mono">{current.cardId ?? EMPTY}</span></InfoItem>
          <InfoItem term="Card claim date">{formatDate(claimDate)}</InfoItem>
          <InfoItem term="Points start date">{pointsStart}</InfoItem>
        </InfoGrid>
      </Card>
      {current.financialHold ? (
        <Alert variant="destructive" className="tw:border-destructive/40 tw:bg-destructive/10">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>Points are paused: this account has a payment hold. New gifts and stays resume when the hold is cleared.</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

/** Cardholder search with its loading and empty states, then the chosen cardholder's summary. Shared by three tabs. */
export function StayPointsMembershipPicker() {
  const { points, list, current, setPicked } = useSelectedMembership();
  return (
    <QueryState isLoading={points.isLoading} error={points.error}>
      {list.length === 0 ? <InfoNote>No memberships with a VIP Number are visible.</InfoNote> : (
        <>
          <SelectField label="Find a cardholder" placeholder="Search by name or card number" value={current?.membershipId}
            options={list.map((item) => ({ value: item.membershipId, label: `${item.customerName} · ${item.cardId ?? EMPTY}` }))} onChange={setPicked} />
          {current ? <CardholderSummary current={current} /> : (
            <div className="tw:flex tw:flex-col tw:items-center tw:gap-3 tw:rounded-2xl tw:border tw:border-dashed tw:border-border tw:bg-card tw:px-6 tw:py-12 tw:text-center">
              <span aria-hidden="true" className="tw:flex tw:size-12 tw:items-center tw:justify-center tw:rounded-full tw:bg-(--color-brand-soft) tw:text-primary"><Search className="tw:size-5" /></span>
              <p className="tw:m-0 tw:text-muted-foreground">Pick a cardholder to see their yearly gifts and points.</p>
            </div>
          )}
        </>
      )}
    </QueryState>
  );
}

type GiftDetail = { kind: "tranche"; number: number } | { kind: "entry"; key: string };

/** Welcome Gift balances, yearly gifts and gift history of the chosen cardholder. */
export function WelcomeGiftPanel() {
  const { current } = useSelectedMembership();
  const promoSection = usePromoPointsBalanceSection(current?.membershipId);
  const [detail, setDetail] = useState<GiftDetail | null>(null);
  const today = useMemo(() => manilaToday(), []);
  const columns = useMemo(() => trancheColumns(current?.financialHold ?? false, today), [current?.financialHold, today]);
  if (!current) return null;
  const ledger = current.ledger;
  const balances = ledger?.balances;
  const padDate = formatDate(ledger?.padDate);
  const tranche = detail?.kind === "tranche" ? ledger?.tranches.find((item) => item.number === detail.number) : undefined;
  const entry = detail?.kind === "entry" ? ledger?.entries.find((item) => entryKey(item) === detail.key) : undefined;

  let sheetTitle = "Yearly gift";
  let sheetBadge: ReactNode;
  let sections: DetailSection[] = [];
  if (tranche) {
    const status = giftStatus(tranche, current.financialHold, today);
    sheetTitle = `Year ${tranche.number} gift`;
    sheetBadge = <StatusBadge status={status.status} label={status.label} />;
    sections = [{
      rows: [
        { label: "Spend period", value: `${formatDate(tranche.startDate)} to ${formatDate(tranche.endDate)}` },
        { label: "Due date", value: formatDate(tranche.dueDate) },
        { label: "Spending that counts", value: <Money value={tranche.qualifyingCentavos} /> },
        { label: "Minimum spend", value: <Money value={tranche.minimumCentavos} /> },
        { label: "Status", value: status.label },
        { label: "Given on", value: tranche.releaseDate ? formatDate(tranche.releaseDate) : null },
        { label: "Points start date", value: padDate },
      ],
    }];
  } else if (entry) {
    sheetTitle = `${GIFT_ACTIONS[entry.type]} · Year ${entry.tranche}`;
    sections = [{
      rows: [
        { label: "Date", value: formatDate(entry.date) },
        { label: "Gift", value: `Year ${entry.tranche}` },
        { label: "Type", value: dayType(entry) },
        { label: "Action", value: GIFT_ACTIONS[entry.type] },
        { label: "Points", value: count(entry.points) },
        { label: "Reference", value: entry.reference },
      ],
    }];
  }

  return (
    <>
      <AdminStatGrid columns={4}>
        <AdminStatCard label="Weekday Points Available" value={count(balances?.spendableWeekday)} icon={Wallet} tone="info" />
        <AdminStatCard label="Weekend Points Available" value={count(balances?.spendableWeekend)} icon={Coins} tone="violet" />
        <AdminStatCard label="Gifts Given" value={count(balances?.released)} icon={Gift} tone="success" />
        <AdminStatCard label="Points Used" value={count(balances?.redeemed)} icon={Clock} tone="accent" />
      </AdminStatGrid>
      <Card aria-label="Other points">
        <InfoGrid label="Other points" columns={3}>
          <InfoItem term="Reserved for upcoming stays">{count(balances?.reserved)}</InfoItem>
          <InfoItem term="Lost">{count(balances?.forfeited)}</InfoItem>
          {promoSection.rows.map((row) => <InfoItem key={row.label} term={`Promo points ${row.label.toLowerCase()}`}>{row.value}</InfoItem>)}
        </InfoGrid>
      </Card>
      <section aria-label="Yearly gifts" className="tw:flex tw:flex-col tw:gap-3">
        <h2 className="tw:m-0 tw:text-lg tw:font-semibold">Yearly Gifts</h2>
        <DataTable data={ledger?.tranches ?? []} columns={columns} getRowId={(row) => String(row.number)} emptyText="Yearly gift dates appear once the points start date is set." caption="Yearly Gifts"
          onRowOpen={(row) => setDetail({ kind: "tranche", number: row.number })} getRowLabel={(row) => `Open year ${row.number} gift`} />
      </section>
      <section aria-label="Gift history" className="tw:flex tw:flex-col tw:gap-3">
        <h2 className="tw:m-0 tw:text-lg tw:font-semibold">Gift History</h2>
        <DataTable data={ledger?.entries ?? []} columns={giftColumns} getRowId={entryKey} emptyText="No gift movements recorded." caption="Gift History"
          onRowOpen={(row) => setDetail({ kind: "entry", key: entryKey(row) })} getRowLabel={(row) => `Open ${GIFT_ACTIONS[row.type].toLowerCase()} entry for year ${row.tranche}`} />
      </section>
      <RecordDetailsSheet open={detail !== null && sections.length > 0} onClose={() => setDetail(null)} title={sheetTitle} subtitle={current.customerName} badge={sheetBadge} sections={sections} />
    </>
  );
}

/** Resort bills of the chosen membership. Approve from the row menu or details; refunds are recorded from a bill's details. */
export function ResortBillsPanel() {
  const { current, supplementary } = useSelectedMembership();
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
    title: "Approve This Resort Bill?", description: "Its amount will count toward the spending that counts in the period of its bill date.",
    confirmText: "Approve Bill", tone: "success", successTitle: "Resort bill approved.", errorTitle: "Could not approve the bill",
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
      <DataTable data={current.spends} columns={billColumns} getRowId={(row) => row.id} emptyText="No resort bills recorded." caption="Pending Bills"
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open ${billName(row)}`}
        rowActions={(row) => <RowActionsMenu itemName={billName(row)}
          extraItems={mayApprove(row) ? [{ key: "approve", label: "Approve Bill", tone: "success", icon: Check, onClick: () => approve(row) }] : []} />} />
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
              ...(bill.holder ? [{ label: "Cardholder", value: bill.holder === "supplementary" ? "Extra cardholder" : "Primary" }] : []),
              ...(bill.grossCentavos !== undefined ? [{ label: "Total bill amount", value: <Money value={bill.grossCentavos} /> }] : []),
              ...(bill.excludedCentavos !== undefined ? [{ label: "Amount not eligible for points", value: <Money value={bill.excludedCentavos} /> }] : []),
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
        footer={bill ? <DetailActions actions={[
          mayApprove(bill) && { key: "approve", label: "Approve Bill", next: true, variant: "success", icon: Check, onClick: () => approve(bill) },
          mayRefund(bill) && { key: "refund", label: "Record Refund", variant: "warning", icon: Undo2, onClick: () => { setDetailId(null); setDialog({ kind: "refund", id: bill.id }); } },
        ]} /> : undefined}
      />
      {dialog ? <StayPointsDialog dialog={dialog} membershipId={current.membershipId} gold={supplementary} venues={venues.data ?? []}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setDialog(null)} /> : null}
      {confirmation}
    </>
  );
}

/** Compassionate Waiver requests of the chosen membership. Recording and deciding need stay-points.waiver. */
export function WaiversPanel() {
  const { current, supplementary } = useSelectedMembership();
  const action = useStayPointsAction();
  const canWaive = useOperation("stay-points.waiver");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  if (!current) return null;

  const waiver = detailId ? current.waivers.find((item) => item.id === detailId) : undefined;

  return (
    <>
      <DataTable data={current.waivers} columns={waiverColumns} getRowId={(row) => row.id} caption="Special Cases" emptyText="No exception requests."
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open exception request for year ${row.tranche}`}
        rowActions={(row) => <RowActionsMenu itemName={`exception request for year ${row.tranche}`}
          extraItems={canWaive && !row.decision ? [
            { key: "grant", label: "Approve Exception", tone: "success", icon: Check, onClick: () => setDialog({ kind: "grant", id: row.id }) },
            { key: "refuse", label: "Decline Exception", tone: "danger", icon: Ban, onClick: () => setDialog({ kind: "refuse", id: row.id }) },
          ] : []} />} />
      <RecordDetailsSheet
        open={waiver !== undefined}
        onClose={() => setDetailId(null)}
        title={waiver ? `Exception Request · Year ${waiver.tranche}` : "Exception Request"}
        subtitle={current.customerName}
        badge={waiver ? <StatusBadge status={decisionStatus(waiver)} label={decisionLabel(waiver)} /> : undefined}
        sections={waiver ? [
          {
            title: "Request",
            rows: [
              { label: "Year", value: `Year ${waiver.tranche}` },
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
                { label: "Given on", value: waiver.decision.releaseDate ? formatDate(waiver.decision.releaseDate) : null },
                { label: "Written reason", value: waiver.decision.reason },
              ] : []),
            ],
          },
        ] : []}
        footer={waiver && canWaive && !waiver.decision ? <DetailActions actions={[
          { key: "approve", label: "Approve Exception", next: true, variant: "success", icon: Check, onClick: () => { setDetailId(null); setDialog({ kind: "grant", id: waiver.id }); } },
          { key: "decline", label: "Decline Exception", variant: "destructive", icon: Ban, onClick: () => { setDetailId(null); setDialog({ kind: "refuse", id: waiver.id }); } },
        ]} /> : undefined}
      />
      {dialog ? <StayPointsDialog dialog={dialog} membershipId={current.membershipId} gold={supplementary} venues={[]}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setDialog(null)} /> : null}
    </>
  );
}

/** Tranches that can still take a waiver request: non-activated, with no pending or granted request. */
const waiverTranches = (current: MembershipPoints) => current.ledger?.tranches.filter((item) => item.status === "non_activated" &&
  !current.waivers.some((waiver) => waiver.tranche === item.number && waiver.decision?.granted !== false)) ?? [];

/** "Earn Points" (resort bill entry) for the chosen membership (stay-points.enter). Owns its form dialog. */
export function EnterResortBillButton({ selected, earnPoints = false }: { selected?: import("@/data/contracts/member-qr-repository").MemberQrHolder; earnPoints?: boolean } = {}) {
  const { current, supplementary } = useSelectedMembership();
  const action = useStayPointsAction();
  const canEnter = useOperation("stay-points.enter");
  const venues = useStayPointsVenues(canEnter);
  const [open, setOpen] = useState(false);
  const membershipId = selected?.membershipId ?? current?.membershipId;
  if (!canEnter || !membershipId) return null;
  return (
    <>
      <Button type="button" variant={selected ? "success" : undefined} onClick={() => setOpen(true)}>{selected ? <ReceiptText aria-hidden="true" /> : null}Earn Points</Button>
      {open ? <StayPointsDialog dialog={{ kind: "bill" }} membershipId={membershipId} selectedHolder={selected} gold={supplementary} venues={venues.data ?? []}
        tranches={[]} pending={action.isPending} submit={action.mutateAsync} onClose={() => setOpen(false)} earnPoints={earnPoints} /> : null}
    </>
  );
}

/** "Record waiver request" for the chosen membership (stay-points.waiver, while a tranche can take one). Owns its form dialog. */
export function RecordWaiverRequestButton() {
  const { current, supplementary } = useSelectedMembership();
  const action = useStayPointsAction();
  const canWaive = useOperation("stay-points.waiver");
  const [open, setOpen] = useState(false);
  const tranches = current ? waiverTranches(current) : [];
  if (!canWaive || !current || (!tranches.length && !open)) return null;
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Record Exception</Button>
      {open ? <StayPointsDialog dialog={{ kind: "request" }} membershipId={current.membershipId} gold={supplementary} venues={[]}
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
          { value: "welcome-gift", label: "Annual Points", allowed: access["welcome-gift"], render: () => withPicker(<WelcomeGiftPanel />) },
          { value: "resort-bills", label: "Pending Bills", allowed: access["resort-bills"], render: () => withPicker(<ResortBillsPanel />) },
          { value: "waivers", label: "Special Cases", allowed: access.waivers, render: () => withPicker(<WaiversPanel />) },
          { value: "promos", label: "Promotions", allowed: access.promos, render: () => <PromosPanel /> },
          { value: "promo-points", label: "Promo History", allowed: access["promo-points"], render: () => <PromoPointsPanel /> },
        ]}
      />
    </StayPointsMembershipProvider>
  );
}

function StayPointsDialog({ dialog, membershipId, gold, venues, tranches, pending, submit, onClose, selectedHolder, earnPoints = false }: {
  earnPoints?: boolean;
  selectedHolder?: import("@/data/contracts/member-qr-repository").MemberQrHolder;
  dialog: Dialog; membershipId: string; gold: boolean; venues: { id: string; name: string; type: OutletType }[]; tranches: PointsTranche[];
  pending: boolean; submit: (input: StayPointsAction) => Promise<unknown>; onClose: () => void;
}) {
  // The date a bill is entered is almost always today, so start there; staff can still change it.
  const [date, setDate] = useState(() => (dialog.kind === "bill" ? manilaToday() : ""));
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [excluded, setExcluded] = useState("");
  const [venue, setVenue] = useState("");
  const [holder, setHolder] = useState<"primary" | "supplementary">(selectedHolder?.holder ?? "primary");
  const [reason, setReason] = useState("");
  const [tranche, setTranche] = useState("");
  const [ground, setGround] = useState<WaiverRequest["ground"]>();
  const [error, setError] = useState<string>();

  const titles = { bill: "Earn Points", refund: "Record resort bill refund", request: "Record exception request", grant: "Approve Gift Exception", refuse: "Decline Gift Exception" };
  const save = async () => {
    try {
      if (dialog.kind === "bill" || dialog.kind === "refund") {
        const amountCentavos = parsePesoToCentavos(amount);
        if (amountCentavos === null) throw new Error("Enter the amount in pesos.");
        if (dialog.kind === "refund") await submit({ action: "refund", spendId: dialog.id, date, amountCentavos, reason });
        else {
          const excludedCentavos = excluded ? parsePesoToCentavos(excluded) : 0;
          if (excludedCentavos === null) throw new Error("Enter exclusions in pesos.");
          await submit({ action: "enter", membershipId, venueId: venue, date, grossCentavos: amountCentavos, excludedCentavos, holder, scannedCode: selectedHolder?.scannedCode, description: reason });
        }
      } else if (dialog.kind === "request") {
        if (!ground) throw new Error("Choose a ground for the exception.");
        await submit({ action: "request-waiver", membershipId, tranche: Number(tranche), date, ground, supportingReference: reference });
      } else {
        await submit({ action: "decide-waiver", waiverId: dialog.id, granted: dialog.kind === "grant", releaseDate: date || null, reason });
      }
      toast.success(earnPoints ? "Purchase submitted. Any eligible points will be added after review." : dialog.kind === "bill" ? "Bill saved for approval." : "Saved.");
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return <FormDialog open title={titles[dialog.kind]} submitText={earnPoints ? "Submit for Review" : "Save"} submitVariant={dialog.kind === "grant" ? "success" : dialog.kind === "refuse" ? "destructive" : "default"} pending={pending} error={error} onClose={onClose} onSubmit={() => void save()}>
    {dialog.kind !== "refuse" ? <StandardDateField required label={dialog.kind === "bill" ? (earnPoints ? "Purchase Date" : "Bill date") : dialog.kind === "refund" ? "Refund date" : dialog.kind === "grant" ? "Next administrative cycle date" : "Date written request received"} value={date} onChange={setDate} /> : null}
    {dialog.kind === "bill" ? <>
      <SelectField label={earnPoints ? "Location" : "AFhomes Direct Operation"} required value={venue} options={outletItems(venues)} onChange={setVenue} />
      {selectedHolder ? <p>{selectedHolder.holderName} · {selectedHolder.vipNumber}</p> : gold ? <SelectField label="Cardholder" value={holder} options={[{ value: "primary", label: "Primary" }, { value: "supplementary", label: "Extra cardholder" }]} onChange={(value) => setHolder(value === "supplementary" ? value : "primary")} /> : null}
      <TextField label={earnPoints ? "Receipt Number" : "Official receipt number"} value="Assigned automatically when saved" onChange={() => undefined} disabled hint="The system issues the receipt number. It cannot be edited." />
      <MoneyField label="Total Bill Amount" required value={amount} onChange={setAmount} hint="The full bill before any discount." />
      <MoneyField label="Amount Not Eligible for Points" value={excluded} onChange={setExcluded} hint="Exclude taxes, government fees, gratuities, points, and other amounts that do not qualify." />
      <TextAreaField label="Notes" value={reason} onChange={setReason} />
    </> : null}
    {dialog.kind === "refund" ? <MoneyField label="Qualifying amount refunded" required value={amount} onChange={setAmount} /> : null}
    {dialog.kind === "refund" || dialog.kind === "grant" || dialog.kind === "refuse" ? <TextAreaField label="Written reason" required value={reason} onChange={setReason} /> : null}
    {dialog.kind === "request" ? <>
      <SelectField label="Year" required value={tranche} options={tranches.map((item) => ({ value: String(item.number), label: `Year ${item.number}` }))} onChange={setTranche} />
      <SelectField label="Ground" required value={ground} options={WAIVER_GROUNDS.map((item) => ({ value: item, label: item }))} onChange={(value) => setGround(WAIVER_GROUNDS.find((item) => item === value))} />
      <TextField label="Supporting document reference" required value={reference} onChange={setReference} />
    </> : null}
  </FormDialog>;
}
