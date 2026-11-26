"use client";

import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { useRepositories } from "@/data/queries";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import { useTierDisplayName } from "../components/use-tier-display-name";
import type { BookingView, MemberPoints } from "@/data/contracts/redemption-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { useRedemption, useRedemptionBookingAction } from "@/data/redemption-queries";
import type { BookingStatus } from "@/modules/redemption/types";
import { AreaPage } from "@/shared/components/admin/area-page";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { DetailActions } from "@/shared/components/modern/detail-actions";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu, type RowActionTone } from "@/shared/components/modern/row-actions-menu";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { TextAreaField, TextField } from "@/shared/forms/modern";
import { EMPTY } from "@/shared/lib/empty-value";
import { humanize } from "@/shared/lib/humanize";
import { Input } from "@/shared/ui/input";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";
import { NewBookingFlow } from "../components/new-booking-flow";
import { RestaurantReservationsTable } from "../components/restaurant-reservations-table";
import { buildRedemptionBookingMenuProps } from "../actions/redemption-actions";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { pointsTableFrom } from "./redemption-points-table-page";

const fmt = (n: number) => n.toLocaleString("en-PH");

const STATUS: Record<BookingStatus, { key: string; label: string }> = {
  pending_payment: { key: "pending", label: "Pending Payment" },
  confirmed: { key: "confirmed", label: "Confirmed" },
  completed: { key: "completed", label: "Completed" },
  cancelled: { key: "cancelled", label: "Cancelled, points returned" },
  late_cancelled: { key: "late_cancelled", label: "Late cancellation, points lost" },
  no_show: { key: "rejected", label: "No-show, points lost" },
  transfer_cancelled: { key: "transfer_cancelled", label: "Cancelled for card transfer" },
};
const statusBadge = (booking: BookingView) => booking.provisional && (booking.status === "confirmed" || booking.status === "pending_payment")
  ? <BizBadge status={booking.status === "confirmed" ? "provisional" : "pending_payment"} label={booking.status === "confirmed" ? "Provisional hold" : "Provisional · Pending Payment"} />
  : <BizBadge status={booking.status === "confirmed" && booking.checkedIn ? "checked_in" : STATUS[booking.status].key} label={booking.status === "confirmed" && booking.checkedIn ? "Checked In" : STATUS[booking.status].label} />;

/** Button and menu color per booking action (rule: confirm and check-in green, no-show amber, cancel red). */
const ACTION_TONE: Record<string, { tone: RowActionTone; variant: "success" | "warning" | "destructive" | "outline" }> = {
  "approve-cash": { tone: "success", variant: "success" },
  "check-in": { tone: "success", variant: "success" },
  complete: { tone: "success", variant: "success" },
  "no-show": { tone: "warning", variant: "warning" },
  cancel: { tone: "danger", variant: "destructive" },
};

type Dialog = { kind: "cancel" | "no-show" | "approve-cash"; booking: BookingView } | null;

/** Newest booking first; bookings still waiting for payment rise ahead on the same date. */
const BOOKING_ORDER: TableOrder<BookingView> = {
  date: (row) => row.createdAt,
  attention: (row) => (row.status === "pending_payment" ? 2 : 0),
};

/** Manila date and time now, in the value format of a datetime-local input. */
function nowManilaInput(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return parts.replace(" ", "T");
}

/** Create dialogs are opened from the area header; each panel renders its own dialog. */
export type RedemptionPanelCreateProps = { createOpen?: boolean; onCreateClose?: () => void; selected?: MemberQrHolder };

/** Bookings tab: New booking (redemption.book), booking actions (redemption.book; money part needs finance.verify). */
export function RedemptionBookingsPanel({ createOpen = false, onCreateClose = () => {}, selected }: RedemptionPanelCreateProps) {
  const data = useRedemption(selected?.scannedCode);
  const act = useRedemptionBookingAction();
  const { memberQr } = useRepositories();
  const canBook = useOperation("redemption.book");
  const canApprove = useOperation("finance.verify");
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState(nowManilaInput);
  const [error, setError] = useState<string | undefined>();

  const overview = data.data;
  const detail = overview?.bookings.find((item) => item.id === openId) ?? null;
  const venueOf = (id: string) => overview?.venues.find((item) => item.id === id);
  const ledger = useMemo(() => (detail && overview ? overview.ledger.filter((item) => item.bookingId === detail.id).reverse() : []), [detail, overview]);

  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [bookingVenue, setBookingVenue] = useState("all");
  const visibleBookings = useMemo(
    () => (overview?.bookings ?? []).filter((item) => (!selected || (item.membershipId === selected.membershipId && (item.stayingHolder === "Gold extra cardholder" ? "supplementary" : "primary") === selected.holder)) && (bookingStatus === "all" || item.status === bookingStatus) && (bookingVenue === "all" || item.venueId === bookingVenue) && matchesSearch(bookingSearch, item.reference, item.customerName, item.venueName)),
    [overview, bookingSearch, bookingStatus, bookingVenue, selected],
  );
  const bookingStatusOptions = [{ value: "all", label: "All statuses" }, ...(Object.keys(STATUS) as BookingStatus[]).map((value) => ({ value, label: STATUS[value].label }))];
  const venueOptions = [{ value: "all", label: "All venues" }, ...(overview?.venues ?? []).map((item) => ({ value: item.id, label: item.name }))];

  const bookingColumns = useMemo<ColumnDef<BookingView, unknown>[]>(
    () => [
      { id: "ref", header: "Booking no.", cell: ({ row }) => <span className="tw:font-semibold">{row.original.reference}</span> },
      { id: "holder", header: "Cardholder", cell: ({ row }) => row.original.customerName },
      { id: "venue", header: "Venue", cell: ({ row }) => row.original.venueName },
      { id: "stay", header: "Stay Dates", cell: ({ row }) => `${formatDate(row.original.checkIn)} to ${formatDate(row.original.checkOut)}` },
      { id: "status", header: "Status", cell: ({ row }) => statusBadge(row.original) },
    ],
    [],
  );

  const run = (promise: Promise<unknown>, success: string) =>
    promise.then(() => toast.success(success));
  const closeDialog = () => { setDialog(null); setText(""); setError(undefined); };
  const open = (kind: NonNullable<Dialog>["kind"], booking: BookingView) => { setText(""); setError(undefined); setWhen(nowManilaInput()); setDialog({ kind, booking }); };
  const submitDialog = async () => {
    if (!dialog) return;
    if (!text.trim()) { setError(dialog.kind === "approve-cash" ? "A receipt reference is required." : "A reason is required."); return; }
    setError(undefined);
    try {
      if (dialog.kind === "cancel") await run(act.mutateAsync({ id: dialog.booking.id, action: "cancel", reason: text.trim(), cancelledAt: new Date(`${when}:00+08:00`).toISOString(), scannedCode: selected?.scannedCode }), "Booking cancelled.");
      else if (dialog.kind === "no-show") await run(act.mutateAsync({ id: dialog.booking.id, action: "no-show", reason: text.trim(), scannedCode: selected?.scannedCode }), "No-show recorded.");
      else await run(act.mutateAsync({ id: dialog.booking.id, action: "approve-cash", reference: text.trim() }), "Money part approved.");
      closeDialog();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const recordCheckIn = async (booking: BookingView) => {
    const holder = booking.stayingHolder === "Gold extra cardholder" ? "supplementary" : "primary";
    try {
      const cardholder = selected ?? (await memberQr.identify(booking.membershipId)).find((item) => item.holder === holder);
      if (!cardholder) throw new Error("The staying cardholder is no longer registered.");
      confirmRun({
        title: "Record Check-In?",
        description: `Check ${cardholder.holderName}’s ID. The booking needs ${fmt(booking.reservedWeekday)} weekday and ${fmt(booking.reservedWeekend)} weekend points. These stay reserved until the stay ends.`,
        confirmText: "ID Checked · Record Check-In", tone: "success",
        action: () => act.mutateAsync({ id: booking.id, action: "check-in", verification: { holder, identityChecked: true, scannedCode: selected?.scannedCode } }),
        successTitle: `Check-in recorded for ${booking.reference}.`, errorTitle: "Could not record check-in",
      });
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not verify the staying cardholder.");
    }
  };
  const completeStay = (booking: BookingView) => confirmRun({
    title: "Complete Stay?",
    description: `Deduct ${fmt(booking.reservedWeekday)} weekday and ${fmt(booking.reservedWeekend)} weekend points for ${booking.reference}.`,
    confirmText: "Complete Stay", tone: "success", action: () => act.mutateAsync({ id: booking.id, action: "complete", scannedCode: selected?.scannedCode }),
    successTitle: `Stay ${booking.reference} completed.`, errorTitle: "Could not complete stay",
  });

  const sheetMenu = detail
    ? buildRedemptionBookingMenuProps(detail, { canBook, canApprove }, {
        onApproveCash: () => open("approve-cash", detail),
        onCheckIn: () => recordCheckIn(detail),
        onComplete: () => completeStay(detail),
        onNoShow: () => open("no-show", detail),
        onCancel: () => open("cancel", detail),
      })
    : null;
  const footer = sheetMenu ? <DetailActions actions={sheetMenu.extraItems.map((item) => ({
    ...item, next: ACTION_TONE[item.key]?.tone === "success", variant: ACTION_TONE[item.key]?.variant ?? "outline",
  }))} /> : undefined;

  const deadline = detail && venueOf(detail.venueId) ? `${venueOf(detail.venueId)!.cutoffHours} hours before check-in at ${venueOf(detail.venueId)!.checkInTime}` : null;

  return (
    <>
      <QueryState isLoading={data.isLoading} error={data.error}>
        {overview ? (
          <>
            <FilterBar search={bookingSearch} onSearch={setBookingSearch} searchLabel="Search bookings" filters={[{ label: "Booking status filter", value: bookingStatus, onChange: setBookingStatus, options: bookingStatusOptions }, { label: "Venue filter", value: bookingVenue, onChange: setBookingVenue, options: venueOptions }]} />
            <DataTable data={visibleBookings} columns={bookingColumns} getRowId={(row) => row.id} emptyText={overview.bookings.length === 0 ? "No bookings yet." : "No bookings match the filters."} caption="Redemption Bookings" orderBy={BOOKING_ORDER} onRowOpen={(row) => setOpenId(row.id)} getRowLabel={(row) => `Open booking ${row.reference}`} rowActions={(row) => {
              const menu = buildRedemptionBookingMenuProps(row, { canBook, canApprove }, {
                onApproveCash: () => open("approve-cash", row),
                onCheckIn: () => recordCheckIn(row),
                onComplete: () => completeStay(row),
                onNoShow: () => open("no-show", row),
                onCancel: () => open("cancel", row),
              });
              return <RowActionsMenu {...menu} extraItems={menu.extraItems.map((item) => ({ ...item, tone: ACTION_TONE[item.key]?.tone }))} />;
            }} />
            <RestaurantReservationsTable selected={selected} />
            {createOpen && canBook ? <NewBookingFlow overview={overview} selected={selected} onClose={onCreateClose} /> : null}
          </>
        ) : null}
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setOpenId(null)}
        title={detail ? `Booking ${detail.reference}` : "Booking"}
        subtitle={detail ? `${detail.customerName} · ${detail.vipNumber}` : undefined}
        badge={detail ? statusBadge(detail) : undefined}
        sections={
          detail
            ? [
                { title: "Stay", rows: [
                  { label: "Venue", value: detail.venueName },
                  { label: "Room type", value: detail.roomType },
                  { label: "Check-in", value: formatDate(detail.checkIn) },
                  { label: "Departure", value: formatDate(detail.checkOut) },
                  { label: "Guests", value: String(detail.guests) },
                  { label: "Staying cardholder", value: detail.stayingHolder },
                  { label: "Cancellation cut-off", value: deadline },
                ] },
                { title: "Points", rows: [
                  { label: "Points table", value: pointsTableFrom(overview?.tableVersions ?? [], detail.basisVersion) },
                  { label: detail.provisional ? "Weekday points needed" : "Weekday points reserved", value: fmt(detail.reservedWeekday) },
                  { label: detail.provisional ? "Weekend points needed" : "Weekend points reserved", value: fmt(detail.reservedWeekend) },
                  ...detail.nights.map((night) => ({ label: formatDate(night.date), value: `${night.reason === "holiday" ? "Holiday" : night.reason === "weekend" ? "Weekend" : "Weekday"} night · ${night.payment === "cash" ? "money" : `${fmt(night.points)} points`}` })),
                ] },
                ...(detail.cashNights > 0 ? [{ title: "Money Part", rows: [
                  { label: "Nights in money", value: String(detail.cashNights) },
                  { label: "Amount", value: <Money value={detail.cashAmountCentavos} /> },
                  { label: "Receipt reference", value: detail.cashReference ?? "Awaiting Finance approval" },
                ] }] : []),
                ...(ledger.length > 0 ? [{ title: "Points Movements", rows: ledger.map((entry) => ({ label: `${humanize(entry.type)} · ${humanize(entry.bucket)}`, value: fmt(entry.points) })) }] : []),
              ]
            : []
        }
        history={detail ? detail.history.map((item, index) => ({ key: `${item.at}-${index}`, when: item.at.slice(0, 16).replace("T", " "), text: item.note ? `${item.event}: ${item.note}` : item.event })) : []}
        footer={footer}
      />
      <FormDialog
        open={dialog !== null}
        title={dialog?.kind === "cancel" ? "Cancel Booking" : dialog?.kind === "no-show" ? "Record No-Show" : "Approve Payment"}
        description={dialog?.kind === "cancel" ? "Cancelled by the venue cut-off, the points return to the same buckets. After it, they are lost." : dialog?.kind === "no-show" ? "The reserved points are lost." : "Enter the approved receipt reference. The booking becomes Confirmed."}
        submitText={dialog?.kind === "approve-cash" ? "Approve" : "Confirm"}
        submitVariant={dialog?.kind === "approve-cash" ? "success" : dialog?.kind === "cancel" ? "destructive" : "warning"}
        pending={act.isPending}
        error={error}
        onClose={closeDialog}
        onSubmit={() => void submitDialog()}
      >
        {dialog?.kind === "approve-cash" ? (
          <TextField label="Receipt reference" required value={text} onChange={setText} />
        ) : (
          <TextAreaField label="Reason" required value={text} onChange={setText} />
        )}
        {dialog?.kind === "cancel" ? (
          <div className="tw:flex tw:flex-col tw:gap-1">
            <label htmlFor="redemption-cancelled-at" className="tw:text-sm tw:font-medium">Cancellation date and time</label>
            <Input id="redemption-cancelled-at" type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="tw:h-11" />
          </div>
        ) : null}
      </FormDialog>
      {confirmDialog}
    </>
  );
}

/** Cardholder points tab: read-only balances for anyone with the redemption grant. */
export function RedemptionCardholderPointsPanel() {
  const data = useRedemption();
  const tierName = useTierDisplayName();
  const [memberSearch, setMemberSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const overview = data.data;
  const detail = overview?.members.find((item) => item.membershipId === openId) ?? null;
  const visibleMembers = useMemo(() => (overview?.members ?? []).filter((item) => matchesSearch(memberSearch, item.customerName, item.vipNumber)), [overview, memberSearch]);

  const memberColumns = useMemo<ColumnDef<MemberPoints, unknown>[]>(
    () => [
      { id: "holder", header: "Cardholder", cell: ({ row }) => <span className="tw:font-semibold">{row.original.customerName}</span> },
      { id: "vip", header: "VIP no.", cell: ({ row }) => row.original.vipNumber ?? EMPTY },
      { id: "weekday", header: "Weekday Points", cell: ({ row }) => fmt(row.original.weekday.available) },
      { id: "weekend", header: "Weekend Points", cell: ({ row }) => fmt(row.original.weekend.available) },
      { id: "state", header: "Can Book", cell: ({ row }) => (row.original.blockedReasons.length === 0 ? <BizBadge status="active" label="Yes" /> : <span className="tw:text-xs tw:text-muted-foreground">{row.original.blockedReasons[0]}</span>) },
    ],
    [],
  );

  return (
    <>
      <QueryState isLoading={data.isLoading} error={data.error}>
        {overview ? (
          <>
            <FilterBar search={memberSearch} onSearch={setMemberSearch} searchLabel="Search cardholders" />
            <DataTable data={visibleMembers} columns={memberColumns} getRowId={(row) => row.membershipId} emptyText={overview.members.length === 0 ? "No activated memberships." : "No cardholders match the search."} caption="Points by Cardholder" onRowOpen={(row) => setOpenId(row.membershipId)} getRowLabel={(row) => `Open points for ${row.customerName}`} />
          </>
        ) : null}
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setOpenId(null)}
        title={detail ? detail.customerName : "Cardholder"}
        subtitle={detail ? (detail.vipNumber ?? EMPTY) : undefined}
        badge={detail ? (detail.blockedReasons.length === 0 ? <BizBadge status="active" label="Can book" /> : <BizBadge status="inactive" label="Cannot book" />) : undefined}
        sections={
          detail
            ? [
                { title: "Card", rows: [
                  { label: "Product", value: tierName(detail.productCode) },
                  { label: "Points table", value: pointsTableFrom(overview?.tableVersions ?? [], detail.tableVersion) ?? EMPTY },
                  { label: "Activation date", value: detail.padDate ? formatDate(detail.padDate) : EMPTY },
                ] },
                { title: "Points", rows: [
                  { label: "Weekday points available", value: fmt(detail.weekday.available) },
                  { label: "Weekday points reserved", value: fmt(detail.weekday.reserved) },
                  { label: "Weekend points available", value: fmt(detail.weekend.available) },
                  { label: "Weekend points reserved", value: fmt(detail.weekend.reserved) },
                ] },
                ...(detail.blockedReasons.length > 0 ? [{ title: "Why Booking Is Blocked", rows: detail.blockedReasons.map((reason, index) => ({ label: `Reason ${index + 1}`, value: reason })) }] : []),
              ]
            : []
        }
      />
    </>
  );
}

/** Redemption area: one page with the tabs of `ADMIN_AREA_TABS.redemption`; tab visibility follows `useAdminAreaTabAccess`. The setup tabs live in Settings. */
export function RedemptionAreaPage() {
  const access = useAdminAreaTabAccess("redemption");
  const canBook = useOperation("redemption.book");
  const [creating, setCreating] = useState(false);
  const close = () => setCreating(false);

  return (
    <AreaPage
      anyOf={["redemption"]}
      title="Redemption"
      actions={(tab) => tab === "bookings" && canBook
        ? <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setCreating(true)}><Plus aria-hidden="true" /> New Booking</Button>
        : null}
      tabs={ADMIN_AREA_TABS.redemption.map(({ value, label }) => ({
        value,
        label,
        allowed: access[value],
        render: () => {
          switch (value) {
            case "bookings": return <RedemptionBookingsPanel createOpen={creating} onCreateClose={close} />;
            case "cardholder-points": return <RedemptionCardholderPointsPanel />;
          }
        },
      }))}
    />
  );
}
