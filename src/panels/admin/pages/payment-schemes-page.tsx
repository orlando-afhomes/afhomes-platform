"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useOperation, usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { tierOptions } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import { schemeHowItWorks as termsSummary } from "@/modules/vip/rules";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatDate } from "@/shared/lib/format-date";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { SchemeDialog } from "../components/vip-product-dialogs";
import { humanize } from "@/shared/lib/humanize";

/**
 * Payment schemes tab of the VIP Products area. The area page owns the New
 * scheme button (shown with `vip-products.manage`) and passes `creating` down.
 */
export function PaymentSchemesTab({ creating, onCloseCreate }: { creating: boolean; onCloseCreate: () => void }) {
  const schemes = usePaymentSchemes();
  const products = useVipProducts();
  const canManage = useOperation("vip-products.manage");
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<PaymentScheme | null>(null);
  const [schemeId, setSchemeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const visibleSchemes = useMemo(
    () => (schemes.data ?? []).filter((item) => (statusFilter === "all" || item.availability === statusFilter) && (tierFilter === "all" || item.applicableTiers.includes(tierFilter as VipTierCode)) && matchesSearch(search, item.label, item.historicalLabel, cardCodeValue(item))),
    [schemes.data, search, statusFilter, tierFilter],
  );

  const schemeColumns = useMemo<ColumnDef<PaymentScheme, unknown>[]>(
    () => [
      { id: "label", header: "Payment plan", cell: ({ row }) => <span className="tw:font-semibold">{row.original.label}</span> },
      { id: "code", header: "Payment Code", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.paymentCode ?? (Object.values(row.original.paymentCodeByTier ?? {}).some(Boolean) ? "Per card level" : null) },
      { id: "terms", header: "Terms", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => (row.original.commercialStatus === "configured" ? termsSummary(row.original) : null) },
      { id: "state", header: "Status", cell: ({ row }) => <SchemeStatusBadge scheme={row.original} /> },
    ],
    [],
  );
  const openSchemeEditor = (scheme: PaymentScheme) => {
    setEditingScheme(scheme);
    setSchemeOpen(true);
  };
  const schemeDetail = (schemes.data ?? []).find((item) => item.id === schemeId) ?? null;
  const tierName = (tier: string) => (products.data ?? []).find((item) => item.code === tier)?.name ?? tier;

  return (
    <>
        <QueryState isLoading={schemes.isLoading} error={schemes.error}>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search payment plans" filters={[
            { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "available", label: "Available" }, { value: "unavailable", label: "Unavailable" }] },
            { label: "Card level filter", value: tierFilter, onChange: setTierFilter, options: [{ value: "all", label: "All card levels" }, ...tierOptions(products.data, schemes.data?.flatMap((item) => item.applicableTiers))] },
          ]} />
          <DataTable data={visibleSchemes} columns={schemeColumns} getRowId={(row) => row.id} emptyText={(schemes.data ?? []).length === 0 ? "No payment plans." : "No payment plans match the filters."} caption="Payment Plans" onRowOpen={(row) => setSchemeId(row.id)} getRowLabel={(row) => `Open ${row.label}`} rowActions={(row) => <RowActionsMenu itemName={row.label} onEdit={canManage ? () => openSchemeEditor(row) : undefined} />} />
        </QueryState>
      <RecordDetailsSheet
        open={schemeDetail !== null}
        onClose={() => setSchemeId(null)}
        title={schemeDetail?.label ?? "Payment plan"}
        subtitle={schemeDetail?.historicalLabel ? `Also known as ${schemeDetail.historicalLabel}` : undefined}
        badge={schemeDetail ? <SchemeStatusBadge scheme={schemeDetail} /> : undefined}
        sections={
          schemeDetail
            ? [
                {
                  title: "Terms",
                  rows: [
                    { label: "Category", value: humanize(schemeDetail.category) },
                    { label: "Payment code", value: schemeDetail.paymentCode },
                    ...tierEntries(schemeDetail.paymentCodeByTier).map(([tier, value]) => ({ label: `${tierName(tier)} payment code`, value })),
                    { label: "Availability", value: humanize(schemeDetail.availability) },
                    { label: "Terms status", value: schemeDetail.commercialStatus === "configured" ? "Ready" : "Waiting for owner approval" },
                    { label: "Applies to", value: schemeDetail.applicableTiers.map(tierName).join(", ") },
                    { label: "Summary", value: schemeDetail.commercialStatus === "configured" ? termsSummary(schemeDetail) : null, wide: true },
                    ...(tierEntries(schemeDetail.priceCentavosByTier).length > 0
                      ? tierEntries(schemeDetail.priceCentavosByTier).map(([tier, value]) => ({ label: `${tierName(tier)} package price`, value: <Money value={value} /> }))
                      : [{ label: "Package price", value: "Catalog price" }]),
                    { label: "Reservation fee", value: schemeDetail.reservationCentavos ? <Money value={schemeDetail.reservationCentavos} /> : null },
                    { label: "Source", value: schemeDetail.source, wide: true },
                    { label: "Effective from", value: schemeDetail.effectiveDate ? formatDate(schemeDetail.effectiveDate) : null },
                  ],
                },
              ]
            : []
        }
        history={schemeDetail ? schemeDetail.changes.map((item) => ({ key: `${item.date}-${item.version}`, when: `Changed on ${formatDate(item.date)}`, text: item.reason })) : []}
        footer={schemeDetail && canManage ? <Button type="button" variant="warning" onClick={() => { openSchemeEditor(schemeDetail); setSchemeId(null); }}><Pencil aria-hidden="true" /> Edit Payment Plan</Button> : undefined}
      />
      <SchemeDialog open={creating || schemeOpen} scheme={creating ? null : editingScheme} onClose={() => { setSchemeOpen(false); onCloseCreate(); }} />
    </>
  );
}

/** One badge per scheme: "Terms pending" until terms are configured, then its availability. */
function SchemeStatusBadge({ scheme }: { scheme: PaymentScheme }) {
  return scheme.commercialStatus === "configured" ? <BizBadge status={scheme.availability} /> : <BizBadge status={scheme.commercialStatus} label="Terms pending" />;
}

/** Every card code of a scheme as one searchable text (the single code, or each tier code). */
function cardCodeValue(scheme: Pick<PaymentScheme, "paymentCode"> & { paymentCodeByTier?: Partial<Record<VipTierCode, string>> }): string {
  return [scheme.paymentCode, ...tierEntries(scheme.paymentCodeByTier).map(([, code]) => code)].filter(Boolean).join(" ");
}

/** Entries of a per-tier record that carry a value, in tier-code order. */
function tierEntries<T>(byTier: Partial<Record<string, T>> | undefined): Array<[string, NonNullable<T>]> {
  return Object.entries(byTier ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .filter((entry): entry is [string, NonNullable<T>] => Boolean(entry[1]));
}
