"use client";

import { Printer } from "lucide-react";
import { usePaymentSchemes, useVipProducts } from "@/data/business-queries";
import { downPaymentCentavos, installmentCountFor, schemeHowItWorks, schemePriceCentavos } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { AdminPage, AdminSection } from "@/shared/components/admin";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";

const TIERS: Array<{ code: VipTierCode; label: string }> = [
  { code: "B1", label: "Bronze (B1)" },
  { code: "S1", label: "Silver (S1)" },
  { code: "G1", label: "Gold (G1)" },
];

/** One line per tier: package price and how it is split (05 section 8). */
function TierTerms({ scheme, product }: { scheme: PaymentScheme; product: VipProduct }) {
  const price = schemePriceCentavos(product, scheme);
  const count = installmentCountFor(scheme, product.code);
  const each = scheme.installmentCentavosByTier[product.code];
  const down = downPaymentCentavos(price, scheme);
  return (
    <dd>
      Total <Money value={price} />
      {down != null ? <> · down payment <Money value={down} /></> : null}
      {scheme.category === "cash" && scheme.reservationCentavos ? <> · balance <Money value={price - scheme.reservationCentavos} /></> : null}
      {scheme.category !== "cash" && count && each ? <> · <Money value={each} /> × {count}</> : null}
    </dd>
  );
}

/**
 * Read-only guide to the official payment schemes (doc 05 section 8). It shows
 * only what the register holds: schemes without approved terms are listed as
 * pending and never given figures.
 */
export function SchemeGuidePage() {
  const schemes = usePaymentSchemes();
  const products = useVipProducts();
  return (
    <AdminPage
      anyOf={["vip-products", "sales"]}
      title="Payment Scheme Guide"
      description="How each official payment scheme works. Read only."
      crumbs={[{ label: "VIP Products", href: "/admin/vip-products" }, { label: "Scheme Guide" }]}
      actions={
        <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Print guide
        </Button>
      }
    >
      <InfoNote title="Confidential">For authorized staff only. Amounts shown are the approved contract terms; a scheme without approved terms cannot be offered.</InfoNote>
      <QueryState isLoading={schemes.isLoading || products.isLoading} error={schemes.error ?? products.error}>
        <div className="tw:flex tw:flex-col tw:gap-4">
          {(schemes.data ?? []).map((scheme) => (
            <AdminSection key={scheme.id} title={scheme.label} actions={<BizBadge status={scheme.availability} />}>
              {scheme.commercialStatus === "configured" ? (
                <dl className="tw:grid tw:grid-cols-1 tw:gap-3 tw:text-sm tw:sm:grid-cols-2">
                  <div>
                    <dt className="tw:text-muted-foreground">How it works</dt>
                    <dd>{schemeHowItWorks(scheme)}</dd>
                  </div>
                  {scheme.reservationCentavos ? (
                    <div>
                      <dt className="tw:text-muted-foreground">Reservation fee</dt>
                      <dd><Money value={scheme.reservationCentavos} /> (counted in the total)</dd>
                    </div>
                  ) : null}
                  {TIERS.filter((tier) => scheme.applicableTiers.includes(tier.code)).map((tier) => {
                    const product = (products.data ?? []).find((item) => item.code === tier.code);
                    return product ? (
                      <div key={tier.code}>
                        <dt className="tw:text-muted-foreground">{tier.label}</dt>
                        <TierTerms scheme={scheme} product={product} />
                      </div>
                    ) : null;
                  })}
                </dl>
              ) : (
                <p className="tw:text-sm tw:text-muted-foreground">Terms are pending owner approval, so this scheme cannot be offered yet. {scheme.ownerHold ?? scheme.source}</p>
              )}
            </AdminSection>
          ))}
        </div>
      </QueryState>
    </AdminPage>
  );
}
