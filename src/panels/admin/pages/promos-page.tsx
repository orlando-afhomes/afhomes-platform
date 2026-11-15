"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import type { PromoInput, PromoView } from "@/data/contracts/promo-repository";
import { useDeletePromo, useEndPromo, usePromos, useSavePromo } from "@/data/promo-queries";
import { useActiveOutlets, useOutlets } from "@/data/settings-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
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

const promoDates = (promo: PromoView) => `${formatDate(promo.startDate)} to ${formatDate(promo.endDate)}`;

/** "Add promo" (promos.manage). Owns its form dialog. */
export function AddPromoButton() {
  const canManage = useOperation("promos.manage");
  const [open, setOpen] = useState(false);
  if (!canManage) return null;
  return (
    <>
      <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" /> Add promo
      </Button>
      {open ? <PromoDialog editing={null} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Promos list with details; Edit, End and Delete need promos.manage. */
export function PromosPanel() {
  const canManage = useOperation("promos.manage");
  const promos = usePromos();
  const outlets = useOutlets();
  const endPromo = useEndPromo();
  const deletePromo = useDeletePromo();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<PromoView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const outletNames = useMemo(() => new Map((outlets.data ?? []).map((outlet) => [outlet.id, outlet.name])), [outlets.data]);
  const names = (ids: string[]) => ids.map((id) => outletNames.get(id) ?? EMPTY).join(", ");
  const rows = useMemo(
    () => (promos.data ?? []).filter((promo) => (status === "all" || promo.status === status) && matchesSearch(search, promo.name)),
    [promos.data, status, search],
  );
  const { mutateAsync: end } = endPromo;
  const { mutateAsync: remove } = deletePromo;

  const columns = useMemo<ColumnDef<PromoView, unknown>[]>(() => [
    {
      id: "name", header: "Name",
      cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span>,
    },
    { id: "start", header: "Starts", cell: ({ row }) => formatDate(row.original.startDate) },
    { id: "end", header: "Ends", cell: ({ row }) => formatDate(row.original.endDate) },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    { id: "earned", header: "Points earned", cell: ({ row }) => row.original.pointsEarned.toLocaleString("en-PH") },
    {
      id: "actions", header: () => <span className="tw:sr-only">Actions</span>,
      cell: ({ row }) => {
        const promo = row.original;
        const canManagePromo = canManage && promo.status !== "ended";
        return (
          <RowActionsMenu
            itemName={promo.name}
            onEdit={canManagePromo ? () => setEditing(promo) : undefined}
            extraItems={canManagePromo ? [{
              key: "end", label: "End promo", danger: true,
              onClick: () => confirmRun({
                title: `End ${promo.name}?`,
                description: "No new points are earned after today. Points already earned stay usable until they expire.",
                confirmText: "End promo", danger: true, action: () => end(promo.id),
                successTitle: `${promo.name} ended.`, errorTitle: "Could not end the promo.",
              }),
            }] : []}
            onDelete={canManagePromo && promo.pointsEarned === 0 ? () => remove(promo.id) : undefined}
            deleteDisabledReason={canManagePromo && promo.pointsEarned > 0 ? "Points were already earned. End the promo instead." : null}
            deleteTitle={`Delete ${promo.name}?`}
            deleteDescription="This removes the promo. Only a promo that never earned points can be deleted."
          />
        );
      },
    },
  ], [canManage, confirmRun, end, remove]);
  const detail = detailId ? (promos.data ?? []).find((promo) => promo.id === detailId) ?? null : null;

  return (
    <>
      <FilterBar search={search} onSearch={setSearch} searchLabel="Search promos" filters={[{ label: "Status filter", value: status, onChange: setStatus, options: STATUS_ITEMS }]} />
      <DataTable<PromoView> caption="Promos" data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No promos found." loading={promos.isLoading}
        onRowOpen={(row) => setDetailId(row.id)} getRowLabel={(row) => `Open ${row.name}`} />
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? "Promo"}
        badge={detail ? <StatusBadge status={detail.status} /> : undefined}
        sections={detail ? [{
          rows: [
            { label: "Dates", value: promoDates(detail) },
            { label: "Earn at", value: names(detail.earnOutletIds) },
            { label: "Pesos per point", value: formatPeso(detail.earnPesosPerPointCentavos) },
            { label: "Use at", value: names(detail.redeemOutletIds) },
            { label: "Points expire", value: detail.pointsExpiryDate ? formatDate(detail.pointsExpiryDate) : null },
            { label: "Points earned", value: detail.pointsEarned.toLocaleString("en-PH") },
          ],
        }] : []}
      />
      {editing ? <PromoDialog key={editing.id} editing={editing} onClose={() => setEditing(null)} /> : null}
      {confirmDialog}
    </>
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
      description={locked ? "Points were already earned, so the earning rule and dates are locked." : undefined}
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
