"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import type { BookingView, MemberPoints } from "@/data/contracts/redemption-repository";
import { useRedemption, useRedemptionBookingAction } from "@/data/redemption-queries";
import type { BookingStatus } from "@/modules/redemption/types";
import { AdminPage, AdminSectionHeading } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { TextAreaField, TextField } from "@/shared/forms/modern";
import { Input } from "@/shared/ui/input";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";
import { RedemptionBookingDialog } from "../components/redemption-booking-dialog";
import { buildRedemptionBookingMenuProps } from "../actions/redemption-actions";

const fmt = (n: number) => n.toLocaleString("en-PH");

const STATUS: Record<BookingStatus, { key: string; label: string }> = {
  pending_payment: { key: "pending", label: "Pending Payment" },
  confirmed: { key: "confirmed", label: "Confirmed" },
  completed: { key: "finalized", label: "Completed" },
  cancelled: { key: "cancelled", label: "Cancelled, points returned" },
  late_cancelled: { key: "overdue", label: "Late cancellation, points forfeited" },
  no_show: { key: "rejected", label: "No-show, points forfeited" },
  transfer_cancelled: { key: "cancelled", label: "Cancelled for card transfer" },
};
const statusBadge = (booking: BookingView) => booking.provisional && (booking.status === "confirmed" || booking.status === "pending_payment")
  ? <BizBadge status="pending" label={booking.status === "confirmed" ? "Provisional hold" : "Provisional · Pending Payment"} />
  : <BizBadge status={STATUS[booking.status].key} label={STATUS[booking.status].label} />;

type Dialog = { kind: "cancel" | "no-show" | "approve-cash"; booking: BookingView } | null;

/** Manila date and time now, in the value format of a datetime-local input. */
function nowManilaInput(): string {
  const parts = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date());
  return parts.replace(" ", "T");
}

export function RedemptionPage() {
  const data = useRedemption();
  const act = useRedemptionBookingAction();
  const canBook = useOperation("redemption.book");
  const canApprove = useOperation("finance.verify");
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const [newOpen, setNewOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [text, setText] = useState("");
  const [when, setWhen] = useState(nowManilaInput);
  const [error, setError] = useState<string | undefined>();

  const overview = data.data;
  const detail = overview?.bookings.find((item) => item.id === openId) ?? null;
  const venueOf = (id: string) => overview?.venues.find((item) => item.id === id);
  const ledger = useMemo(() => (detail && overview ? overview.ledger.filter((item) => item.bookingId === detail.id).reverse() : []), [detail, overview]);

  const [memberSearch, setMemberSearch] = useState("");
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [bookingVenue, setBookingVenue] = useState("all");
  const visibleMembers = useMemo(() => (overview?.members ?? []).filter((item) => matchesSearch(memberSearch, item.customerName, item.vipNumber)), [overview, memberSearch]);
  const visibleBookings = useMemo(
    () => (overview?.bookings ?? []).filter((item) => (bookingStatus === "all" || item.status === bookingStatus) && (bookingVenue === "all" || item.venueId === bookingVenue) && matchesSearch(bookingSearch, item.reference, item.customerName, item.venueName)),
    [overview, bookingSearch, bookingStatus, bookingVenue],
  );
  const bookingStatusOptions = [{ value: "all", label: "All statuses" }, ...(Object.keys(STATUS) as BookingStatus[]).map((value) => ({ value, label: STATUS[value].label }))];
  const venueOptions = [{ value: "all", label: "All venues" }, ...(overview?.venues ?? []).map((item) => ({ value: item.id, label: item.name }))];

  const memberColumns = useMemo<ColumnDef<MemberPoints, unknown>[]>(
    () => [
      { id: "holder", header: "Cardholder", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.customerName}</div><div className="tw:text-xs tw:text-muted-foreground">{row.original.vipNumber ?? "No card"} · {row.original.productCode}</div></div> },
      { id: "weekday", header: "Weekday points", cell: ({ row }) => <span>{fmt(row.original.weekday.available)}<span className="tw:block tw:text-xs tw:text-muted-foreground">{fmt(row.original.weekday.reserved)} reserved</span></span> },
      { id: "weekend", header: "Weekend points", cell: ({ row }) => <span>{fmt(row.original.weekend.available)}<span className="tw:block tw:text-xs tw:text-muted-foreground">{fmt(row.original.weekend.reserved)} reserved</span></span> },
      { id: "table", header: "Points table", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.tableVersion ? `Version ${row.original.tableVersion}` : "None") },
      { id: "pad", header: "Activation date", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => (row.original.padDate ? formatDate(row.original.padDate) : "Not set") },
      { id: "state", header: "Can book", cell: ({ row }) => (row.original.blockedReasons.length === 0 ? <BizBadge status="active" label="Yes" /> : <span className="tw:text-xs tw:text-muted-foreground">{row.original.blockedReasons[0]}</span>) },
    ],
    [],
  );
  const bookingColumns = useMemo<ColumnDef<BookingView, unknown>[]>(
    () => [
      { id: "ref", header: "Booking", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.reference}</div><div className="tw:text-xs tw:text-muted-foreground">{row.original.customerName}</div></div> },
      { id: "venue", header: "Venue", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.venueName} · ${row.original.roomType}` },
      { id: "stay", header: "Stay", cell: ({ row }) => `${formatDate(row.original.checkIn)} to ${formatDate(row.original.checkOut)}` },
      { id: "points", header: "Points", cell: ({ row }) => `${fmt(row.original.reservedWeekday)} wd / ${fmt(row.original.reservedWeekend)} we${row.original.provisional ? " needed" : ""}` },
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
      if (dialog.kind === "cancel") await run(act.mutateAsync({ id: dialog.booking.id, action: "cancel", reason: text.trim(), cancelledAt: new Date(`${when}:00+08:00`).toISOString() }), "Booking cancelled.");
      else if (dialog.kind === "no-show") await run(act.mutateAsync({ id: dialog.booking.id, action: "no-show", reason: text.trim() }), "No-show recorded.");
      else await run(act.mutateAsync({ id: dialog.booking.id, action: "approve-cash", reference: text.trim() }), "Money part approved.");
      closeDialog();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const recordCheckIn = (booking: BookingView) => confirmRun({
    title: "Record check-in?", description: booking.provisional
      ? "The system checks whether the Annual Welcome Gift covers this stay before using points."
      : "The reserved points will be used for this stay.",
    confirmText: "Record check-in", action: () => act.mutateAsync({ id: booking.id, action: "complete" }),
    successTitle: "Check-in recorded.", errorTitle: "Could not record check-in",
  });

  const sheetMenu = detail
    ? buildRedemptionBookingMenuProps(detail, { canBook, canApprove }, {
        onApproveCash: () => open("approve-cash", detail),
        onComplete: () => recordCheckIn(detail),
        onNoShow: () => open("no-show", detail),
        onCancel: () => open("cancel", detail),
      })
    : null;
  const footer = detail ? (
    <>
      {sheetMenu?.extraItems.map((item) => (
        <Button key={item.key} type="button" variant={item.key === "approve-cash" ? "primary" : item.key === "cancel" ? "danger" : "outline"} onClick={item.onClick}>
          {item.label}
        </Button>
      ))}
    </>
  ) : undefined;

  const deadline = detail && venueOf(detail.venueId) ? `${venueOf(detail.venueId)!.cutoffHours} hours before check-in at ${venueOf(detail.venueId)!.checkInTime}` : null;

  return (
    <AdminPage
      anyOf={["redemption"]}
      title="Redemption"
      description="Book accommodation with Stay Points at open AFhomes Direct Operations venues. Staff record points use at check-in."
      crumbs={[{ label: "Redemption" }]}
      actions={canBook ? <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setNewOpen(true)}><Plus aria-hidden="true" /> New booking</Button> : null}
    >
      <QueryState isLoading={data.isLoading} error={data.error}>
        {overview ? (
          <>
            {overview.tableVersions.every((item) => item.sample) ? <InfoNote>Sample table. Replace with the approved table.</InfoNote> : null}
            <InfoNote>Points have no cash value and pay accommodation only.</InfoNote>
            <AdminSectionHeading title="Points by cardholder" description="Available points per bucket after reservations. Weekday and weekend points never convert." />
            <FilterBar search={memberSearch} onSearch={setMemberSearch} searchLabel="Search cardholders" />
            <DataTable data={visibleMembers} columns={memberColumns} getRowId={(row) => row.membershipId} emptyText={overview.members.length === 0 ? "No activated memberships." : "No cardholders match the search."} caption="Points by cardholder" />
            <AdminSectionHeading title="Bookings" />
            <FilterBar search={bookingSearch} onSearch={setBookingSearch} searchLabel="Search bookings" filters={[{ label: "Booking status filter", value: bookingStatus, onChange: setBookingStatus, options: bookingStatusOptions }, { label: "Venue filter", value: bookingVenue, onChange: setBookingVenue, options: venueOptions }]} />
            <DataTable data={visibleBookings} columns={bookingColumns} getRowId={(row) => row.id} emptyText={overview.bookings.length === 0 ? "No bookings yet." : "No bookings match the filters."} caption="Redemption bookings" onRowOpen={(row) => setOpenId(row.id)} getRowLabel={(row) => `Open booking ${row.reference}`} rowActions={(row) => {
              const menu = buildRedemptionBookingMenuProps(row, { canBook, canApprove }, {
                onView: () => setOpenId(row.id),
                onApproveCash: () => open("approve-cash", row),
                onComplete: () => recordCheckIn(row),
                onNoShow: () => open("no-show", row),
                onCancel: () => open("cancel", row),
              });
              return <RowActionsMenu {...menu} />;
            }} />
            <RedemptionBookingDialog open={newOpen} overview={overview} onClose={() => setNewOpen(false)} />
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
                  { label: "Venue", value: `${detail.venueName} · ${detail.roomType}` },
                  { label: "Check-in", value: formatDate(detail.checkIn) },
                  { label: "Departure", value: formatDate(detail.checkOut) },
                  { label: "Guests", value: String(detail.guests) },
                  { label: "Staying cardholder", value: detail.stayingHolder },
                  { label: "Cancellation cut-off", value: deadline },
                ] },
                { title: "Points", rows: [
                  { label: "Points table", value: `Version ${detail.basisVersion}` },
                  { label: detail.provisional ? "Weekday needed" : "Weekday reserved", value: fmt(detail.reservedWeekday) },
                  { label: detail.provisional ? "Weekend needed" : "Weekend reserved", value: fmt(detail.reservedWeekend) },
                  ...detail.nights.map((night) => ({ label: formatDate(night.date), value: `${night.reason === "holiday" ? "Holiday" : night.reason === "weekend" ? "Weekend" : "Weekday"} night · ${night.payment === "cash" ? "money" : `${fmt(night.points)} points`}` })),
                ] },
                ...(detail.cashNights > 0 ? [{ title: "Money part", rows: [
                  { label: "Nights in money", value: String(detail.cashNights) },
                  { label: "Amount", value: <Money value={detail.cashAmountCentavos} /> },
                  { label: "Receipt reference", value: detail.cashReference ?? "Awaiting Finance approval" },
                ] }] : []),
                ...(ledger.length > 0 ? [{ title: "Points movements", rows: ledger.map((entry) => ({ label: `${entry.type} · ${entry.bucket}`, value: fmt(entry.points) })) }] : []),
              ]
            : []
        }
        history={detail ? detail.history.map((item, index) => ({ key: `${item.at}-${index}`, when: item.at.slice(0, 16).replace("T", " "), text: item.note ? `${item.event}: ${item.note}` : item.event })) : []}
        footer={footer}
      />
      <FormDialog
        open={dialog !== null}
        title={dialog?.kind === "cancel" ? "Cancel booking" : dialog?.kind === "no-show" ? "Record no-show" : "Approve money part"}
        description={dialog?.kind === "cancel" ? "Cancelled by the venue cut-off, the points return to the same buckets. After it, they are forfeited." : dialog?.kind === "no-show" ? "The reserved points are forfeited." : "Enter the approved receipt reference (doc 07). The booking becomes Confirmed."}
        submitText={dialog?.kind === "approve-cash" ? "Approve" : "Confirm"}
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
    </AdminPage>
  );
}
