"use client";

import { Printer } from "lucide-react";
import { usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { downPaymentCentavos, paymentSchemeTierTerms, schemeHowItWorks } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AdminSection } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { CardGridSkeleton } from "@/shared/components/modern/skeletons";
import { EMPTY } from "@/shared/lib/empty-value";
import { TierChip } from "./tier-codes-page";

export function PrintSchemeGuideButton() {
  return (
    <Button type="button" variant="info" className="tw:min-h-11 tw:sm:min-h-8 tw:print:hidden" onClick={() => window.print()}>
      <Printer aria-hidden="true" /> Print Guide
    </Button>
  );
}

/** One row of the tier comparison: package price and how it is split (05 section 8). */
function tierRow(scheme: PaymentScheme, product: VipProduct) {
  const { priceCentavos: total, reservationCentavos: reservation, installmentCount: months, installmentCentavos: monthly } = paymentSchemeTierTerms(product, scheme);
  const down = downPaymentCentavos(total, scheme);
  const isCash = scheme.category === "cash";
  return {
    total,
    // A down payment already includes the reservation fee, so it replaces that column when the scheme has one.
    upfront: down ?? (reservation || null),
    monthly: isCash ? (reservation ? total - reservation : null) : (monthly ?? null),
    months: isCash ? null : months,
  };
}

const amount = (value: number | null) => (value === null ? EMPTY : <Money value={value} />);

function SchemeComparison({ scheme, products }: { scheme: PaymentScheme; products: VipProduct[] }) {
  const applicable = products.filter((item) => scheme.applicableTiers.includes(item.code));
  const isCash = scheme.category === "cash";
  const hasDown = Boolean(scheme.downPaymentBasisPoints);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Card Level</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>{hasDown ? "Down payment" : "Reservation fee"}</TableHead>
          <TableHead>{isCash ? "Balance" : "Monthly"}</TableHead>
          {isCash ? null : <TableHead>Months</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {applicable.map((product) => {
          const row = tierRow(scheme, product);
          return (
            <TableRow key={product.code}>
              <TableCell><TierChip code={product.code}>{product.name}</TierChip></TableCell>
              <TableCell>{amount(row.total)}</TableCell>
              <TableCell>{amount(row.upfront)}</TableCell>
              <TableCell>{amount(row.monthly)}</TableCell>
              {isCash ? null : <TableCell className="tw:tabular-nums">{row.months ?? EMPTY}</TableCell>}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/**
 * Read-only guide to the official payment schemes (doc 05 section 8). It shows
 * only what the register holds: schemes without approved terms are listed as
 * pending and never given figures.
 */
export function SchemeGuidePanel() {
  const schemes = usePaymentSchemes();
  const products = useVipProducts();
  return (
    <QueryState
      isLoading={schemes.isLoading || products.isLoading}
      error={schemes.error ?? products.error}
      onRetry={() => {
        void schemes.refetch();
        void products.refetch();
      }}
      skeleton={<CardGridSkeleton cards={2} className="tw:lg:grid-cols-2" />}
    >
    {(schemes.data ?? []).length === 0 ? (
      <p className="tw:text-sm tw:text-muted-foreground">No payment plans configured.</p>
    ) : (
      <div className="tw:flex tw:flex-col tw:gap-4">
        {(schemes.data ?? []).map((scheme) => (
          <div key={scheme.id} className="tw:break-inside-avoid">
            <AdminSection title={scheme.label} actions={<BizBadge status={scheme.availability} />}>
              {scheme.commercialStatus === "configured" ? (
                <>
                  <div className="tw:flex tw:flex-col tw:gap-3">
                    <p className="tw:text-sm">
                      <span className="tw:font-semibold">How it works: </span>
                      {schemeHowItWorks(scheme)}
                    </p>
                    {scheme.reservationCentavos ? (
                      <p className="tw:inline-flex tw:w-fit tw:flex-wrap tw:items-center tw:gap-x-2 tw:rounded-lg tw:border tw:border-primary/30 tw:bg-primary/10 tw:px-3 tw:py-1.5 tw:text-sm tw:[print-color-adjust:exact]">
                        <span>Reservation fee</span>
                        <Money value={scheme.reservationCentavos} className="tw:font-bold" />
                        <span className="tw:text-muted-foreground">counted in the total</span>
                      </p>
                    ) : null}
                  </div>
                  <SchemeComparison scheme={scheme} products={products.data ?? []} />
                </>
              ) : (
                <p className="tw:text-sm tw:text-muted-foreground">
                  This payment plan cannot be offered yet. Its terms are waiting for owner approval.
                  {scheme.ownerHold ? ` ${scheme.ownerHold}` : null}
                </p>
              )}
            </AdminSection>
          </div>
        ))}
      </div>
    )}
    </QueryState>
  );
}
