"use client";

import { useMemo, useState } from "react";
import { CircleCheck, CircleOff, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useApproveProduct, useDeleteProduct, useOperation, useProductDeleteBlockers, useUpdateProduct, useVipProducts } from "@/data/business-queries";
import type { VipProduct } from "@/modules/vip/types";
import { AreaPage } from "@/shared/components/admin";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { ReasonDialog } from "@/shared/components/modern/form-dialog";
import { formatDate } from "@/shared/lib/format-date";
import { matchesSearch } from "@/shared/lib/search";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { ImagePreview } from "@/shared/components/modern/image-preview";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { ProductDialog } from "../components/vip-product-dialogs";
import { ADMIN_AREA_TABS } from "../navigation";
import { useAdminAreaTabAccess } from "../use-role-aware-navigation";
import { PaymentSchemesTab } from "./payment-schemes-page";
import { HistoryImportPanel } from "./history-import-page";
import { IgpProjectsTab } from "./igp-projects-page";
import { LIST_TABS, ListsPage, type ListTabId } from "./lists-page";
import { RedemptionHolidaysPanel, RedemptionPointsTablePanel, RedemptionVenuesPanel } from "./redemption-points-table-page";
import { TierLevelsPanel } from "./tier-codes-page";

/** Header button per tab: the label and the operation that allows it. */
const ADD_BUTTONS: Partial<Record<string, { label: string; operation: "vip-products.manage" | "redemption.configure" | "igp.manage" }>> = {
  products: { label: "New product", operation: "vip-products.manage" },
  schemes: { label: "New payment plan", operation: "vip-products.manage" },
  "tier-codes": { label: "Add card level", operation: "vip-products.manage" },
  "points-table": { label: "Update points table", operation: "redemption.configure" },
  holidays: { label: "Add holiday", operation: "redemption.configure" },
  venues: { label: "Add venue", operation: "redemption.configure" },
  "igp-projects": { label: "Add project", operation: "igp.manage" },
};

/**
 * Settings area (key "vip-products"): product setup plus the setup tabs moved
 * from Redemption, Organization, Finance and Sales. Each tab keeps the access
 * rule of the page it came from.
 */
export function VipProductsAreaPage() {
  const access = useAdminAreaTabAccess("vip-products");
  const operations = {
    "vip-products.manage": useOperation("vip-products.manage"),
    "redemption.configure": useOperation("redemption.configure"),
    "igp.manage": useOperation("igp.manage"),
  };
  const canManageLists = useOperation("settings.lists.manage");
  const [creating, setCreating] = useState<string | null>(null);
  const [list, setList] = useState<ListTabId>("program-category");
  const [addingListItem, setAddingListItem] = useState(false);
  const close = () => setCreating(null);
  const open = (tab: string) => creating === tab;
  const singular = (LIST_TABS.find((item) => item.value === list) ?? LIST_TABS[0]).singular;

  return (
    <AreaPage
      anyOf={["vip-products", "redemption", "departments", "reports", "sales", "finance"]}
      title="Settings"
      actions={(tab) => {
        if (tab === "lists" && canManageLists) {
          return <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setAddingListItem(true)}><Plus aria-hidden="true" /> Add {singular}</Button>;
        }
        const button = ADD_BUTTONS[tab];
        if (!button || !operations[button.operation]) return null;
        return (
          <Button type="button" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => setCreating(tab)}>
            <Plus aria-hidden="true" /> {button.label}
          </Button>
        );
      }}
      tabs={ADMIN_AREA_TABS["vip-products"].map(({ value, label }) => ({
        value,
        label,
        allowed: access[value],
        render: () => {
          const createProps = { createOpen: open(value), onCreateClose: close };
          switch (value) {
            case "products": return <VipProductsTab creating={operations["vip-products.manage"] && open(value)} onCloseCreate={close} />;
            case "schemes": return <PaymentSchemesTab creating={operations["vip-products.manage"] && open(value)} onCloseCreate={close} />;
            case "tier-codes": return <TierLevelsPanel adding={operations["vip-products.manage"] && open(value)} onCloseAdd={close} />;
            case "points-table": return <RedemptionPointsTablePanel {...createProps} />;
            case "holidays": return <RedemptionHolidaysPanel {...createProps} />;
            case "venues": return <RedemptionVenuesPanel {...createProps} />;
            case "lists": return <ListsPage embedded list={list} onListChange={setList} adding={addingListItem} onAddingChange={setAddingListItem} />;
            case "historical-import": return <HistoryImportPanel />;
            case "igp-projects": return <IgpProjectsTab adding={open(value)} onAddingClose={close} />;
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
  const canApprove = useOperation("vip-products.approve");
  const blockers = useProductDeleteBlockers();
  const deleteProduct = useDeleteProduct();
  const updateProduct = useUpdateProduct();
  const approveProduct = useApproveProduct();
  const [statusTarget, setStatusTarget] = useState<VipProduct | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<VipProduct | null>(null);
  const [editing, setEditing] = useState<VipProduct | null>(null);
  const [productCode, setProductCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const tierNameOptions = useMemo(() => [...new Set((products.data ?? []).map((item) => item.tier))].map((tier) => ({ value: tier, label: tier })), [products.data]);
  const visibleProducts = useMemo(
    () => (products.data ?? []).filter((item) =>
      (statusFilter === "all" || item.status === statusFilter)
      && (approvalFilter === "all" || item.approvalStatus === approvalFilter)
      && (tierFilter === "all" || item.tier === tierFilter)
      && matchesSearch(search, item.name, item.code)),
    [products.data, search, statusFilter, approvalFilter, tierFilter],
  );

  const productColumns = useMemo<ColumnDef<VipProduct, unknown>[]>(
    () => [
      { id: "name", header: "Product", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name}</span> },
      { id: "tier", header: "Card Level", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.tier },
      { id: "price", header: "Price", cell: ({ row }) => <Money value={row.original.priceCentavos} /> },
      { id: "status", header: "Status", cell: ({ row }) => (
        <span className="tw:flex tw:flex-wrap tw:gap-1">
          <BizBadge status={row.original.approvalStatus} />
          {row.original.approvalStatus === "approved" ? <BizBadge status={row.original.status} /> : null}
        </span>
      ) },
      { id: "updated", header: "Last Updated", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => lastChangeDate(row.original) },
    ],
    [],
  );
  const productDetail = (products.data ?? []).find((item) => item.code === productCode) ?? null;

  return (
    <>
        <QueryState isLoading={products.isLoading} error={products.error}>
          <FilterBar search={search} onSearch={setSearch} searchLabel="Search products" filters={[
            { label: "Status filter", value: statusFilter, onChange: setStatusFilter, options: [{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "retired", label: "Retired" }] },
            { label: "Approval filter", value: approvalFilter, onChange: setApprovalFilter, options: [{ value: "all", label: "All approvals" }, { value: "draft", label: "Draft" }, { value: "approved", label: "Approved" }] },
            { label: "Card level filter", value: tierFilter, onChange: setTierFilter, options: [{ value: "all", label: "All card levels" }, ...tierNameOptions] },
          ]} />
          <DataTable data={visibleProducts} columns={productColumns} getRowId={(row) => row.code} emptyText={(products.data ?? []).length === 0 ? "No products." : "No products match the filters."} caption="VIP Product Catalog" onRowOpen={(row) => setProductCode(row.code)} getRowLabel={(row) => `Open ${row.name}`} rowActions={(row) => <RowActionsMenu itemName={row.name} onEdit={canManage ? () => setEditing(row) : undefined} extraItems={canApprove && row.approvalStatus === "draft" ? [{ key: "approve", label: "Approve product", tone: "success", onClick: () => setApprovalTarget(row) }] : []} onDelete={canManage && blockers.data && blockers.data[row.code] === null ? () => deleteProduct.mutateAsync({ code: row.code, reason: "Unused product removed from the catalog." }) : undefined} deleteDisabledReason={canManage ? blockers.data?.[row.code] : undefined} deleteDescription="This removes the product from the catalog. It has not been used, and the removal is recorded in the audit log." />} />
        </QueryState>
      <RecordDetailsSheet
        open={productDetail !== null}
        onClose={() => setProductCode(null)}
        title={productDetail?.name ?? "Product"}
        subtitle={productDetail ? `${productDetail.tier} level` : undefined}
        badge={productDetail ? (
          <span className="tw:flex tw:flex-wrap tw:gap-1">
            <BizBadge status={productDetail.approvalStatus} />
            {productDetail.approvalStatus === "approved" ? <BizBadge status={productDetail.status} /> : null}
          </span>
        ) : undefined}
        sections={
          productDetail
            ? [
                {
                  title: "Terms",
                  rows: [
                    ...(productDetail.imageUrl
                      ? [{ label: "Product image", wide: true, value: (
                          <ImagePreview src={productDetail.imageUrl} fileName={productDetail.imageFileName} label={`${productDetail.name} product image`} />
                        ) }]
                      : []),
                    { label: "Card Level", value: productDetail.tier },
                    { label: "Description", value: productDetail.description ?? null, wide: true },
                    { label: "Other benefits", value: productDetail.benefitsSummary ?? null, wide: true },
                    { label: "Price", value: <Money value={productDetail.priceCentavos} /> },
                    { label: "Price source", value: <BizBadge status={productDetail.priceStatus} label={productDetail.priceStatus === "conflict" ? "Source conflict" : "Contract-stated"} /> },
                    { label: "Price note", value: productDetail.priceNote ? plainNote(productDetail.priceNote) : null, wide: true },
                    { label: "Validity", value: `${productDetail.validityYears} years (${productDetail.earningCycles} earning cycles)` },
                    { label: "VIP discount", value: `${productDetail.vipDiscountPercent}%` },
                    { label: "Extra cardholders", value: String(productDetail.supplementaryHolders) },
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
        history={productDetail ? productDetail.changes.map((item) => ({ key: `${item.date}-${item.version}`, when: `Changed on ${formatDate(item.date)}`, text: item.reason })) : []}
        footer={
          productDetail && canManage ? (
            <>
              {productDetail.approvalStatus === "draft" && canApprove ? (
                <Button type="button" variant="success" onClick={() => setApprovalTarget(productDetail)}><ShieldCheck aria-hidden="true" /> Approve Product</Button>
              ) : null}
              {productDetail.approvalStatus === "approved" && productDetail.status === "retired" ? (
                <Button type="button" variant="success" onClick={() => setStatusTarget(productDetail)}><CircleCheck aria-hidden="true" /> Make Available</Button>
              ) : null}
              <Button type="button" variant="warning" onClick={() => { setEditing(productDetail); setProductCode(null); }}><Pencil aria-hidden="true" /> Edit Product</Button>
              {productDetail.approvalStatus === "approved" && productDetail.status === "active" ? (
                <Button type="button" variant="destructive" onClick={() => setStatusTarget(productDetail)}><CircleOff aria-hidden="true" /> Make Unavailable</Button>
              ) : null}
            </>
          ) : undefined
        }
      />
      <ReasonDialog
        open={statusTarget !== null}
        title={statusTarget?.status === "active" ? `Make ${statusTarget.name} unavailable` : `Make ${statusTarget?.name ?? "product"} available`}
        description={statusTarget?.status === "active" ? "New sales can no longer choose this product. Contracts already signed are not changed." : "New sales can choose this product again."}
        confirmText={statusTarget?.status === "active" ? "Make Unavailable" : "Make Available"}
        successText={statusTarget?.status === "active" ? `${statusTarget.name} is now unavailable.` : `${statusTarget?.name ?? "Product"} is now available.`}
        danger={statusTarget?.status === "active"}
        tone={statusTarget?.status === "active" ? "destructive" : "success"}
        onClose={() => setStatusTarget(null)}
        onSubmit={(reason) => (statusTarget ? updateProduct.mutateAsync({ code: statusTarget.code, reason, input: { status: statusTarget.status === "active" ? "retired" : "active" } }) : Promise.resolve())}
      />
      <ReasonDialog
        open={approvalTarget !== null}
        title={`Approve ${approvalTarget?.name ?? "product"}`}
        description="Approval needs complete terms, stated benefits, and an available payment plan. It activates the product for sale but does not issue a VIP Number. Listing it publicly is a separate choice."
        label="Approval reference"
        confirmText="Approve Product"
        successText={`${approvalTarget?.name ?? "Product"} is approved.`}
        tone="success"
        onClose={() => setApprovalTarget(null)}
        onSubmit={(reason) => (approvalTarget ? approveProduct.mutateAsync({ code: approvalTarget.code, reason }) : Promise.resolve())}
      />
      <ProductDialog product={editing} creating={creating} onClose={() => { setEditing(null); onCloseCreate(); }} />
    </>
  );
}

/** Date of the most recent change to a product, or an em dash when it has never changed. */
function lastChangeDate(product: VipProduct): string {
  const latest = product.changes.map((item) => item.date).sort().at(-1);
  return formatDate(latest);
}

/** Saved price notes start with "Created on" or "Updated on" and an ISO date (older ones, a technical "configuration version" prefix); show plain words instead. */
function plainNote(note: string): string {
  return note
    .replace(/^(Created|Updated) in configuration version \d+:\s*/, "$1: ")
    .replace(/^(Created|Updated) on (\d{4}-\d{2}-\d{2}):/, (_match, verb: string, date: string) => `${verb} on ${formatDate(date)}:`);
}
