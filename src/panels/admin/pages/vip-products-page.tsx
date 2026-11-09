"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { useOperation, usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { NON_ACTIVE_TIER_CODES, type PaymentScheme, type VipProduct } from "@/modules/vip/types";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button, buttonVariants } from "@/shared/ui/button";
import { ModulePage } from "../components/module-page";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { ProductDialog, SchemeDialog } from "../components/vip-product-dialogs";

export function VipProductsPage() {
  const products = useVipProducts();
  const schemes = usePaymentSchemes();
  const canManage = useOperation("vip-products.manage");
  const [editing, setEditing] = useState<VipProduct | null>(null);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<PaymentScheme | null>(null);

  const productColumns = useMemo<ColumnDef<VipProduct, unknown>[]>(
    () => [
      { id: "name", header: "Product", cell: ({ row }) => <span className="tw:font-semibold">{row.original.name} <span className="tw:text-muted-foreground">({row.original.code})</span></span> },
      { id: "price", header: "Price", cell: ({ row }) => <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2"><Money value={row.original.priceCentavos} /><BizBadge status={row.original.priceStatus} label={row.original.priceStatus === "conflict" ? "Source conflict" : "Contract-stated"} /></div> },
      { id: "validity", header: "Validity", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => `${row.original.validityYears} years` },
      { id: "benefits", header: "Benefits", meta: { className: "tw:hidden tw:lg:table-cell" }, cell: ({ row }) => `${row.original.vipDiscountPercent}% discount · ${row.original.lifetimePoints.toLocaleString("en-PH")} points` },
      { id: "version", header: "Version", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => `v${row.original.configVersion}` },
      { id: "status", header: "Status", cell: ({ row }) => <BizBadge status={row.original.status} /> },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) =>
          canManage ? (
            <Button variant="ghost" size="sm" className="tw:min-h-11 tw:sm:min-h-7" aria-label={`Edit ${row.original.name}`} onClick={() => setEditing(row.original)}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          ) : null,
      },
    ],
    [canManage],
  );

  const schemeColumns = useMemo<ColumnDef<PaymentScheme, unknown>[]>(
    () => [
      { id: "label", header: "Scheme", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.label}</div>{row.original.historicalLabel ? <div className="tw:text-xs tw:text-muted-foreground">Source label: {row.original.historicalLabel}</div> : null}</div> },
      { id: "code", header: "Card code", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.paymentCode ?? "—" },
      { id: "terms", header: "Terms", meta: { className: "tw:hidden tw:md:table-cell" }, cell: ({ row }) => (row.original.commercialStatus === "configured" ? termsSummary(row.original) : "Not configured") },
      { id: "state", header: "Status", cell: ({ row }) => <div className="tw:flex tw:flex-col tw:gap-1"><BizBadge status={row.original.commercialStatus} label={row.original.commercialStatus === "configured" ? "Configured" : "Pending owner decision"} /><BizBadge status={row.original.availability} /></div> },
      {
        id: "actions",
        header: () => <span className="tw:sr-only">Actions</span>,
        cell: ({ row }) =>
          canManage ? (
            <Button variant="ghost" size="sm" className="tw:min-h-11 tw:sm:min-h-7" aria-label={`Edit ${row.original.label}`} onClick={() => { setEditingScheme(row.original); setSchemeOpen(true); }}>
              <Pencil aria-hidden="true" /> Edit
            </Button>
          ) : null,
      },
    ],
    [canManage],
  );

  return (
    <ModulePage
      anyOf={["vip-products"]}
      title="VIP Products and Contracts"
      description="Tier catalog, payment schemes, and contract review."
      crumbs={[{ label: "VIP Products and Contracts" }]}
      actions={
        <div className="tw:flex tw:flex-wrap tw:gap-2">
          <Link href="/admin/vip-products/scheme-guide" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
            Scheme guide
          </Link>
          <Link href="/admin/vip-products/contracts" className={buttonVariants({ variant: "outline", className: "tw:min-h-11 tw:sm:min-h-8" })}>
            Contract review
          </Link>
        </div>
      }
    >
      <InfoNote title="Contract-stated values">Prices and benefits are the values written in the standard contracts. The Gold price carries a source conflict that management must resolve before Gold contracts can be finalized.</InfoNote>
      <Section title="Product catalog">
        <QueryState isLoading={products.isLoading} error={products.error}>
          <DataTable data={products.data ?? []} columns={productColumns} getRowId={(row) => row.code} emptyText="No products." caption="VIP product catalog" />
        </QueryState>
      </Section>
      <Section
        title="Payment scheme register"
        description="Move A, Move B1 and Move B2 are listed from the source workbook but have no approved terms, so they cannot be selected."
        actions={
          canManage ? (
            <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setEditingScheme(null); setSchemeOpen(true); }}>
              <Plus aria-hidden="true" /> New scheme
            </Button>
          ) : null
        }
      >
        <QueryState isLoading={schemes.isLoading} error={schemes.error}>
          <DataTable data={schemes.data ?? []} columns={schemeColumns} getRowId={(row) => row.id} emptyText="No schemes." caption="Payment schemes" />
        </QueryState>
      </Section>
      <Section title="Historical and reserved tier codes" description="Shown for reference only. These codes are not active and are never activated automatically.">
        <ul className="tw:flex tw:flex-wrap tw:gap-2">
          {NON_ACTIVE_TIER_CODES.map((item) => (
            <li key={item.code} className="tw:rounded-md tw:border tw:border-border tw:px-2 tw:py-1 tw:text-sm">
              {item.code} · {item.label} <span className="tw:text-muted-foreground">({item.state})</span>
            </li>
          ))}
        </ul>
      </Section>
      <ProductDialog product={editing} onClose={() => setEditing(null)} />
      <SchemeDialog open={schemeOpen} scheme={editingScheme} onClose={() => setSchemeOpen(false)} />
    </ModulePage>
  );
}

function termsSummary(scheme: PaymentScheme): string {
  if (scheme.category === "cash") return "One full payment";
  const reservation = scheme.reservationCentavos ? "Reservation fee + " : "";
  return `${reservation}${scheme.installmentCount} monthly installments${scheme.interestPercent === 0 ? " at 0% interest" : ""}`;
}
