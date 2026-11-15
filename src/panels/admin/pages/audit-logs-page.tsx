"use client";

import { useMemo, useState } from "react";
import { humanize } from "@/shared/lib/humanize";
import { useAuditActors, useAuditEvents } from "@/data/queries";
import { AUDIT_ENTITY_LABELS, AUDIT_ENTITY_TYPES, AUDIT_MODULES, type AuditEventView, type AuditQuery } from "@/modules/audit/types";
import { DataTable, TABLE_PAGE_SIZE, type ColumnDef } from "@/shared/components/modern/data-table";
import { ScrollText } from "lucide-react";
import { AdminStatCard, AdminStatGrid, AdminPage } from "@/shared/components/admin";
import { DateRangeFields } from "@/shared/components/modern/date-range-fields";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { QueryState } from "@/shared/components/modern/query-state";

const ALL = "all";
const MODULE_OPTIONS = [{ value: ALL, label: "All modules" }, ...AUDIT_MODULES.map((value) => ({ value, label: humanize(value) }))];
const ENTITY_OPTIONS = [{ value: ALL, label: "All record types" }, ...AUDIT_ENTITY_TYPES.map((value) => ({ value, label: AUDIT_ENTITY_LABELS[value] ?? humanize(value) }))];

/** Plain-English action: "PAYMENT_VERIFIED" becomes "Payment verified". The stored code is never changed. */
function actionLabel(action: string): string {
  const text = action.toLowerCase().replace(/[_-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const whenText = (timestamp: string) => new Date(timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" });

/** Read-only, append-only audit history. It can never change a record. */
export function AuditLogsPage() {
  const [moduleFilter, setModuleFilter] = useState(ALL);
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo<AuditQuery>(() => {
    const next: AuditQuery = { page, pageSize: TABLE_PAGE_SIZE };
    if (moduleFilter !== ALL) next.module = moduleFilter as AuditQuery["module"];
    if (entityFilter !== ALL) next.entityType = entityFilter as AuditQuery["entityType"];
    // Stored action codes look like PAYMENT_VERIFIED; typed words match them too.
    if (action.trim()) next.action = action.trim().toUpperCase().replace(/\s+/g, "_");
    if (actor !== ALL) next.actorId = actor;
    // Business dates are Asia/Manila (UTC+8, no daylight saving).
    if (from) next.from = `${from}T00:00:00.000+08:00`;
    if (to) next.to = `${to}T23:59:59.999+08:00`;
    return next;
  }, [moduleFilter, entityFilter, action, actor, from, to, page]);
  const result = useAuditEvents(query);
  const actors = useAuditActors();
  const actorOptions = useMemo(() => [{ value: ALL, label: "All actors" }, ...(actors.data ?? [])], [actors.data]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? (result.data?.items ?? []).find((item) => item.id === detailId) ?? null : null;

  const columns = useMemo<ColumnDef<AuditEventView, unknown>[]>(
    () => [
      { id: "time", header: "When", cell: ({ row }) => <span className="tw:font-semibold">{whenText(row.original.timestamp)}</span> },
      { id: "action", header: "Action", cell: ({ row }) => actionLabel(row.original.action) },
      { id: "entity-type", header: "Record type", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => humanize(row.original.entityType) },
      { id: "entity", header: "Record", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.entityName },
      { id: "actor", header: "Actor", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.actorName },
    ],
    [],
  );

  const total = result.data?.total ?? 0;
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminPage anyOf={["audit-logs"]} title="Audit Logs" crumbs={[{ label: "Audit Logs" }]}>
      <AdminStatGrid>
        <AdminStatCard label="Matching events" value={total} icon={ScrollText} tone="info" loading={result.isLoading} error={result.error} />
      </AdminStatGrid>
      <FilterBar search={action} onSearch={reset(setAction)} searchLabel="Search by action" filters={[{ label: "Module filter", value: moduleFilter, onChange: reset(setModuleFilter), options: MODULE_OPTIONS }, { label: "Record type filter", value: entityFilter, onChange: reset(setEntityFilter), options: ENTITY_OPTIONS }, { label: "Actor filter", value: actor, onChange: reset(setActor), options: actorOptions }]}>
        <DateRangeFields from={from} to={to} onChange={(range) => { setFrom(range.from); setTo(range.to); setPage(1); }} />
      </FilterBar>
      <QueryState isLoading={result.isLoading} error={result.error}>
        <DataTable
          data={result.data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No audit events match."
          caption="Audit events"
          serverPagination={{
            page,
            pageSize: TABLE_PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open audit event ${actionLabel(row.action)} for ${row.entityName ?? humanize(row.entityType)}`}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? actionLabel(detail.action) : "Audit event"}
        subtitle={detail?.entityLabel}
        sections={
          detail
            ? [
                {
                  title: "Event",
                  rows: [
                    { label: "When", value: whenText(detail.timestamp) },
                    { label: "Action", value: actionLabel(detail.action) },
                    { label: "Module", value: humanize(detail.module) },
                    { label: "Outcome", value: humanize(detail.outcome) },
                  ],
                },
                {
                  title: "Record",
                  rows: [
                    { label: "Record type", value: humanize(detail.entityType) },
                    { label: "Record", value: detail.entityName },
                    { label: "Details", value: detail.entityDetail },
                    { label: "Reference", value: detail.displayReference },
                  ],
                },
                {
                  title: "Actor",
                  rows: [
                    { label: "Actor", value: detail.actorName },
                    { label: "Actor roles", value: detail.actorRoles.map(humanize).join(", ") },
                  ],
                },
                {
                  title: "Change",
                  rows: [
                    { label: "Previous value", value: detail.previousValue ? humanize(detail.previousValue) : detail.previousValue },
                    { label: "New value", value: detail.newValue ? humanize(detail.newValue) : detail.newValue },
                    { label: "Reason", value: detail.reason ?? (detail.reasonRecorded ? "Recorded (restricted)" : null), wide: true },
                  ],
                },
              ]
            : []
        }
      />
    </AdminPage>
  );
}
