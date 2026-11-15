"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import { useRedemption } from "@/data/redemption-queries";
import { manilaToday } from "@/modules/accreditation/dates";
import { selectTableVersion } from "@/modules/redemption/rules";
import type { Holiday, PointsRow, PointsTableVersion, RedemptionVenue } from "@/modules/redemption/types";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { QueryState } from "@/shared/components/modern/query-state";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { SelectField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { HolidayDialog, PublishVersionDialog, VenueDialog } from "../components/redemption-config-dialogs";
import { useRedemptionConfigAction } from "@/data/redemption-queries";
import type { RedemptionPanelCreateProps } from "./redemption-page";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmt = (n: number) => n.toLocaleString("en-PH");

/** "Friday and Saturday" from weekday numbers (0 = Sunday). */
const dayList = (days: number[]) => {
  const names = days.map((day) => DAY_NAMES[day]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "—");
};

/** Plain-word name of a points table, such as "From Jan 1, 2026". */
export const pointsTableFrom = (versions: readonly PointsTableVersion[], version: number | null): string | null => {
  const found = versions.find((item) => item.version === version);
  return found ? `From ${formatDate(found.effectiveDate)}` : null;
};

/** In use = the newest table already started in Manila today; later ones are coming up; the rest are old. */
const tableStatus = (item: PointsTableVersion, versions: readonly PointsTableVersion[]) => {
  const today = manilaToday();
  if (item.effectiveDate > today) return "coming up";
  return selectTableVersion(versions, today)?.id === item.id ? "in use" : "old";
};

/** Points table tab (doc 10 section 8): the tab and Update points table both need redemption.configure. */
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
      { id: "venue", header: "Venue", cell: ({ row }) => <span className="tw:font-semibold">{venueName(row.original.venueId)}</span> },
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
              <SelectField label="Points table" value={shown.id} options={versions.map((item) => ({ value: item.id, label: `From ${formatDate(item.effectiveDate)} (${tableStatus(item, versions)})` }))} onChange={setVersionId} className="tw:max-w-sm" />
              <Card variant="muted" className="tw:gap-1 tw:p-3 tw:text-sm">
                <p className="tw:flex tw:items-center tw:gap-2"><Info aria-hidden="true" className="tw:size-4 tw:shrink-0 tw:text-info" /> Weekend nights: {dayList(shown.weekendDays)}</p>
                {shown.note ? <p className="tw:text-muted-foreground">{shown.note}</p> : null}
              </Card>
              <FilterBar search={rowSearch} onSearch={setRowSearch} searchLabel="Search room types" filters={[{ label: "Venue filter", value: rowVenue, onChange: setRowVenue, options: [{ value: "all", label: "All venues" }, ...overview.venues.map((item) => ({ value: item.id, label: item.name }))] }]} />
              <DataTable data={shown.rows.filter((row) => (rowVenue === "all" || row.venueId === rowVenue) && matchesSearch(rowSearch, row.roomType))} columns={rowColumns} getRowId={(row) => `${row.venueId}-${row.roomType}`} emptyText={shown.rows.length === 0 ? "No rows." : "No rows match the filters."} caption="Points per night" />
            </>
          ) : (
            <p className="tw:text-sm tw:text-muted-foreground">No points tables yet.</p>
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidayStatus, setHolidayStatus] = useState("all");
  const overview = data.data;
  const detail = overview?.holidays.find((item) => item.id === openId) ?? null;

  const holidayColumns = useMemo<ColumnDef<Holiday, unknown>[]>(
    () => [
      { id: "name", header: "Name", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
      { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
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
            <DataTable data={overview.holidays.filter((row) => (holidayStatus === "all" || (holidayStatus === "removed") === Boolean(row.removed)) && matchesSearch(holidaySearch, row.name))} columns={holidayColumns} getRowId={(row) => row.id} emptyText={overview.holidays.length === 0 ? "No holidays." : "No holidays match the filters."} caption="Holiday calendar" onRowOpen={(row) => setOpenId(row.id)} getRowLabel={(row) => `Open holiday ${row.name}`} rowActions={canConfigure ? (row) => (!row.removed ? <RowActionsMenu itemName={row.name} extraItems={[{ key: "remove", label: "Remove from calendar", tone: "danger", onClick: () => setRemoving(row) }]} /> : null) : undefined} />
            {createOpen && canConfigure ? <HolidayDialog open onClose={onCreateClose} /> : null}
          </>
        ) : null}
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setOpenId(null)}
        title={detail ? detail.name : "Holiday"}
        subtitle={detail ? formatDate(detail.date) : undefined}
        badge={detail ? <BizBadge status={detail.removed ? "retired" : "active"} label={detail.removed ? "Removed" : "In calendar"} /> : undefined}
        sections={detail ? [{ title: "Holiday", rows: [{ label: "Name", value: detail.name }, { label: "Date", value: formatDate(detail.date) }, { label: "Status", value: detail.removed ? "Removed" : "In calendar" }] }] : []}
        footer={detail && !detail.removed && canConfigure ? <Button type="button" variant="destructive" onClick={() => { setRemoving(detail); setOpenId(null); }}>Remove from calendar</Button> : undefined}
      />
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
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status === "open" ? "active" : "pending"} label={row.original.status === "open" ? "Open" : "Coming soon"} /> },
      { id: "cutoff", header: "Cancellation cut-off", cell: ({ row }) => `${row.original.cutoffHours} hours before check-in` },
      { id: "checkin", header: "Check-in time", cell: ({ row }) => row.original.checkInTime },
    ],
    [],
  );

  return (
    <QueryState isLoading={data.isLoading} error={data.error}>
      {overview ? (
        <>
          <FilterBar search={venueSearch} onSearch={setVenueSearch} searchLabel="Search venues" filters={[{ label: "Venue status filter", value: venueStatus, onChange: setVenueStatus, options: [{ value: "all", label: "All statuses" }, { value: "open", label: "Open" }, { value: "not_open", label: "Coming soon" }] }]} />
          <DataTable data={overview.venues.filter((row) => (venueStatus === "all" || (venueStatus === "open") === (row.status === "open")) && matchesSearch(venueSearch, row.name))} columns={venueColumns} getRowId={(row) => row.id} emptyText={overview.venues.length === 0 ? "No venues." : "No venues match the filters."} caption="Venues" onRowOpen={canConfigure ? (row) => setEditingVenue(row) : undefined} getRowLabel={(row) => `Open venue ${row.name}`} rowActions={canConfigure ? (row) => <RowActionsMenu itemName={row.name} onEdit={() => setEditingVenue(row)} /> : undefined} />
          {canConfigure && (createOpen || editingVenue) ? <VenueDialog key={createOpen ? "new" : editingVenue?.id} open venue={createOpen ? null : editingVenue} onClose={() => (createOpen ? onCreateClose() : setEditingVenue(null))} /> : null}
        </>
      ) : null}
    </QueryState>
  );
}
