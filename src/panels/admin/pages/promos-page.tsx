"use client";

import { EMPTY } from "@/shared/lib/empty-value";
import { useMemo, useState } from "react";
import { Eye, Plus } from "lucide-react";
import { toast } from "sonner";
import { useOperation } from "@/data/business-queries";
import type { PromoInput, PromoRewardInput, PromoView } from "@/data/contracts/promo-repository";
import type { TableOrder } from "@/shared/lib/table-order";
import { useDeletePromo, useEndPromo, usePromoPreview, usePromos, useSavePromo } from "@/data/promo-queries";
import { useActiveOutlets, useOutlets } from "@/data/settings-queries";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { FormDialog } from "@/shared/components/modern/form-dialog";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { StatusBadge } from "@/shared/components/modern/status-badge";
import { useConfirmRun } from "@/shared/components/modern/use-confirm-run";
import { CheckboxField, MoneyField, PointsField, SelectField, StandardDateField, TextAreaField, TextField } from "@/shared/forms/modern";
import { formatDate } from "@/shared/lib/format-date";
import { formatPeso, parsePesoToCentavos, centavosToInputText } from "@/shared/lib/money";
import { matchesSearch } from "@/shared/lib/search";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

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
        <Plus aria-hidden="true" /> Add Promo
      </Button>
      {open ? <PromoDialog editing={null} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

/** Promos list with details; Edit, End and Delete need promos.manage. */
/** Newest promo first. */
const PROMO_ORDER: TableOrder<PromoView> = {
  date: (row) => row.createdAt,
};

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
  const [offerEditing, setOfferEditing] = useState<PromoView | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

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
    { id: "earned", header: "Points Earned", cell: ({ row }) => row.original.pointsEarned.toLocaleString("en-PH") },
    {
      id: "actions", header: "Actions",
      cell: ({ row }) => {
        const promo = row.original;
        const canManagePromo = canManage && promo.status !== "ended";
        return (
          <RowActionsMenu
            itemName={promo.name}
            onEdit={canManagePromo ? () => setEditing(promo) : undefined}
            extraItems={canManagePromo ? [
              { key: "offer", label: "Public Offer & Rewards", onClick: () => setOfferEditing(promo) },
              {
                key: "end", label: "End Promo", danger: true,
                onClick: () => confirmRun({
                  title: `End ${promo.name}?`,
                  description: "No new points are earned after today. Points already earned stay usable until they expire.",
                  confirmText: "End Promo", danger: true, action: () => end(promo.id),
                  successTitle: `${promo.name} ended.`, errorTitle: "Could not end the promo.",
                }),
              },
            ] : []}
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
      <DataTable<PromoView> caption="Promos" orderBy={PROMO_ORDER} data={rows} columns={columns} getRowId={(row) => row.id} emptyText="No promos found." loading={promos.isLoading}
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
            { label: "Public offer", value: detail.published ? "Published" : "Not published" },
            { label: "Named rewards", value: detail.rewards.length ? detail.rewards.map((reward) => `${reward.name} (${reward.pointsCost.toLocaleString("en-PH")} pts)`).join(", ") : "None configured" },
          ],
        }] : []}
        footer={detail ? (
          <Button type="button" variant="outline" onClick={() => setPreviewId(detail.id)}>
            <Eye aria-hidden="true" /> Preview public offer
          </Button>
        ) : undefined}
      />
      {editing ? <PromoDialog key={editing.id} editing={editing} onClose={() => setEditing(null)} /> : null}
      {offerEditing ? <PublicOfferDialog key={offerEditing.id} editing={offerEditing} onClose={() => setOfferEditing(null)} /> : null}
      {previewId ? (
        <PreviewOfferDialog
          id={previewId}
          name={(promos.data ?? []).find((promo) => promo.id === previewId)?.name ?? "Promo"}
          onClose={() => setPreviewId(null)}
        />
      ) : null}
      {confirmDialog}
    </>
  );
}

type RewardDraft = PromoRewardInput & { key: string };

/** Read-only preview of the saved public projection. It never changes publication state. */
function PreviewOfferDialog({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const preview = usePromoPreview(id);
  const offer = preview.data;
  const missing = offer ? [
    !offer.title.trim() ? "public title" : null,
    !offer.summary.trim() ? "public summary" : null,
    !offer.terms.trim() ? "public terms" : null,
    offer.rewards.length === 0 ? "at least one priced reward" : null,
  ].filter((item): item is string => Boolean(item)) : [];

  return (
    <Dialog open onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="tw:max-h-[90vh] tw:overflow-y-auto tw:sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Preview public offer</DialogTitle>
          <DialogDescription>{name}. This preview never publishes the offer.</DialogDescription>
        </DialogHeader>
        {preview.isLoading ? <p role="status" className="tw:text-sm tw:text-muted-foreground">Loading preview…</p> : null}
        {preview.error ? <p role="alert" className="tw:text-sm tw:text-destructive">The preview could not be loaded.</p> : null}
        {offer ? (
          <div className="tw:flex tw:flex-col tw:gap-4">
            {missing.length > 0 ? (
              <div role="note" className="tw:rounded-lg tw:border tw:border-warning/40 tw:bg-warning/10 tw:p-3 tw:text-sm">
                <p className="tw:font-semibold">Not ready to publish</p>
                <p className="tw:text-muted-foreground">Add the {missing.join(", ")} before publishing.</p>
              </div>
            ) : null}
            <article className="tw:flex tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-border tw:bg-card tw:p-4">
              <p className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">
                {formatDate(offer.startDate)} to {formatDate(offer.endDate)}
              </p>
              <h3 className="tw:text-lg tw:font-semibold">{offer.title || "No public title yet"}</h3>
              <p className="tw:text-sm tw:text-muted-foreground">{offer.summary || "No public summary yet."}</p>
              <div>
                <p className="tw:text-xs tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">Rewards</p>
                {offer.rewards.length > 0 ? (
                  <ul className="tw:mt-1 tw:flex tw:flex-col tw:gap-1">
                    {offer.rewards.map((reward) => (
                      <li key={reward.id} className="tw:text-sm">
                        <span className="tw:font-semibold">{reward.name}</span>
                        <span className="tw:text-muted-foreground"> · {reward.pointsCost.toLocaleString("en-PH")} points at {reward.outletName}</span>
                        {reward.description ? <span className="tw:block tw:text-muted-foreground">{reward.description}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : <p className="tw:mt-1 tw:text-sm tw:text-muted-foreground">No eligible rewards yet.</p>}
              </div>
              <p className="tw:text-sm">{offer.terms || "No public terms yet."}</p>
              <p className="tw:text-xs tw:text-muted-foreground">Earn points at {offer.earnOutlets.join(", ") || "no outlet yet"}. Promo Points have no cash value.</p>
            </article>
            <p className="tw:text-sm tw:text-muted-foreground">Only a published, in-date offer with complete public terms appears on the website.</p>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublicOfferDialog({ editing, onClose }: { editing: PromoView; onClose: () => void }) {
  const save = useSavePromo();
  const outlets = useOutlets();
  const [publicTitle, setPublicTitle] = useState(editing.publicTitle);
  const [publicSummary, setPublicSummary] = useState(editing.publicSummary);
  const [publicTerms, setPublicTerms] = useState(editing.publicTerms);
  const [published, setPublished] = useState(editing.published);
  const [rewards, setRewards] = useState<RewardDraft[]>(editing.rewards.map((reward) => ({ ...reward, key: reward.id })));
  const [error, setError] = useState<string | undefined>();
  const outletName = (id: string) => outlets.data?.find((outlet) => outlet.id === id)?.name ?? id;

  const addReward = () => setRewards((current) => [...current, {
    key: crypto.randomUUID(), name: "", description: "", outletId: editing.redeemOutletIds[0] ?? "", pointsCost: 0, status: "active",
  }]);
  const patchReward = (key: string, patch: Partial<RewardDraft>) => setRewards((current) => current.map((reward) => reward.key === key ? { ...reward, ...patch } : reward));

  const submit = async () => {
    const promo: PromoInput = {
      name: editing.name,
      status: editing.status === "ended" ? "active" : editing.status,
      startDate: editing.startDate,
      endDate: editing.endDate,
      earnOutletIds: editing.earnOutletIds,
      earnPesosPerPointCentavos: editing.earnPesosPerPointCentavos,
      redeemOutletIds: editing.redeemOutletIds,
      pointsExpiryDate: editing.pointsExpiryDate,
      rewards: rewards.map((reward) => ({
        id: reward.id, name: reward.name, description: reward.description,
        outletId: reward.outletId, pointsCost: reward.pointsCost, status: reward.status,
      })),
      publicTitle,
      publicSummary,
      publicTerms,
      published,
    };
    try {
      await save.mutateAsync({ id: editing.id, promo });
      toast.success(published ? "Public offer published." : "Public offer saved.", { description: editing.name });
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the public offer.");
    }
  };

  return (
    <FormDialog
      open
      title="Public Offer & Rewards"
      size="lg"
      scrollBody
      description="Only a published offer with complete public copy and at least one priced reward appears on the website."
      submitText="Save Offer"
      pending={save.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <TextField label="Public title" value={publicTitle} maxLength={120} onChange={(value) => { setPublicTitle(value); setError(undefined); }} />
      <TextAreaField label="Public summary" value={publicSummary} maxLength={600} onChange={(value) => { setPublicSummary(value); setError(undefined); }} />
      <TextAreaField label="Public terms" value={publicTerms} maxLength={600} onChange={(value) => { setPublicTerms(value); setError(undefined); }} />
      <CheckboxField label="Publish this offer on the public website" checked={published} onChange={(checked) => { setPublished(checked); setError(undefined); }} />
      <p className="tw:text-sm tw:text-muted-foreground">Drafts and unpublished offers stay private.</p>
      <fieldset className="tw:rounded-lg tw:border tw:border-border tw:p-4">
        <legend className="tw:px-1 tw:text-sm tw:font-semibold">Named rewards</legend>
        {rewards.length === 0 ? <p className="tw:mb-3 tw:text-sm tw:text-muted-foreground">No rewards configured. Add a named reward and its approved point cost.</p> : null}
        <div className="tw:flex tw:flex-col tw:gap-4">
          {rewards.map((reward) => (
            <div key={reward.key} className="tw:grid tw:gap-3 tw:rounded-lg tw:border tw:border-border tw:bg-muted/30 tw:p-3 tw:sm:grid-cols-2">
              <TextField label="Reward name" required value={reward.name} maxLength={80} onChange={(value) => patchReward(reward.key, { name: value })} />
              <SelectField label="Outlet" required value={reward.outletId} options={editing.redeemOutletIds.map((id) => ({ value: id, label: outletName(id) }))} onChange={(value) => patchReward(reward.key, { outletId: value })} />
              <div className="tw:sm:col-span-2">
                <TextField label="Reward description" value={reward.description} maxLength={300} onChange={(value) => patchReward(reward.key, { description: value })} />
              </div>
              <PointsField label="Approved point cost" required value={reward.pointsCost > 0 ? String(reward.pointsCost) : ""} onChange={(value) => patchReward(reward.key, { pointsCost: Number(value.replace(/,/g, "")) || 0 })} />
              <div className="tw:flex tw:flex-col tw:justify-end tw:gap-2">
                <CheckboxField label="Available" checked={reward.status !== "archived"} onChange={(checked) => patchReward(reward.key, { status: checked ? "active" : "archived" })} />
                <Button type="button" variant="outline" onClick={() => setRewards((current) => current.filter((item) => item.key !== reward.key))}>Remove reward</Button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" className="tw:mt-3" onClick={addReward}><Plus aria-hidden="true" /> Add Reward</Button>
      </fieldset>
    </FormDialog>
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
      title={editing ? "Edit Promo" : "Add Promo"}
      size="lg"
      scrollBody
      description={locked ? "Points were already earned, so the earning rule and dates are locked." : undefined}
      submitText={editing ? "Save" : "Add Promo"}
      pending={save.isPending}
      error={error}
      onClose={onClose}
      onSubmit={() => void submit()}
    >
      <div className="tw:grid tw:gap-x-4 tw:gap-y-3 tw:sm:grid-cols-2">
        <div className="tw:min-w-0 tw:sm:col-span-2">
          <TextField label="Promo name" required value={name} maxLength={80} onChange={(value) => { setName(value); setError(undefined); }} />
        </div>
        <StandardDateField label="Start date" required disabled={locked} value={startDate} onChange={setStartDate} />
        <StandardDateField label="End date" required disabled={locked} value={endDate} onChange={setEndDate} />
        <MoneyField label="Pesos spent per point" required disabled={locked} value={rate} onChange={setRate} hint="Spending that counts divided by this amount, rounded down to whole points." />
        <SelectField label="Status" required value={status} options={[{ value: "draft", label: "Draft" }, { value: "active", label: "Active" }]} onChange={(value) => setStatus(value === "active" ? "active" : "draft")} />
      </div>
      <div className="tw:grid tw:gap-4 tw:rounded-lg tw:border tw:border-border tw:bg-muted/40 tw:p-4 tw:sm:grid-cols-2">
        <fieldset className="tw:min-w-0">
          <legend className="tw:mb-3 tw:text-sm tw:font-semibold">Earn points at</legend>
          {options.map((outlet) => (
            <CheckboxField key={outlet.id} label={outlet.name} disabled={locked} checked={earnIds.includes(outlet.id)} onChange={(on) => setEarnIds(toggle(earnIds, outlet.id, on))} />
          ))}
        </fieldset>
        <fieldset className="tw:min-w-0">
          <legend className="tw:mb-3 tw:text-sm tw:font-semibold">Use points at</legend>
          {options.map((outlet) => (
            <CheckboxField key={outlet.id} label={outlet.name} checked={redeemIds.includes(outlet.id)} onChange={(on) => setRedeemIds(toggle(redeemIds, outlet.id, on))} />
          ))}
        </fieldset>
      </div>
      <div className="tw:grid tw:gap-4 tw:sm:grid-cols-2">
        <StandardDateField label="Points expire on" value={expiry} onChange={setExpiry} hint="Leave empty if the points never expire. It cannot be before the end date." />
      </div>
    </FormDialog>
  );
}
