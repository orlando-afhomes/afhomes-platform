"use client";

import { useMemo, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import type { MemberQrHolder } from "@/data/contracts/member-qr-repository";
import { useCancelRestaurantReservation, useRestaurantReservations } from "@/data/reservation-queries";
import { useOutlets } from "@/data/settings-queries";
import type { RestaurantReservation } from "@/modules/reservations/types";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { formatDate } from "@/shared/lib/format-date";
import { Button } from "@/shared/ui/button";

/** Restaurant reservations under the bookings list. Hidden until one exists; for a cardholder it shows only theirs. */
export function RestaurantReservationsTable({ selected }: { selected?: MemberQrHolder }) {
  const canBook = useOperation("redemption.book");
  const reservations = useRestaurantReservations(canBook);
  const outlets = useOutlets();
  const cancel = useCancelRestaurantReservation();
  const [cancelling, setCancelling] = useState<RestaurantReservation | null>(null);
  const names = useMemo(() => new Map((outlets.data ?? []).map((outlet) => [outlet.id, outlet.name])), [outlets.data]);
  const rows = (reservations.data ?? []).filter((item) => !selected || item.membershipId === selected.membershipId);

  const columns = useMemo<ColumnDef<RestaurantReservation, unknown>[]>(() => [
    { id: "reference", header: "Reservation no.", cell: ({ row }) => <span className="tw:font-semibold">{row.original.reference}</span> },
    { id: "guest", header: "Guest", cell: ({ row }) => row.original.guestName },
    { id: "restaurant", header: "Restaurant", cell: ({ row }) => names.get(row.original.venueId) ?? "Restaurant" },
    { id: "when", header: "Date and Time", cell: ({ row }) => `${formatDate(row.original.date)} · ${row.original.time}` },
    { id: "party", header: "Guests", cell: ({ row }) => row.original.partySize },
    { id: "status", header: "Status", cell: ({ row }) => row.original.status === "reserved" ? <BizBadge status="active" label="Reserved" /> : <BizBadge status="inactive" label="Cancelled" /> },
    {
      id: "actions", header: "Actions",
      cell: ({ row }) => row.original.status === "reserved"
        ? <Button type="button" variant="outline" size="sm" onClick={() => setCancelling(row.original)}>Cancel</Button>
        : null,
    },
  ], [names]);

  if (!canBook || rows.length === 0) return null;
  return (
    <section aria-label="Restaurant reservations" className="tw:flex tw:flex-col tw:gap-3">
      <h3 className="tw:flex tw:items-center tw:gap-2 tw:text-base tw:font-semibold"><UtensilsCrossed aria-hidden="true" className="tw:size-4 tw:text-primary" /> Restaurant Reservations</h3>
      <DataTable data={rows} columns={columns} getRowId={(row) => row.id} caption="Restaurant Reservations" emptyText="No reservations yet." />
      <ReasonDialog
        open={cancelling !== null}
        title="Cancel This Reservation?"
        description={cancelling ? `Reservation ${cancelling.reference} for ${cancelling.guestName} will be cancelled.` : ""}
        confirmText="Cancel Reservation"
        successText="Reservation cancelled."
        danger
        onClose={() => setCancelling(null)}
        onSubmit={(reason) => cancel.mutateAsync({ id: cancelling!.id, reason })}
      />
    </section>
  );
}
