"use client";

import { useMemo, useState } from "react";
import { useOperation } from "@/data/business-queries";
import { useRedemption } from "@/data/redemption-queries";
import type { Holiday, PointsRow, PointsTableVersion, RedemptionVenue } from "@/modules/redemption/types";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { SelectField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { HolidayDialog, PublishVersionDialog, VenueDialog } from "../components/redemption-config-dialogs";
import { useRedemptionConfigAction } from "@/data/redemption-queries";
import type { RedemptionPanelCreateProps } from "./redemption-page";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmt = (n: number) => n.toLocaleString("en-PH");

/** Points table tab (doc 10 section 8): the tab and New version both need redemption.configure. */
export function RedemptionPointsTablePanel({ createOpen = false, onCreateClose = () => {} }: RedemptionPanelCreateProps) {
  const data = useRedemption();
  const canConfigure = useOperation("redemption.configure");
  const [versionId, setVersionId] = useState<string | undefined>();
  const [rowSearch, setRowSearch] = useState("");
  const [rowVenue, setRowVenue] = useState("all");

  const overview = data.data;
  const versions = useMemo(() => [...(overview?.tableVersions ?? [])].sort((a, b) => b.version - a.version), [overview]);
  const shown: PointsTableVersion | undefined = versions.find((item) => item.id === versionId) ?? versions[0];
  const venueName = (id: string) => overview?.venues.find((item) => item.id === id)?.name ?? id;

  const rowColumns = useMemo<ColumnDef<PointsRow, unknown>[]>(
    () => [
      { id: "venue", header: "Venue", cell: ({ row }) => venueName(row.original.venueId) },
      { id: "room", header: "Room type", cell: ({ row }) => row.original.roomType },
      { id: "weekday", header: "Weekday points", cell: ({ row }) => fmt(row.original.weekdayPoints) },
      { id: "weekend", header: "Weekend and holiday points", cell: ({ row }) => fmt(row.original.weekendPoints) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- venueName reads the current overview
    [overview],
  );

  return (
    <QueryState isLoading={data.isLoading} error={data.error}>
      {overview ? (
        <>
          {shown ? (
            <>
              <SelectField label="Version" value={shown.id} options={versions.map((item) => ({ value: item.id, label: `Version ${item.version}, effective ${item.effectiveDate}` }))} onChange={setVersionId} className="tw:max-w-sm" />
              <p className="tw:text-sm">Weekend nights: {shown.weekendDays.map((day) => DAY_NAMES[day]).join(", ")}{shown.note ? `. ${shown.note}` : ""}</p>
              <FilterBar search={rowSearch} onSearch={setRowSearch} searchLabel="Search room types" filters={[{ label: "Venue filter", value: rowVenue, onChange: setRowVenue, options: [{ value: "all", label: "All venues" }, ...overview.venues.map((item) => ({ value: item.id, label: item.name }))] }]} />
              <DataTable data={shown.rows.filter((row) => (rowVenue === "all" || row.venueId === rowVenue) && matchesSearch(rowSearch, row.roomType))} columns={rowColumns} getRowId={(row) => `${row.venueId}-${row.roomType}`} emptyText={shown.rows.length === 0 ? "No rows." : "No rows match the filters."} caption="Points per night" />
            </>
          ) : (
            <p className="tw:text-sm tw:text-muted-foreground">No points table versions yet.</p>
          )}
          {createOpen && canConfigure ? <PublishVersionDialog open overview={overview} onClose={onCreateClose} /> : null}
        </>
      ) : null}
    </QueryState>
  );
}

/** Holidays tab (doc 10 section 7): the tab, add and remove all need redemption.configure. */
export function RedemptionHolidaysPanel({ createOpen = false, onCreateClose = () => {} }: RedemptionPanelCreateProps) {
  const data = useRedemption();
  const act = useRedemptionConfigAction();
  const canConfigure = useOperation("redemption.configure");
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidayStatus, setHolidayStatus] = useState("all");
  const overview = data.data;

  const holidayColumns = useMemo<ColumnDef<Holiday, unknown>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
      { id: "name", header: "Name", cell: ({ row }) => row.original.name },
      { id: "state", header: "Status", cell: ({ row }) => <BizBadge status={row.original.removed ? "retired" : "active"} label={row.original.removed ? "Removed" : "In calendar"} /> },
    ],
    [],
  );

  return (
    <>
      <QueryState isLoading={data.isLoading} error={data.error}>
        {overview ? (
          <>
            <FilterBar search={holidaySearch} onSearch={setHolidaySearch} searchLabel="Search holidays" filters={[{ label: "Holiday status filter", value: holidayStatus, onChange: setHolidayStatus, options: [{ value: "all", label: "All statuses" }, { value: "calendar", label: "In calendar" }, { value: "removed", label: "Removed" }] }]} />
            <DataTable data={overview.holidays.filter((row) => (holidayStatus === "all" || (holidayStatus === "removed") === Boolean(row.removed)) && matchesSearch(holidaySearch, row.name))} columns={holidayColumns} getRowId={(row) => row.id} emptyText={overview.holidays.length === 0 ? "No holidays." : "No holidays match the filters."} caption="Holiday calendar" rowActions={canConfigure ? (row) => (!row.removed ? <RowActionsMenu itemName={row.name} extraItems={[{ key: "remove", label: "Remove from calendar", danger: true, onClick: () => setRemoving(row) }]} /> : null) : undefined} />
            {createOpen && canConfigure ? <HolidayDialog open onClose={onCreateClose} /> : null}
          </>
        ) : null}
      </QueryState>
      <ReasonDialog open={removing !== null} title="Remove holiday" description="The date stops being a holiday for new bookings. Confirmed bookings keep their points." confirmText="Remove" danger successText="Holiday removed." onClose={() => setRemoving(null)} onSubmit={(reason) => (removing ? act.mutateAsync({ action: "remove-holiday", id: removing.id, reason }) : Promise.resolve())} />
    </>
  );
}

/** Venues tab (doc 10 section 5): the tab, add and edit all need redemption.configure. */
export function RedemptionVenuesPanel({ createOpen = false, onCreateClose = () => {} }: RedemptionPanelCreateProps) {
  const data = useRedemption();
  const canConfigure = useOperation("redemption.configure");
  const [editingVenue, setEditingVenue] = useState<RedemptionVenue | null>(null);
  const [venueSearch, setVenueSearch] = useState("");
  const [venueStatus, setVenueStatus] = useState("all");
  const overview = data.data;

  const venueColumns = useMemo<ColumnDef<RedemptionVenue, unknown>[]>(
    () => [
      { id: "name", header: "Venue", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status === "open" ? "active" : "inactive"} label={row.original.status === "open" ? "Open" : "Not open yet"} /> },
      { id: "cutoff", header: "Cancellation cut-off", cell: ({ row }) => `${row.original.cutoffHours} hours before check-in` },
      { id: "checkin", header: "Check-in time", cell: ({ row }) => row.original.checkInTime },
    ],
    [],
  );

  return (
    <QueryState isLoading={data.isLoading} error={data.error}>
      {overview ? (
        <>
          <FilterBar search={venueSearch} onSearch={setVenueSearch} searchLabel="Search venues" filters={[{ label: "Venue status filter", value: venueStatus, onChange: setVenueStatus, options: [{ value: "all", label: "All statuses" }, { value: "open", label: "Open" }, { value: "not_open", label: "Not open yet" }] }]} />
          <DataTable data={overview.venues.filter((row) => (venueStatus === "all" || (venueStatus === "open") === (row.status === "open")) && matchesSearch(venueSearch, row.name))} columns={venueColumns} getRowId={(row) => row.id} emptyText={overview.venues.length === 0 ? "No venues." : "No venues match the filters."} caption="Venues" rowActions={canConfigure ? (row) => <RowActionsMenu itemName={row.name} onEdit={() => setEditingVenue(row)} /> : undefined} />
          {canConfigure && (createOpen || editingVenue) ? <VenueDialog key={createOpen ? "new" : editingVenue?.id} open venue={createOpen ? null : editingVenue} onClose={() => (createOpen ? onCreateClose() : setEditingVenue(null))} /> : null}
        </>
      ) : null}
    </QueryState>
  );
}
