"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Info, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useOperation, useVipProducts } from "@/data/business-queries";
import { useCreateTierLevel, useDeleteTierLevel, useTierLevels, useUpdateTierLevel } from "@/data/tier-level-queries";
import type { TierLevelView } from "@/data/contracts/tier-level-repository";
import { TIER_COLOR_OPTIONS } from "@/modules/vip/tier-levels";
import { NON_ACTIVE_TIER_CODES, type TierColorKey } from "@/modules/vip/types";
import { AdminSection } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { QueryState } from "@/shared/components/modern/query-state";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { SelectField, TextField } from "@/shared/forms/modern";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { tierColor, tierLevelColor } from "../dashboard/dashboard-presentation";

type NonActiveTier = (typeof NON_ACTIVE_TIER_CODES)[number];

/** Plain-words reason a code is not available for new products. */
const WHY: Record<NonActiveTier["state"], string> = {
  historical: "Used before, kept for old records",
  reserved: "Held for future use",
};

/** Small pill with a dot in the tier's own color next to its text. Pass a product `code` or a `color` directly. */
export function TierChip({ code, color, children, className }: { code?: string; color?: string; children: ReactNode; className?: string }) {
  const resolved = color ?? tierColor(code ?? "");
  return (
    <span
      className={cn("tw:inline-flex tw:items-center tw:gap-1.5 tw:rounded-full tw:border tw:bg-card tw:px-2.5 tw:py-0.5 tw:text-xs tw:font-semibold tw:whitespace-nowrap tw:text-foreground tw:[print-color-adjust:exact]", className)}
      style={{ borderColor: resolved }}
    >
      <span aria-hidden="true" className="tw:size-2 tw:rounded-full" style={{ backgroundColor: resolved }} />
      {children}
    </span>
  );
}

const colorOf = (colorKey: TierColorKey) => tierLevelColor(colorKey);
const colorLabel = (colorKey: TierColorKey) => TIER_COLOR_OPTIONS.find((item) => item.value === colorKey)?.label ?? colorKey;

const NON_ACTIVE_COLUMNS: ColumnDef<NonActiveTier, unknown>[] = [
  { id: "code", header: "Code", cell: ({ row }) => <span className="tw:font-semibold">{row.original.code}</span> },
  { id: "name", header: "Name", cell: ({ row }) => (row.original.state === "reserved" ? null : row.original.label) },
  { id: "why", header: "Why", cell: ({ row }) => WHY[row.original.state] },
];

/**
 * Tier levels tab of the VIP Products area. The area page owns the "Add tier level" button
 * (shown with `vip-products.manage`) and passes `adding` down.
 */
export function TierLevelsPanel({ adding, onCloseAdd }: { adding: boolean; onCloseAdd: () => void }) {
  const levels = useTierLevels();
  const products = useVipProducts();
  const canManage = useOperation("vip-products.manage");
  const updateLevel = useUpdateTierLevel();
  const deleteLevel = useDeleteTierLevel();
  const { confirmRun, dialog: confirmDialog } = useConfirmRun();
  const [editing, setEditing] = useState<TierLevelView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = (levels.data ?? []).find((item) => item.id === detailId) ?? null;
  const productsOfDetail = (products.data ?? []).filter((item) => item.tierLevelId === detailId);

  const setStatus = (level: TierLevelView, status: "active" | "inactive") => {
    const verb = status === "inactive" ? "Deactivate" : "Activate";
    confirmRun({
      title: `${verb} ${level.name}?`,
      description: status === "inactive"
        ? "New products can no longer choose this card level. Products that already use it keep showing it."
        : "New products can choose this card level again.",
      confirmText: verb,
      danger: status === "inactive",
      tone: status === "inactive" ? "destructive" : "success",
      action: () => updateLevel.mutateAsync({ id: level.id, status }),
      successTitle: `${level.name} ${status === "inactive" ? "deactivated" : "activated"}.`,
      errorTitle: `${verb} failed.`,
    });
  };

  const columns = useMemo<ColumnDef<TierLevelView, unknown>[]>(
    () => [
      { id: "name", header: "Name", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
      { id: "color", header: "Color", cell: ({ row }) => <TierChip color={colorOf(row.original.colorKey)}>{colorLabel(row.original.colorKey)}</TierChip> },
      { id: "products", header: "Products", cell: ({ row }) => String(row.original.productCount) },
      { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    ],
    [],
  );

  return (
    <div className="tw:flex tw:flex-col tw:gap-4">
      <QueryState isLoading={levels.isLoading} error={levels.error}>
        <DataTable
          data={levels.data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          emptyText="No card levels."
          caption="VIP Card Levels"
          showAllRows
          onRowOpen={(row) => setDetailId(row.id)}
          getRowLabel={(row) => `Open ${row.name}`}
          rowActions={canManage ? (row) => (
            <RowActionsMenu
              itemName={row.name}
              onEdit={() => setEditing(row)}
              extraItems={[
                row.status === "active"
                  ? { key: "deactivate", label: "Deactivate", tone: "warning", onClick: () => setStatus(row, "inactive") }
                  : { key: "activate", label: "Activate", tone: "success", onClick: () => setStatus(row, "active") },
              ]}
              onDelete={row.inUse ? undefined : () => deleteLevel.mutateAsync(row.id)}
              deleteDisabledReason={row.inUse ? "Products use this card level. Deactivate it instead." : null}
              deleteTitle={`Delete ${row.name}?`}
              deleteDescription="This removes the card level. Only a level that no product uses can be deleted."
            />
          ) : undefined}
        />
      </QueryState>
      <AdminSection title="Not Available">
        <p role="note" className="tw:flex tw:items-start tw:gap-2 tw:rounded-lg tw:bg-info/10 tw:px-3 tw:py-2 tw:text-sm tw:text-foreground">
          <Info aria-hidden="true" className="tw:mt-0.5 tw:size-4 tw:shrink-0 tw:text-info" />
          These codes cannot be used for new products.
        </p>
        <DataTable data={[...NON_ACTIVE_TIER_CODES]} columns={NON_ACTIVE_COLUMNS} getRowId={(row) => row.code} emptyText="No codes." caption="Card Level Codes That Are Not Available" showAllRows />
      </AdminSection>
      <RecordDetailsSheet
        open={detail !== null}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? "Card level"}
        icon={<Layers />}
        badge={detail ? <StatusBadge status={detail.status} /> : undefined}
        sections={detail ? [{
          title: "Card Level",
          rows: [
            { label: "Name", value: detail.name },
            { label: "Color", value: <TierChip color={colorOf(detail.colorKey)}>{colorLabel(detail.colorKey)}</TierChip> },
            { label: "Sort order", value: String(detail.sortOrder) },
            { label: "Products", value: productsOfDetail.length > 0 ? productsOfDetail.map((item) => `${item.name} (${item.code})`).join(", ") : null, wide: true },
          ],
        }] : []}
        footer={detail && canManage ? (
          <>
            {detail.status === "inactive" ? <Button type="button" variant="success" onClick={() => setStatus(detail, "active")}>Activate</Button> : null}
            <Button type="button" variant="warning" onClick={() => { setEditing(detail); setDetailId(null); }}><Pencil aria-hidden="true" /> Edit Card Level</Button>
            {detail.status === "active" ? <Button type="button" variant="destructive" onClick={() => setStatus(detail, "inactive")}>Deactivate</Button> : null}
          </>
        ) : undefined}
      />
      {adding || editing ? (
        <TierLevelDialog
          key={editing?.id ?? "new-tier-level"}
          level={editing}
          onClose={() => { setEditing(null); onCloseAdd(); }}
        />
      ) : null}
      {confirmDialog}
    </div>
  );
}

/** Add or edit a tier level: name, color with a live preview, and where it sits in the list. */
function TierLevelDialog({ level, onClose }: { level: TierLevelView | null; onClose: () => void }) {
  const create = useCreateTierLevel();
  const update = useUpdateTierLevel();
  const [name, setName] = useState(level?.name ?? "");
  const [colorKey, setColorKey] = useState<TierColorKey>(level?.colorKey ?? "neutral");
  const [sortOrder, setSortOrder] = useState(level ? String(level.sortOrder) : "");
  const [error, setError] = useState<string | undefined>();

  const submit = async () => {
    const order = sortOrder.trim() === "" ? undefined : Number(sortOrder.trim());
    if (order !== undefined && (!Number.isInteger(order) || order < 1)) {
      setError("The sort order must be a whole number from 1.");
      return;
    }
    try {
      if (level) await update.mutateAsync({ id: level.id, name, colorKey, sortOrder: order });
      else await create.mutateAsync({ name, colorKey, sortOrder: order });
      toast.success(level ? "Saved." : "Added.", { description: name.trim() });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save.");
    }
  };

  return (
    <FormDialog
      open
      title={level ? "Edit Card Level" : "Add Card Level"}
      description="Products choose one card level, such as Bronze or Platinum."
      submitText={level ? "Save" : "Add"}
      pending={create.isPending || update.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <TextField label="Name" required value={name} maxLength={40} onChange={(value) => { setName(value); setError(undefined); }} />
      <SelectField label="Color" required value={colorKey} options={TIER_COLOR_OPTIONS.map((item) => ({ value: item.value, label: item.label }))} onChange={(value) => setColorKey((value || "neutral") as TierColorKey)} />
      <p className="tw:flex tw:items-center tw:gap-2 tw:text-sm tw:text-muted-foreground">
        Preview <TierChip color={colorOf(colorKey)}>{name.trim() || "Card level"}</TierChip>
      </p>
      <TextField label="Sort order" inputMode="numeric" value={sortOrder} onChange={(value) => { setSortOrder(value); setError(undefined); }} hint={level ? "Lower numbers come first." : "Leave blank to put it last."} />
    </FormDialog>
  );
}
