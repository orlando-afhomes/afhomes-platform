"use client";

import { useMemo, useState } from "react";
import { Package, Pencil } from "lucide-react";
import { useOperation, useVipProducts } from "@/data/business-queries";
import type { VipProduct } from "@/modules/vip/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { AdminPage, AdminSection } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { ProductDialog } from "../components/vip-product-dialogs";

export function VipProductsPage() {
  const products = useVipProducts();
  const canManage = useOperation("vip-products.manage");
  const [editing, setEditing] = useState<VipProduct | null>(null);
  const [productCode, setProductCode] = useState<string | null>(null);

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
    >
      <InfoNote title="Contract-stated values">Prices and benefits are the values written in the standard contracts. The Gold installment price carries a source conflict that management must resolve before Gold installment contracts can be finalized. Spot Cash uses the Full Payment contract prices.</InfoNote>
      <AdminSection title="Product catalog" icon={Package}>
        <QueryState isLoading={products.isLoading} error={products.error}>
          <DataTable data={products.data ?? []} columns={productColumns} getRowId={(row) => row.code} emptyText="No products." caption="VIP product catalog" onRowOpen={(row) => setProductCode(row.code)} getRowLabel={(row) => `Open ${row.name}`} rowActions={(row) => <RowActionsMenu itemName={row.name} onView={() => setProductCode(row.code)} onEdit={canManage ? () => setEditing(row) : undefined} />} />
        </QueryState>
      </AdminSection>
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
      <ProductDialog product={editing} onClose={() => setEditing(null)} />
    </AdminPage>
  );
}
