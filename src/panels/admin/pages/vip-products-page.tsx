"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useDeleteProduct, useOperation, useProductDeleteBlockers, useVipProducts } from "@/data/business-queries";
import type { VipProduct } from "@/modules/vip/types";
import { AreaPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { ProductDialog } from "../components/vip-product-dialogs";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { PaymentSchemesTab } from "./payment-schemes-page";
import { PrintSchemeGuideButton, SchemeGuidePanel } from "./scheme-guide-page";
import { TierCodesPanel } from "./tier-codes-page";

export function VipProductsAreaPage() {
  const access = useAdminAreaTabAccess("vip-products");
  const canManage = useOperation("vip-products.manage");
  const [creating, setCreating] = useState<"products" | "schemes" | null>(null);
  const close = () => setCreating(null);

  return (
    <AreaPage
      anyOf={["vip-products", "sales"]}
      title="VIP Products"
      actions={(tab) => {
        if (tab === "scheme-guide") return <PrintSchemeGuideButton />;
        if (!canManage || (tab !== "products" && tab !== "schemes")) return null;
        return (
          <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setCreating(tab)}>
            <Plus aria-hidden="true" /> {tab === "products" ? "New product" : "New scheme"}
          </Button>
        );
      }}
      tabs={ADMIN_AREA_TABS["vip-products"].map(({ value, label }) => ({
        value,
        label,
        allowed: access[value],
        render: () => {
          switch (value) {
            case "products": return <VipProductsTab creating={canManage && creating === value} onCloseCreate={close} />;
            case "schemes": return <PaymentSchemesTab creating={canManage && creating === value} onCloseCreate={close} />;
            case "scheme-guide": return <SchemeGuidePanel />;
            case "tier-codes": return <TierCodesPanel />;
          }
        },
      }))}
    />
  );
}

/**
 * Products tab of the VIP Products area. The area page owns the New product
 * button (shown with `vip-products.manage`) and passes `creating` down.
 */
export function VipProductsTab({ creating, onCloseCreate }: { creating: boolean; onCloseCreate: () => void }) {
  const products = useVipProducts();
  const canManage = useOperation("vip-products.manage");
  const blockers = useProductDeleteBlockers();
  const deleteProduct = useDeleteProduct();
  const [editing, setEditing] = useState<VipProduct | null>(null);
  const [productCode, setProductCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const tierNameOptions = useMemo(() => [...new Set((products.data ?? []).map((item) => item.tier))].map((tier) => ({ value: tier, label: tier })), [products.data]);
  const visibleProducts = useMemo(
    () => (products.data ?? []).filter((item) => (statusFilter === "all" || item.status === statusFilter) && (tierFilter === "all" || item.tier === tierFilter) && matchesSearch(search, item.name, item.code)),
    [products.data, search, statusFilter, tierFilter],
  );

  const productColumns = useMemo<ColumnDef<VipProduct, unknown>[]>(
    () => [
      { id: "name", header: "Product", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
      { id: "code", header: "Code", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.code },
      { id: "price", header: "Price", cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      { id: "version", header: "Version", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `v${row.original.configVersion}` },
    ],
    [],
  );
  const productDetail = (products.data ?? []).find((item) => item.code === productCode) ?? null;

  return (
    <>
        <QueryState isLoading={products.isLoading} error={products.error}>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search products" filters={[
            { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "retired", label: "Retired" }] },
            { label: "Tier filter", value: tierFilter, onChange: setTierFilter, options: [{ value: "all", label: "All tiers" }, ...tierNameOptions] },
          ]} />
          <DataTable data={visibleProducts} columns={productColumns} getRowId={(row) => row.code} emptyText={(products.data ?? []).length === 0 ? "No products." : "No products match the filters."} caption="VIP product catalog" onRowOpen={(row) => setProductCode(row.code)} getRowLabel={(row) => `Open ${row.name}`} rowActions={(row) => <RowActionsMenu itemName={row.name} onView={() => setProductCode(row.code)} onEdit={canManage ? () => setEditing(row) : undefined} onDelete={canManage && blockers.data && blockers.data[row.code] === null ? () => deleteProduct.mutateAsync({ code: row.code, reason: "Unused product removed from the catalog." }) : undefined} deleteDisabledReason={canManage ? blockers.data?.[row.code] : undefined} deleteDescription="This removes the product from the catalog. It has not been used, and the removal is recorded in the audit log." />} />
        </QueryState>
      <RecordDetailsSheet
        open={productDetail !== null}
        onClose={() => setProductCode(null)}
        title={productDetail?.name ?? "Product"}
        subtitle={productDetail ? `${productDetail.tier} tier · version ${productDetail.configVersion}` : undefined}
        badge={productDetail ? <BizBadge status={productDetail.status} /> : undefined}
        sections={
          productDetail
            ? [
                {
                  title: "Terms",
                  rows: [
                    { label: "Code", value: productDetail.code },
                    { label: "Tier", value: productDetail.tier },
                    { label: "Price", value: <Money value={productDetail.priceCentavos} /> },
                    { label: "Price source", value: <BizBadge status={productDetail.priceStatus} label={productDetail.priceStatus === "conflict" ? "Source conflict" : "Contract-stated"} /> },
                    { label: "Price note", value: productDetail.priceNote },
                    { label: "Validity", value: `${productDetail.validityYears} years (${productDetail.earningCycles} earning cycles)` },
                    { label: "VIP discount", value: `${productDetail.vipDiscountPercent}%` },
                    { label: "Supplementary holders", value: String(productDetail.supplementaryHolders) },
                  ],
                },
                {
                  title: "Stay Points",
                  rows: [
                    { label: "Lifetime points", value: productDetail.lifetimePoints.toLocaleString("en-PH") },
                    { label: "Per cycle", value: `${productDetail.pointsPerCycle.toLocaleString("en-PH")} (${productDetail.weekdayPointsPerCycle.toLocaleString("en-PH")} weekday, ${productDetail.weekendPointsPerCycle.toLocaleString("en-PH")} weekend)` },
                    { label: "Minimum spend per cycle", value: <Money value={productDetail.minSpendPerCycleCentavos} /> },
                  ],
                },
              ]
            : []
        }
        history={productDetail ? productDetail.changes.map((item) => ({ key: `v${item.version}`, when: `Version ${item.version} · ${item.date}`, text: `${item.summary} (${item.reason})` })) : []}
        footer={productDetail && canManage ? <Button type="button" variant="outline" onClick={() => { setEditing(productDetail); setProductCode(null); }}><Pencil aria-hidden="true" /> Edit product</Button> : undefined}
      />
      <ProductDialog product={editing} creating={creating} onClose={() => { setEditing(null); onCloseCreate(); }} />
    </>
  );
}
