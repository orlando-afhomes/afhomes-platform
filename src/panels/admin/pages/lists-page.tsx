"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import {
  useCreateOutlet,
  useCreateReferenceEntry,
  useDeleteOutlet,
  useDeleteReferenceEntry,
  useOutlets,
  useReferenceEntries,
  useUpdateOutlet,
  useUpdateReferenceEntry,
} from "@/data/settings-queries";
import { OUTLET_TYPES, REFERENCE_LISTS, type ListEntryStatus, type OutletType } from "@/modules/settings/lists";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { SelectField, TextField } from "@/shared/forms/modern";
import { Button } from "@/shared/ui/button";
import { TabBar } from "@/shared/components/modern/tab-bar";

type TabId = "program-category" | "gov-id-type" | "bank" | "outlet";

const TABS: Array<{ value: TabId; label: string; singular: string }> = [
  ...REFERENCE_LISTS.map((list) => ({ value: list.id as TabId, label: list.label, singular: list.singular })),
  { value: "outlet", label: "Outlets", singular: "outlet" },
];

const STATUS_FILTER_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** One row for every tab: a list entry or an outlet. */
type ListRow = { id: string; name: string; detail: string; status: ListEntryStatus; inUse: boolean; sample: boolean; type?: OutletType };

const typeLabel = (type: OutletType) => OUTLET_TYPES.find((item) => item.value === type)?.label ?? type;

export function ListsPage() {
  const canManage = useOperation("settings.lists.manage");
  const entriesQuery = useReferenceEntries();
  const outletsQuery = useOutlets();
  const createEntry = useCreateReferenceEntry();
  const updateEntry = useUpdateReferenceEntry();
  const deleteEntry = useDeleteReferenceEntry();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const deleteOutlet = useDeleteOutlet();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();

  const [tab, setTab] = useState<TabId>("program-category");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ListRow | null>(null);

  const isOutlet = tab === "outlet";
  const current = TABS.find((item) => item.value === tab) ?? TABS[0];

  const rowsByTab = useMemo(() => {
    const entries = entriesQuery.data ?? [];
    const outlets = outletsQuery.data ?? [];
    const result: Record<TabId, ListRow[]> = { "program-category": [], "gov-id-type": [], bank: [], outlet: [] };
    for (const entry of [...entries].sort((a, b) => a.sortOrder - b.sortOrder)) {
      result[entry.list].push({ id: entry.id, name: entry.label, detail: entry.list === "bank" ? "" : entry.value, status: entry.status, inUse: entry.inUse, sample: false });
    }
    for (const outlet of outlets) {
      result.outlet.push({ id: outlet.id, name: outlet.name, detail: typeLabel(outlet.type), status: outlet.status, inUse: outlet.inUse, sample: outlet.sample, type: outlet.type });
    }
    return result;
  }, [entriesQuery.data, outletsQuery.data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rowsByTab[tab].filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      return term === "" || row.name.toLowerCase().includes(term) || row.detail.toLowerCase().includes(term);
    });
  }, [rowsByTab, tab, search, statusFilter]);

  const { mutateAsync: removeEntry } = deleteEntry;
  const { mutateAsync: removeOutlet } = deleteOutlet;
  const { mutateAsync: changeEntry } = updateEntry;
  const { mutateAsync: changeOutlet } = updateOutlet;

  const setStatus = (row: ListRow, status: ListEntryStatus) => {
    const verb = status === "inactive" ? "Deactivate" : "Activate";
    confirmRun({
      title: `${verb} ${row.name}?`,
      description: status === "inactive"
        ? "It will no longer be offered in new forms. Records that already use it keep showing it."
        : "It will be offered in forms again.",
      confirmText: verb,
      action: () => (isOutlet ? changeOutlet({ id: row.id, status }) : changeEntry({ id: row.id, status })),
      successTitle: `${row.name} ${status === "inactive" ? "deactivated" : "activated"}.`,
      errorTitle: `${verb} failed.`,
    });
  };

  const columns = useMemo<ColumnDef<ListRow, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="tw:font-medium">
            {row.original.name}
            {row.original.sample ? <ToneBadge className="tw:ml-2">Sample</ToneBadge> : null}
          </span>
        ),
      },
      ...(tab === "bank" ? [] : [{ id: "detail", header: isOutlet ? "Type" : "Stored value", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }: { row: { original: ListRow } }) => row.original.detail } as ColumnDef<ListRow, unknown>]),
      { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
      { id: "used", header: "In use", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => (row.original.inUse ? "Yes" : "No") },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) => {
          const item = row.original;
          if (!canManage) return null;
          return (
            <RowActionsMenu
              itemName={item.name}
              onEdit={() => {
                setEditing(item);
                setFormOpen(true);
              }}
              extraItems={[
                item.status === "active"
                  ? { key: "deactivate", label: "Deactivate", onClick: () => setStatus(item, "inactive") }
                  : { key: "activate", label: "Activate", onClick: () => setStatus(item, "active") },
              ]}
              onDelete={item.inUse ? undefined : () => (isOutlet ? removeOutlet(item.id) : removeEntry(item.id))}
              deleteDisabledReason={item.inUse ? "Existing records use this entry. Deactivate it instead." : null}
              deleteTitle={`Delete ${item.name}?`}
              deleteDescription="This removes the entry. Only entries that no record uses can be deleted."
            />
          );
        },
      },
    ],
    // setStatus only closes over stable mutation functions and the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, isOutlet, canManage, removeEntry, removeOutlet, changeEntry, changeOutlet, confirmRun],
  );

  return (
    <AdminPage
      anyOf={["departments"]}
      allowed={canManage}
      title="Lists"
      description="Manage the lists used in forms across the platform. An entry that records already use can only be deactivated."
      crumbs={[{ label: "Organization" }, { label: "Lists" }]}
      actions={
        <Button
          className="tw:min-h-11 tw:sm:min-h-8"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden="true" /> Add {current.singular}
        </Button>
      }
    >
      <TabBar
        label="Lists"
        value={tab}
        tabs={TABS.map((item) => ({ value: item.value, label: item.label, count: rowsByTab[item.value].length }))}
        onChange={(next) => {
          setTab(next as TabId);
          setSearch("");
          setStatusFilter("all");
        }}
      />
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchLabel={`Search ${current.label.toLowerCase()}`}
        filters={[{ label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: STATUS_FILTER_ITEMS }]}
      />
      <DataTable<ListRow>
        caption={current.label}
        data={filtered}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText={`No ${current.label.toLowerCase()} found.`}
        loading={entriesQuery.isLoading || outletsQuery.isLoading}
      />
      {formOpen ? (
        <ListEntryDialog
          key={`${tab}-${editing?.id ?? "new"}`}
          tab={tab}
          singular={current.singular}
          editing={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          saveEntry={async (name, type) => {
            if (isOutlet) {
              if (editing) await changeOutlet({ id: editing.id, name, type });
              else await createOutlet.mutateAsync({ name, type: type ?? "other" });
            } else if (editing) await changeEntry({ id: editing.id, label: name });
            else await createEntry.mutateAsync({ list: tab as Exclude<TabId, "outlet">, label: name });
          }}
        />
      ) : null}
      {confirmDialog}
    </AdminPage>
  );
}

function ListEntryDialog({
  tab,
  singular,
  editing,
  onClose,
  saveEntry,
}: {
  tab: TabId;
  singular: string;
  editing: ListRow | null;
  onClose: () => void;
  saveEntry: (name: string, type?: OutletType) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [type, setType] = useState<OutletType>(editing?.type ?? "restaurant");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setPending(true);
    try {
      await saveEntry(name, tab === "outlet" ? type : undefined);
      toast.success(editing ? "Saved." : "Added.", { description: name.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    } finally {
      setPending(false);
    }
  };

  return (
    <FormDialog
      open
      title={editing ? `Edit ${singular}` : `Add ${singular}`}
      description={editing ? "The stored value stays the same, so existing records keep showing correctly." : undefined}
      submitText={editing ? "Save" : "Add"}
      pending={pending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <TextField label="Name" required value={name} maxLength={80} onChange={(value) => { setName(value); setError(undefined); }} />
      {tab === "outlet" ? <SelectField label="Type" required value={type} options={OUTLET_TYPES.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => setType(value || "other")} /> : null}
    </FormDialog>
  );
}
