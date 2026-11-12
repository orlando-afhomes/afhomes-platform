"use client";

import { useMemo, useState } from "react";
import { humanize } from "@/shared/lib/humanize";
import { useAuditEvents } from "@/data/queries";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";
import { AUDIT_ENTITY_TYPES, AUDIT_MODULES, SYSTEM_ACTOR_ID, type AuditEventView, type AuditQuery } from "@/modules/audit/types";
import { DataTable, TABLE_PAGE_SIZE, type ColumnDef } from "@/shared/components/modern/data-table";
import { ScrollText } from "lucide-react";
import { AdminStatCard, AdminStatGrid, AdminPage } from "@/shared/components/admin";
import { StandardDateField } from "@/shared/forms/modern";
import { Input } from "@/shared/ui/input";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";

const ALL = "all";
const MODULE_OPTIONS = [{ value: ALL, label: "All modules" }, ...AUDIT_MODULES.map((value) => ({ value, label: humanize(value) }))];
const ENTITY_OPTIONS = [{ value: ALL, label: "All record types" }, ...AUDIT_ENTITY_TYPES.map((value) => ({ value, label: humanize(value) }))];

/** Resolves typed actor text to an actor id by display name; unmatched text matches nothing. */
function resolveActorId(text: string): string {
  const needle = text.trim().toLowerCase();
  if ("system".includes(needle)) return SYSTEM_ACTOR_ID;
  return DEV_IDENTITIES.find((identity) => identity.displayName.toLowerCase().includes(needle))?.id ?? "no-matching-actor";
}

/** Read-only, append-only audit history. It can never change a record. */
export function AuditLogsPage() {
  const [moduleFilter, setModuleFilter] = useState(ALL);
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [action, setAction] = useState("");
  const [actor, setActor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo<AuditQuery>(() => {
    const next: AuditQuery = { page, pageSize: TABLE_PAGE_SIZE };
    if (moduleFilter !== ALL) next.module = moduleFilter as AuditQuery["module"];
    if (entityFilter !== ALL) next.entityType = entityFilter as AuditQuery["entityType"];
    if (action.trim()) next.action = action.trim().toUpperCase();
    if (actor.trim()) next.actorId = resolveActorId(actor);
    // Business dates are Asia/Manila (UTC+8, no daylight saving).
    if (from) next.from = `${from}T00:00:00.000+08:00`;
    if (to) next.to = `${to}T23:59:59.999+08:00`;
    return next;
  }, [moduleFilter, entityFilter, action, actor, from, to, page]);
  const result = useAuditEvents(query);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? (result.data?.items ?? []).find((item) => item.id === detailId) ?? null : null;

  const columns = useMemo<ColumnDef<AuditEventView, unknown>[]>(
    () => [
      { id: "time", header: "When", cell: ({ row }) => new Date(row.original.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) },
      { id: "action", header: "Action", cell: ({ row }) => <span className="tw:font-medium">{humanize(row.original.action)}</span> },
      { id: "entity", header: "Record", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.entityLabel },
      { id: "actor", header: "Actor", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.actorName },
      { id: "change", header: "Change", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (row.original.previousValue || row.original.newValue ? `${row.original.previousValue ? humanize(row.original.previousValue) : "—"} → ${row.original.newValue ? humanize(row.original.newValue) : "—"}` : "—") },
      { id: "reason", header: "Reason", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.reason ?? (row.original.reasonRecorded ? "Recorded (restricted)" : "—") },
    ],
    [],
  );

  const total = result.data?.total ?? 0;
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <AdminPage anyOf={["audit-logs"]} title="Audit Logs" description="Append-only history of sensitive actions. Entries cannot be edited or deleted." crumbs={[{ label: "Audit Logs" }]}>
      <AdminStatGrid>
        <AdminStatCard label="Matching events" value={total} icon={ScrollText} tone="info" loading={result.isLoading} error={result.error} />
      </AdminStatGrid>
      <FilterBar search={action} onSearch={reset(setAction)} searchLabel="Filter by action code" filters={[{ label: "Module filter", value: moduleFilter, onChange: reset(setModuleFilter), options: MODULE_OPTIONS }, { label: "Record type filter", value: entityFilter, onChange: reset(setEntityFilter), options: ENTITY_OPTIONS }]}>
        <Input aria-label="Filter by actor" placeholder="Actor" value={actor} onChange={(event) => reset(setActor)(event.target.value)} className="tw:h-11 tw:md:min-w-0 tw:md:flex-1" />
        <StandardDateField label="From" value={from} onChange={reset(setFrom)} className="tw:md:min-w-0 tw:md:flex-1" />
        <StandardDateField label="To" value={to} onChange={reset(setTo)} className="tw:md:min-w-0 tw:md:flex-1" />
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
          getRowLabel={(row) => `Open audit event ${humanize(row.action)} for ${row.entityLabel}`}
          rowActions={(row) => <RowActionsMenu itemName={`audit event ${humanize(row.action)} for ${row.entityLabel}`} onView={() => setDetailId(row.id)} />}
        />
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? humanize(detail.action) : "Audit event"}
        subtitle={detail ? new Date(detail.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : undefined}
        sections={
          detail
            ? [
                {
                  title: "Event",
                  rows: [
                    { label: "Module", value: humanize(detail.module) },
                    { label: "Record", value: detail.entityLabel },
                    { label: "Actor", value: detail.actorName },
                    { label: "Actor roles", value: detail.actorRoles.map(humanize).join(", ") },
                    { label: "Outcome", value: humanize(detail.outcome) },
                  ],
                },
                {
                  title: "Change",
                  rows: [
                    { label: "Previous value", value: detail.previousValue ? humanize(detail.previousValue) : detail.previousValue },
                    { label: "New value", value: detail.newValue ? humanize(detail.newValue) : detail.newValue },
                    { label: "Reason", value: detail.reason ?? (detail.reasonRecorded ? "Recorded (restricted)" : null) },
                  ],
                },
              ]
            : []
        }
      />
    </AdminPage>
  );
}
