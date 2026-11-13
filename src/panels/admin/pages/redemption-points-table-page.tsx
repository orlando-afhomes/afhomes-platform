"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useOperation } from "@/data/business-queries";
import { useRedemption } from "@/data/redemption-queries";
import type { Holiday, PointsRow, PointsTableVersion, RedemptionVenue } from "@/modules/redemption/types";
import { SAMPLE_TABLE_NOTICE } from "@/modules/redemption/sample-seed";
import { AdminPage, AdminSectionHeading } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { QueryState } from "@/shared/components/modern/query-state";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { SelectField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";
import { HolidayDialog, PublishVersionDialog, VenueDialog } from "../components/redemption-config-dialogs";
import { useRedemptionConfigAction } from "@/data/redemption-queries";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const fmt = (n: number) => n.toLocaleString("en-PH");

/** Administrator-maintained Terms of Use table, holiday calendar and venues (doc 10 sections 5, 7, 8). */
export function RedemptionPointsTablePage() {
  const data = useRedemption();
  const act = useRedemptionConfigAction();
  const canConfigure = useOperation("redemption.configure");
  const [versionId, setVersionId] = useState<string | undefined>();
  const [publishOpen, setPublishOpen] = useState(false);
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<RedemptionVenue | null>(null);
  const [removing, setRemoving] = useState<Holiday | null>(null);
  const [rowSearch, setRowSearch] = useState("");
  const [rowVenue, setRowVenue] = useState("all");
  const [holidaySearch, setHolidaySearch] = useState("");
  const [holidayStatus, setHolidayStatus] = useState("all");
  const [venueSearch, setVenueSearch] = useState("");
  const [venueStatus, setVenueStatus] = useState("all");

  const overview = data.data;
  const versions = useMemo(() => [...(overview?.tableVersions ?? [])].sort((a, b) => b.version - a.version), [overview]);
  const shown: PointsTableVersion | undefined = versions.find((item) => item.id === versionId) ?? versions[0];
  const venueName = (id: string) => overview?.venues.find((item) => item.id === id)?.name ?? id;

  const rowColumns = useMemo<ColumnDef<PointsRow, unknown>[]>(
    () => [
      { id: "venue", header: "Venue", cell: ({ row }) => venueName(row.original.venueId) },
      { id: "room", header: "Room type", cell: ({ row }) => row.original.roomType },
      { id: "weekday", header: "Weekday / non-holiday", cell: ({ row }) => fmt(row.original.weekdayPoints) },
      { id: "weekend", header: "Weekend / holiday", cell: ({ row }) => fmt(row.original.weekendPoints) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- venueName reads the current overview
    [overview],
  );
  const holidayColumns = useMemo<ColumnDef<Holiday, unknown>[]>(
    () => [
      { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
      { id: "name", header: "Name", cell: ({ row }) => row.original.name },
      { id: "state", header: "Status", cell: ({ row }) => <BizBadge status={row.original.removed ? "retired" : "active"} label={row.original.removed ? "Removed" : "In calendar"} /> },
    ],
    [],
  );
  const venueColumns = useMemo<ColumnDef<RedemptionVenue, unknown>[]>(
    () => [
      { id: "name", header: "Venue", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.name}</div>{row.original.sample ? <div className="tw:text-xs tw:text-muted-foreground">Sample values</div> : null}</div> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status === "open" ? "active" : "inactive"} label={row.original.status === "open" ? "Open" : "Not open yet"} /> },
      { id: "cutoff", header: "Cut-off", cell: ({ row }) => `${row.original.cutoffHours} h before ${row.original.checkInTime}` },
    ],
    [],
  );

  return (
    <AdminPage anyOf={["redemption"]} title="Points Table" description="Points per night by venue and room type, the holiday calendar and each venue's cancellation cut-off." crumbs={[{ label: "Redemption", href: "/admin/redemption" }, { label: "Points Table" }]}>
      <QueryState isLoading={data.isLoading} error={data.error}>
        {overview && shown ? (
          <>
            <AdminSectionHeading title="Points per night" description="Each card uses the version in effect on its Card Claim Date. A change is a new dated version; older versions are never edited." />
            {shown.sample ? <InfoNote>{SAMPLE_TABLE_NOTICE}</InfoNote> : null}
            <div className="tw:flex tw:flex-wrap tw:items-end tw:gap-3">
              <SelectField label="Version" value={shown.id} options={versions.map((item) => ({ value: item.id, label: `Version ${item.version}, effective ${item.effectiveDate}${item.sample ? " (sample)" : ""}` }))} onChange={setVersionId} className="tw:min-w-64" />
              {canConfigure ? <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setPublishOpen(true)}><Plus aria-hidden="true" /> New version</Button> : null}
            </div>
            <p className="tw:text-sm tw:text-muted-foreground">Weekend nights: {shown.weekendDays.map((day) => DAY_NAMES[day]).join(", ")}. A holiday night uses weekend points. {shown.note ?? ""}</p>
            <FilterBar search={rowSearch} onSearch={setRowSearch} searchLabel="Search room types" filters={[{ label: "Venue filter", value: rowVenue, onChange: setRowVenue, options: [{ value: "all", label: "All venues" }, ...overview.venues.map((item) => ({ value: item.id, label: item.name }))] }]} />
            <DataTable data={shown.rows.filter((row) => (rowVenue === "all" || row.venueId === rowVenue) && matchesSearch(rowSearch, row.roomType))} columns={rowColumns} getRowId={(row) => `${row.venueId}-${row.roomType}`} emptyText={shown.rows.length === 0 ? "No rows." : "No rows match the filters."} caption="Points per night" />

            <AdminSectionHeading title="Holiday calendar" description="Removing a holiday keeps its history and does not reprice confirmed bookings." />
            {canConfigure ? <div><Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setHolidayOpen(true)}><Plus aria-hidden="true" /> Add holiday</Button></div> : null}
            <FilterBar search={holidaySearch} onSearch={setHolidaySearch} searchLabel="Search holidays" filters={[{ label: "Holiday status filter", value: holidayStatus, onChange: setHolidayStatus, options: [{ value: "all", label: "All statuses" }, { value: "calendar", label: "In calendar" }, { value: "removed", label: "Removed" }] }]} />
            <DataTable data={overview.holidays.filter((row) => (holidayStatus === "all" || (holidayStatus === "removed") === Boolean(row.removed)) && matchesSearch(holidaySearch, row.name))} columns={holidayColumns} getRowId={(row) => row.id} emptyText={overview.holidays.length === 0 ? "No holidays." : "No holidays match the filters."} caption="Holiday calendar" rowActions={(row) => (canConfigure && !row.removed ? <RowActionsMenu itemName={row.name} extraItems={[{ key: "remove", label: "Remove from calendar", danger: true, onClick: () => setRemoving(row) }]} /> : null)} />

            <AdminSectionHeading title="Venues" description="Only open overnight venues of AFhomes Direct Operations can be booked." />
            {canConfigure ? <div><Button type="button" variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setEditingVenue(null); setVenueOpen(true); }}><Plus aria-hidden="true" /> Add venue</Button></div> : null}
            <FilterBar search={venueSearch} onSearch={setVenueSearch} searchLabel="Search venues" filters={[{ label: "Venue status filter", value: venueStatus, onChange: setVenueStatus, options: [{ value: "all", label: "All statuses" }, { value: "open", label: "Open" }, { value: "not_open", label: "Not open yet" }] }]} />
            <DataTable data={overview.venues.filter((row) => (venueStatus === "all" || (venueStatus === "open") === (row.status === "open")) && matchesSearch(venueSearch, row.name))} columns={venueColumns} getRowId={(row) => row.id} emptyText={overview.venues.length === 0 ? "No venues." : "No venues match the filters."} caption="Venues" rowActions={(row) => (canConfigure ? <RowActionsMenu itemName={row.name} onEdit={() => { setEditingVenue(row); setVenueOpen(true); }} /> : null)} />

            {publishOpen ? <PublishVersionDialog open overview={overview} onClose={() => setPublishOpen(false)} /> : null}
            {holidayOpen ? <HolidayDialog open onClose={() => setHolidayOpen(false)} /> : null}
            {venueOpen ? <VenueDialog open venue={editingVenue} onClose={() => setVenueOpen(false)} /> : null}
          </>
        ) : null}
      </QueryState>
      <ReasonDialog open={removing !== null} title="Remove holiday" description="The date stops being a holiday for new bookings. Confirmed bookings keep their points." confirmText="Remove" danger successText="Holiday removed." onClose={() => setRemoving(null)} onSubmit={(reason) => (removing ? act.mutateAsync({ action: "remove-holiday", id: removing.id, reason }) : Promise.resolve())} />
    </AdminPage>
  );
}
