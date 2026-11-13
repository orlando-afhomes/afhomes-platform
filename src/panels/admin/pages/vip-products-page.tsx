"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useDeleteProduct, useOperation, useProductDeleteBlockers, useVipProducts } from "@/data/business-queries";
import type { VipProduct } from "@/modules/vip/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { matchesSearch } from "@/shared/lib/search";
import { AdminPage } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { ProductDialog } from "../components/vip-product-dialogs";

export function VipProductsPage() {
  const products = useVipProducts();
  const canManage = useOperation("vip-products.manage");
  const blockers = useProductDeleteBlockers();
  const deleteProduct = useDeleteProduct();
  const [creating, setCreating] = useState(false);
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
      { id: "name", header: "Product", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name} <span className="tw:text-muted-foreground">({row.original.code})</span></span> },
      { id: "price", header: "Price", cell: ({ row }) => <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><Money value={row.original.priceCentavos} /><BizBadge status={row.original.priceStatus} label={row.original.priceStatus === "conflict" ? "Source conflict" : "Contract-stated"} /></div> },
      { id: "validity", header: "Validity", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.validityYears} years` },
      { id: "benefits", header: "Benefits", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => `${row.original.vipDiscountPercent}% discount · ${row.original.lifetimePoints.toLocaleString("en-PH")} points` },
      { id: "version", header: "Version", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `v${row.original.configVersion}` },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
    ],
    [],
  );
  const productDetail = (products.data ?? []).find((item) => item.code === productCode) ?? null;

  return (
    <AdminPage
      anyOf={["vip-products"]}
      title="Product Catalog"
      description="VIP tier catalog."
      crumbs={[{ label: "VIP Products", href: "/admin/vip-products" }, { label: "Product Catalog" }]}
      actions={
        canManage ? (
          <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" /> New product
          </Button>
        ) : null
      }
    >
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
        title={productDetail ? `${productDetail.name} (${productDetail.code})` : "Product"}
        subtitle={productDetail ? `${productDetail.tier} tier · version ${productDetail.configVersion}` : undefined}
        badge={productDetail ? <BizBadge status={productDetail.status} /> : undefined}
        sections={
          productDetail
            ? [
                {
                  title: "Terms",
                  rows: [
                    { label: "Price", value: <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><Money value={productDetail.priceCentavos} /><BizBadge status={productDetail.priceStatus} label={productDetail.priceStatus === "conflict" ? "Source conflict" : "Contract-stated"} /></div> },
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
      <ProductDialog product={editing} creating={creating} onClose={() => { setEditing(null); setCreating(false); }} />
    </AdminPage>
  );
}
