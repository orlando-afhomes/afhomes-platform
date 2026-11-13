"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useOperation, usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { tierOptions } from "@/modules/vip/tier-options";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import { schemeHowItWorks as termsSummary } from "@/modules/vip/rules";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatPeso } from "@/shared/lib/money";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { SchemeDialog } from "../components/vip-product-dialogs";
import { humanize } from "@/shared/lib/humanize";

export function PaymentSchemesPage() {
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
      { id: "label", header: "Scheme", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.label}</div>{row.original.historicalLabel ? <div className="tw:text-xs tw:text-muted-foreground">Source label: {row.original.historicalLabel}</div> : null}</div> },
      { id: "code", header: "Card code", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => cardCodeValue(row.original) },
      { id: "terms", header: "Terms", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => (row.original.commercialStatus === "configured" ? termsSummary(row.original) : "Not configured") },
      { id: "state", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.commercialStatus} label={row.original.commercialStatus === "configured" ? "Configured" : "Pending owner decision"} /><BizBadge status={row.original.availability} /></div> },
    ],
    [],
  );
  const openSchemeEditor = (scheme: PaymentScheme) => {
    setEditingScheme(scheme);
    setSchemeOpen(true);
  };
  const schemeDetail = (schemes.data ?? []).find((item) => item.id === schemeId) ?? null;

  return (
    <AdminPage
      anyOf={["vip-products"]}
      title="Payment Schemes"
      description="Register of official payment schemes."
      crumbs={[{ label: "VIP Products", href: "/admin/vip-products" }, { label: "Payment Schemes" }]}
      actions={
        canManage ? (
          <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setEditingScheme(null); setSchemeOpen(true); }}>
            <Plus aria-hidden="true" /> New scheme
          </Button>
        ) : null
      }
    >
        <QueryState isLoading={schemes.isLoading} error={schemes.error}>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search schemes" filters={[
            { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "available", label: "Available" }, { value: "unavailable", label: "Unavailable" }] },
            { label: "Tier filter", value: tierFilter, onChange: setTierFilter, options: [{ value: "all", label: "All tiers" }, ...tierOptions(products.data, schemes.data?.flatMap((item) => item.applicableTiers))] },
          ]} />
          <DataTable data={visibleSchemes} columns={schemeColumns} getRowId={(row) => row.id} emptyText={(schemes.data ?? []).length === 0 ? "No schemes." : "No schemes match the filters."} caption="Payment schemes" onRowOpen={(row) => setSchemeId(row.id)} getRowLabel={(row) => `Open ${row.label}`} rowActions={(row) => <RowActionsMenu itemName={row.label} onView={() => setSchemeId(row.id)} onEdit={canManage ? () => openSchemeEditor(row) : undefined} />} />
        </QueryState>
      <RecordDetailsSheet
        open={schemeDetail !== null}
        onClose={() => setSchemeId(null)}
        title={schemeDetail?.label ?? "Payment scheme"}
        subtitle={schemeDetail?.historicalLabel ? `Source label: ${schemeDetail.historicalLabel}` : undefined}
        badge={schemeDetail ? <div className="tw:flex tw:flex-wrap tw:gap-1"><BizBadge status={schemeDetail.commercialStatus} label={schemeDetail.commercialStatus === "configured" ? "Configured" : "Pending owner decision"} /><BizBadge status={schemeDetail.availability} /></div> : undefined}
        sections={
          schemeDetail
            ? [
                {
                  title: "Terms",
                  rows: [
                    { label: "Category", value: humanize(schemeDetail.category) },
                    { label: "Card code", value: schemeDetail ? cardCodeValue(schemeDetail) : "—" },
                    { label: "Applies to", value: schemeDetail.applicableTiers.join(", ") },
                    { label: "Summary", value: schemeDetail.commercialStatus === "configured" ? termsSummary(schemeDetail) : "Not configured" },
                    { label: "Package price", value: schemePrices(schemeDetail) ?? "Catalog price" },
                    { label: "Reservation fee", value: schemeDetail.reservationCentavos ? <Money value={schemeDetail.reservationCentavos} /> : null },
                    { label: "Source", value: schemeDetail.source },
                    { label: "Version", value: `v${schemeDetail.configVersion}${schemeDetail.effectiveDate ? ` · effective ${schemeDetail.effectiveDate}` : ""}` },
                  ],
                },
              ]
            : []
        }
        history={schemeDetail ? schemeDetail.changes.map((item) => ({ key: `v${item.version}`, when: `Version ${item.version} · ${item.date}`, text: `${item.summary} (${item.reason})` })) : []}
        footer={schemeDetail && canManage ? <Button type="button" variant="outline" onClick={() => { openSchemeEditor(schemeDetail); setSchemeId(null); }}><Pencil aria-hidden="true" /> Edit scheme</Button> : undefined}
      />
      <SchemeDialog open={schemeOpen} scheme={editingScheme} onClose={() => setSchemeOpen(false)} />
    </AdminPage>
  );
}

/** Card code display: the single code when present, else per-tier codes in B1/S1/G1 order, else an em dash. */
function cardCodeValue(scheme: Pick<PaymentScheme, "paymentCode"> & { paymentCodeByTier?: Partial<Record<VipTierCode, string>> }): string {
  if (scheme.paymentCode) return scheme.paymentCode;
  const entries = Object.keys(scheme.paymentCodeByTier ?? {})
    .sort()
    .map((tier) => (scheme.paymentCodeByTier?.[tier] ? `${tier} ${scheme.paymentCodeByTier[tier]}` : null))
    .filter((entry): entry is string => entry !== null);
  return entries.length > 0 ? entries.join(" · ") : "—";
}

function schemePrices(scheme: PaymentScheme): string | null {
  const entries = Object.entries(scheme.priceCentavosByTier);
  return entries.length > 0 ? entries.map(([tier, amount]) => `${tier} ${formatPeso(amount ?? 0)}`).join(" · ") : null;
}
