"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import type { PromoInput, PromoView } from "@/data/contracts/promo-repository";
import { useDeletePromo, useEndPromo, usePromos, useSavePromo } from "@/data/promo-queries";
import { useActiveOutlets, useOutlets } from "@/data/settings-queries";
import { AdminPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge, ToneBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, MoneyField, SelectField, StandardDateField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { formatPeso, parsePesoToCentavos, centavosToInputText } from "@/shared/lib/money";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";

const STATUS_ITEMS = [
  { value: "all", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
];

export function PromosPage() {
  const canManage = useOperation("promos.manage");
  const promos = usePromos();
  const outlets = useOutlets();
  const endPromo = useEndPromo();
  const deletePromo = useDeletePromo();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoView | null>(null);

  const outletNames = useMemo(() => new Map((outlets.data ?? []).map((outlet) => [outlet.id, outlet.name])), [outlets.data]);
  const names = (ids: string[]) => ids.map((id) => outletNames.get(id) ?? id).join(", ");
  const rows = useMemo(
    () => (promos.data ?? []).filter((promo) => (status === "all" || promo.status === status) && matchesSearch(search, promo.name)),
    [promos.data, status, search],
  );
  const { mutateAsync: end } = endPromo;
  const { mutateAsync: remove } = deletePromo;

  const columns = useMemo<ColumnDef<PromoView, unknown>[]>(() => [
    {
      id: "name", header: "Promo",
      cell: ({ row }) => <span className="tw:font-medium">{row.original.name}{row.original.sample ? <ToneBadge className="tw:ml-2">Sample</ToneBadge> : null}</span>,
    },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "dates", header: "Promo dates", cell: ({ row }) => `${formatDate(row.original.startDate)} to ${formatDate(row.original.endDate)}` },
    { id: "earn", header: "Earn at", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => names(row.original.earnOutletIds) },
    { id: "rate", header: "Pesos per point", cell: ({ row }) => formatPeso(row.original.earnPesosPerPointCentavos) },
    { id: "redeem", header: "Use at", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => names(row.original.redeemOutletIds) },
    { id: "expiry", header: "Points expire", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => (row.original.pointsExpiryDate ? formatDate(row.original.pointsExpiryDate) : "Never") },
    { id: "earned", header: "Points earned", cell: ({ row }) => row.original.pointsEarned.toLocaleString("en-PH") },
    {
      id: "actions", header: () => <span className="tw:sr-only">Actions</span>,
      cell: ({ row }) => {
        const promo = row.original;
        if (!canManage || promo.status === "ended") return null;
        return (
          <RowActionsMenu
            itemName={promo.name}
            onEdit={() => { setEditing(promo); setFormOpen(true); }}
            extraItems={[{
              key: "end", label: "End promo", danger: true,
              onClick: () => confirmRun({
                title: `End ${promo.name}?`,
                description: "No new points are earned after today. Points already earned stay usable until they expire.",
                confirmText: "End promo", danger: true, action: () => end(promo.id),
                successTitle: `${promo.name} ended.`, errorTitle: "Could not end the promo.",
              }),
            }]}
            onDelete={promo.pointsEarned > 0 ? undefined : () => remove(promo.id)}
            deleteDisabledReason={promo.pointsEarned > 0 ? "Points were already earned. End the promo instead." : null}
            deleteTitle={`Delete ${promo.name}?`}
            deleteDescription="This removes the promo. Only a promo that never earned points can be deleted."
          />
        );
      },
    },
    // names reads outletNames, which changes with the outlet query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [canManage, confirmRun, end, remove, outletNames]);

  return (
    <AdminPage
      anyOf={["stay-points"]}
      title="Promos"
      description="Promo Points are a separate wallet from Grant Stay Points. Each promo sets where points are earned, how many, and where they can be used."
      crumbs={[{ label: "Membership" }, { label: "Promos" }]}
      actions={canManage ? (
        <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus aria-hidden="true" /> Add promo
        </Button>
      ) : undefined}
    >
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search promos" filters={[{ label: "Status filter", value: status, onChange: setStatus, options: STATUS_ITEMS }]} />
      <DataTable<PromoView> caption="Promos" data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No promos found." loading={promos.isLoading} />
      {formOpen ? <PromoDialog key={editing?.id ?? "new"} editing={editing} onClose={() => { setFormOpen(false); setEditing(null); }} /> : null}
      {confirmDialog}
    </AdminPage>
  );
}

function PromoDialog({ editing, onClose }: { editing: PromoView | null; onClose: () => void }) {
  const save = useSavePromo();
  const outlets = useActiveOutlets();
  const locked = Boolean(editing && editing.pointsEarned > 0);
  const [name, setName] = useState(editing?.name ?? "");
  const [status, setStatus] = useState<"draft" | "active">(editing && editing.status !== "ended" ? editing.status : "draft");
  const [startDate, setStartDate] = useState(editing?.startDate ?? "");
  const [endDate, setEndDate] = useState(editing?.endDate ?? "");
  const [rate, setRate] = useState(editing ? centavosToInputText(editing.earnPesosPerPointCentavos) : "");
  const [earnIds, setEarnIds] = useState<string[]>(editing?.earnOutletIds ?? []);
  const [redeemIds, setRedeemIds] = useState<string[]>(editing?.redeemOutletIds ?? []);
  const [expiry, setExpiry] = useState(editing?.pointsExpiryDate ?? "");
  const [error, setError] = useState<string | undefined>();

  // Keep outlets the promo already holds visible even if they were deactivated later.
  const options = useMemo(() => {
    const held = new Set([...(editing?.earnOutletIds ?? []), ...(editing?.redeemOutletIds ?? [])]);
    const base = outlets.data.map((outlet) => ({ id: outlet.id, name: outlet.name }));
    return base.concat(Array.from(held).filter((id) => !base.some((item) => item.id === id)).map((id) => ({ id, name: `${id} (inactive)` })));
  }, [outlets.data, editing]);
  const toggle = (ids: string[], id: string, on: boolean) => (on ? [...ids, id] : ids.filter((item) => item !== id));

  const submit = async () => {
    const centavos = parsePesoToCentavos(rate);
    if (!name.trim()) return setError("A promo name is required.");
    if (!startDate || !endDate) return setError("Enter the start and end dates.");
    if (!centavos || centavos <= 0) return setError("Enter pesos per point above zero.");
    const promo: PromoInput = {
      name, status, startDate, endDate, earnOutletIds: earnIds, earnPesosPerPointCentavos: centavos,
      redeemOutletIds: redeemIds, pointsExpiryDate: expiry || null,
    };
    try {
      await save.mutateAsync({ id: editing?.id, promo });
      toast.success(editing ? "Promo saved." : "Promo added.", { description: name.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the promo.");
    }
  };

  return (
    <FormDialog
      open
      title={editing ? "Edit promo" : "Add promo"}
      description={locked ? "Points were already earned, so the earning rule and dates are locked." : "A draft promo earns nothing until it is made active."}
      submitText={editing ? "Save" : "Add promo"}
      pending={save.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <TextField label="Promo name" required value={name} maxLength={80} onChange={(value) => { setName(value); setError(undefined); }} />
      <SelectField label="Status" required value={status} options={[{ value: "draft", label: "Draft" }, { value: "active", label: "Active" }]} onChange={(value) => setStatus(value === "active" ? "active" : "draft")} />
      <div className="tw:grid tw:gap-3 tw:sm:grid-cols-2">
        <StandardDateField label="Start date" required disabled={locked} value={startDate} onChange={setStartDate} />
        <StandardDateField label="End date" required disabled={locked} value={endDate} onChange={setEndDate} />
      </div>
      <MoneyField label="Pesos spent per point" required disabled={locked} value={rate} onChange={setRate} hint="Qualifying spend divided by this amount, rounded down to whole points." />
      <fieldset className="tw:flex tw:flex-col tw:gap-1">
        <legend className="tw:text-sm tw:font-medium">Earn points at</legend>
        {options.map((outlet) => (
          <CheckboxField key={outlet.id} label={outlet.name} disabled={locked} checked={earnIds.includes(outlet.id)} onChange={(on) => setEarnIds(toggle(earnIds, outlet.id, on))} />
        ))}
      </fieldset>
      <fieldset className="tw:flex tw:flex-col tw:gap-1">
        <legend className="tw:text-sm tw:font-medium">Use points at</legend>
        {options.map((outlet) => (
          <CheckboxField key={outlet.id} label={outlet.name} checked={redeemIds.includes(outlet.id)} onChange={(on) => setRedeemIds(toggle(redeemIds, outlet.id, on))} />
        ))}
      </fieldset>
      <StandardDateField label="Points expire on" value={expiry} onChange={setExpiry} hint="Leave empty if the points never expire. It cannot be before the end date." />
    </FormDialog>
  );
}
