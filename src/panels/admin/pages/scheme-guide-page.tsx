"use client";

import { Printer } from "lucide-react";
import { usePaymentSchemes } from "@/data/business-queries";
import type { PaymentScheme, VipTierCode } from "@/modules/vip/types";
import { InfoNote } from "@/shared/components/modern/detail-list";
import { Button } from "@/shared/ui/button";
import { BizBadge } from "@/shared/components/business/biz-badge";
import { Money } from "@/shared/components/modern/money";
import { QueryState } from "@/shared/components/modern/query-state";
import { Section } from "@/shared/components/modern/section";
import { ModulePage } from "../components/module-page";

const TIERS: Array<{ code: VipTierCode; label: string }> = [
  { code: "B1", label: "Bronze (B1)" },
  { code: "S1", label: "Silver (S1)" },
  { code: "G1", label: "Gold (G1)" },
];

/** Total payable under an installment scheme: reservation fee plus the equal installments (05 section 8). */
function installmentTotal(scheme: PaymentScheme, tier: VipTierCode): number | null {
  const each = scheme.installmentCentavosByTier[tier];
  if (!scheme.installmentCount || !each) return null;
  return (scheme.reservationCentavos ?? 0) + scheme.installmentCount * each;
}

/**
 * Read-only guide to the official payment schemes (doc 05 section 8). It shows
 * only what the register holds: schemes without approved terms are listed as
 * pending and never given figures.
 */
export function SchemeGuidePage() {
  const schemes = usePaymentSchemes();
  return (
    <ModulePage
      anyOf={["vip-products", "sales"]}
      title="Payment Scheme Guide"
      description="How each official payment scheme works. Read only."
      crumbs={[{ label: "VIP Products and Contracts", href: "/admin/vip-products" }, { label: "Payment Scheme Guide" }]}
      actions={
        <Button variant="outline" className="tw:min-h-11 tw:sm:min-h-8" onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Print guide
        </Button>
      }
    >
      <InfoNote title="Confidential">For authorized staff only. Amounts shown are the approved contract terms; a scheme without approved terms cannot be offered.</InfoNote>
      <QueryState isLoading={schemes.isLoading} error={schemes.error}>
        <div className="tw:flex tw:flex-col tw:gap-4">
          {(schemes.data ?? []).map((scheme) => (
            <Section key={scheme.id} title={scheme.label} actions={<BizBadge status={scheme.availability} />}>
              {scheme.commercialStatus === "configured" ? (
                <dl className="tw:grid tw:grid-cols-1 tw:gap-3 tw:text-sm tw:sm:grid-cols-2">
                  <div>
                    <dt className="tw:text-muted-foreground">How it works</dt>
                    <dd>{scheme.category === "cash" ? "One full payment." : `${scheme.reservationCentavos ? "A non-refundable reservation fee, then " : ""}${scheme.installmentCount} equal monthly installments${scheme.interestPercent === 0 ? " at 0% interest" : ""}.`}</dd>
                  </div>
                  {scheme.reservationCentavos ? (
                    <div>
                      <dt className="tw:text-muted-foreground">Reservation fee</dt>
                      <dd><Money value={scheme.reservationCentavos} /> (counted in the total)</dd>
                    </div>
                  ) : null}
                  {scheme.installmentCount
                    ? TIERS.filter((tier) => scheme.applicableTiers.includes(tier.code)).map((tier) => (
                        <div key={tier.code}>
                          <dt className="tw:text-muted-foreground">{tier.label}</dt>
                          <dd>
                            <Money value={scheme.installmentCentavosByTier[tier.code] ?? 0} /> × {scheme.installmentCount}
                            {installmentTotal(scheme, tier.code) ? <> · total <Money value={installmentTotal(scheme, tier.code)!} /></> : null}
                          </dd>
                        </div>
                      ))
                    : null}
                </dl>
              ) : (
                <p className="tw:text-sm tw:text-muted-foreground">Terms are pending owner approval, so this scheme cannot be offered yet. {scheme.ownerHold ?? scheme.source}</p>
              )}
            </Section>
          ))}
        </div>
      </QueryState>
    </ModulePage>
  );
}
