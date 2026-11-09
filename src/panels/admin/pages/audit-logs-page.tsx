"use client";

import { useMemo, useState } from "react";
import { useAuditEvents } from "@/data/queries";
import { AUDIT_ENTITY_TYPES, AUDIT_MODULES, type AuditEventView, type AuditQuery } from "@/modules/audit/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { StandardDateField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { StatTiles } from "@/shared/components/modern/stat-tiles";
import { ModulePage } from "../components/module-page";

const ALL = "all";
const MODULE_OPTIONS = [{ value: ALL, label: "All modules" }, ...AUDIT_MODULES.map((value) => ({ value, label: value.replace(/-/g, " ") }))];
const ENTITY_OPTIONS = [{ value: ALL, label: "All record types" }, ...AUDIT_ENTITY_TYPES.map((value) => ({ value, label: value.replace(/-/g, " ") }))];
const PAGE_SIZE = 25;

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
    const next: AuditQuery = { page, pageSize: PAGE_SIZE };
    if (moduleFilter !== ALL) next.module = moduleFilter as AuditQuery["module"];
    if (entityFilter !== ALL) next.entityType = entityFilter as AuditQuery["entityType"];
    if (action.trim()) next.action = action.trim().toUpperCase();
    if (actor.trim()) next.actorId = actor.trim();
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
      { id: "action", header: "Action", cell: ({ row }) => <span className="tw:font-medium">{row.original.action.replace(/_/g, " ").toLowerCase()}</span> },
      { id: "entity", header: "Record", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `${row.original.entityType.replace(/-/g, " ")} · ${row.original.displayReference ?? row.original.entityId}` },
      { id: "actor", header: "Actor", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => row.original.actorId },
      { id: "change", header: "Change", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (row.original.previousValue || row.original.newValue ? `${row.original.previousValue ?? "—"} → ${row.original.newValue ?? "—"}` : "—") },
      { id: "reason", header: "Reason", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => row.original.reason ?? (row.original.reasonRecorded ? "Recorded (restricted)" : "—") },
    ],
    [],
  );

  const total = result.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const reset = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <ModulePage anyOf={["audit-logs"]} title="Audit Logs" description="Append-only history of sensitive actions. Entries cannot be edited or deleted." crumbs={[{ label: "Audit Logs" }]}>
      <InfoNote title="Restricted view">Access is limited to Administrators for now. User-entered reasons and sensitive values are withheld. Retention and export rules are not yet defined, so there is no export.</InfoNote>
      <FilterBar search={action} onSearch={reset(setAction)} searchLabel="Filter by action code" filters={[{ label: "Module filter", value: moduleFilter, onChange: reset(setModuleFilter), options: MODULE_OPTIONS }, { label: "Record type filter", value: entityFilter, onChange: reset(setEntityFilter), options: ENTITY_OPTIONS }]}>
        <Input aria-label="Filter by actor" placeholder="Actor id" value={actor} onChange={(event) => reset(setActor)(event.target.value)} className="tw:h-11 tw:sm:h-8 tw:sm:max-w-40" />
        <div className="tw:grid tw:grid-cols-2 tw:gap-2">
          <StandardDateField label="From" value={from} onChange={reset(setFrom)} />
          <StandardDateField label="To" value={to} onChange={reset(setTo)} />
        </div>
      </FilterBar>
      <QueryState isLoading={result.isLoading} error={result.error}>
        <StatTiles items={[{ label: "Matching events", value: total }, { label: "Page", value: `${page} of ${pages}` }]} />
        <Section title="Events">
          <DataTable
            data={result.data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            emptyText="No audit events match."
            caption="Audit events"
            pageSize={PAGE_SIZE}
            onRowOpen={(row) => setDetailId(row.id)}
            getRowLabel={(row) => `Open audit event ${row.action.replace(/_/g, " ").toLowerCase()}`}
            rowActions={(row) => <RowActionsMenu itemName={`audit event ${row.action.replace(/_/g, " ").toLowerCase()}`} onView={() => setDetailId(row.id)} />}
          />
          <div className="tw:flex tw:gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="tw:min-h-11 tw:sm:min-h-8">Previous page</Button>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="tw:min-h-11 tw:sm:min-h-8">Next page</Button>
          </div>
        </Section>
      </QueryState>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail ? detail.action.replace(/_/g, " ").toLowerCase() : "Audit event"}
        subtitle={detail ? new Date(detail.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" }) : undefined}
        sections={
          detail
            ? [
                {
                  title: "Event",
                  rows: [
                    { label: "Module", value: detail.module },
                    { label: "Record", value: `${detail.entityType.replace(/-/g, " ")} · ${detail.displayReference ?? detail.entityId}` },
                    { label: "Actor", value: detail.actorId },
                    { label: "Actor roles", value: detail.actorRoles.join(", ") },
                    { label: "Outcome", value: detail.outcome },
                  ],
                },
                {
                  title: "Change",
                  rows: [
                    { label: "Previous value", value: detail.previousValue },
                    { label: "New value", value: detail.newValue },
                    { label: "Reason", value: detail.reason ?? (detail.reasonRecorded ? "Recorded (restricted)" : null) },
                    { label: "Related records", value: detail.relatedRecordIds.join(", ") },
                  ],
                },
              ]
            : []
        }
      />
    </ModulePage>
  );
}
