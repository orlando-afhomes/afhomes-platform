"use client";

import { useMemo, useState } from "react";
import { Landmark, Pencil, Plus } from "lucide-react";
import { useOperation, usePaymentSchemes } from "@/data/business-queries";
import type { PaymentScheme } from "@/modules/vip/types";
import { schemeHowItWorks as termsSummary } from "@/modules/vip/rules";
import { DataTable, type ColumnDef } from "@/shared/components/modern/data-table";
import { Button } from "@/shared/ui/button";
import { AdminPage, AdminSection } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { RecordDetailsSheet } from "@/shared/components/modern/record-details-sheet";
import { RowActionsMenu } from "@/shared/components/modern/row-actions-menu";
import { QueryState } from "@/shared/components/modern/query-state";
import { formatPeso } from "@/shared/lib/money";
import { SchemeDialog } from "../components/vip-product-dialogs";

export function PaymentSchemesPage() {
  const schemes = usePaymentSchemes();
  const canManage = useOperation("vip-products.manage");
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<PaymentScheme | null>(null);
  const [schemeId, setSchemeId] = useState<string | null>(null);

  const schemeColumns = useMemo<ColumnDef<PaymentScheme, unknown>[]>(
    () => [
      { id: "label", header: "Scheme", cell: ({ row }) => <div><div className="tw:font-semibold">{row.original.label}</div>{row.original.historicalLabel ? <div className="tw:text-xs tw:text-muted-foreground">Source label: {row.original.historicalLabel}</div> : null}</div> },
      { id: "code", header: "Card code", meta: { className: "tw:hidden tw:sm:table-cell" }, cell: ({ row }) => row.original.paymentCode ?? "—" },
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
    >
      <AdminSection
        title="Payment scheme register"
        icon={Landmark}
        description="Move A and Move B need Super Admin written approval on each contract. They have no Card ID payment code until the owner authorizes a mapping, so their memberships cannot be activated yet."
        actions={
          canManage ? (
            <Button className="tw:min-h-11 tw:sm:min-h-8" onClick={() => { setEditingScheme(null); setSchemeOpen(true); }}>
              <Plus aria-hidden="true" /> New scheme
            </Button>
          ) : null
        }
      >
        <QueryState isLoading={schemes.isLoading} error={schemes.error}>
          <DataTable data={schemes.data ?? []} columns={schemeColumns} getRowId={(row) => row.id} emptyText="No schemes." caption="Payment schemes" onRowOpen={(row) => setSchemeId(row.id)} getRowLabel={(row) => `Open ${row.label}`} rowActions={(row) => <RowActionsMenu itemName={row.label} onView={() => setSchemeId(row.id)} onEdit={canManage ? () => openSchemeEditor(row) : undefined} />} />
        </QueryState>
      </AdminSection>
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
                    { label: "Category", value: schemeDetail.category },
                    { label: "Card code", value: schemeDetail.paymentCode },
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

function schemePrices(scheme: PaymentScheme): string | null {
  const entries = Object.entries(scheme.priceCentavosByTier);
  return entries.length > 0 ? entries.map(([tier, amount]) => `${tier} ${formatPeso(amount ?? 0)}`).join(" · ") : null;
}
