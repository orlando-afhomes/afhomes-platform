"use client";

import type { ReactNode } from "react";
import { BadgeCheck, Gift, TrendingUp, UserCheck, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { AdminStatCard, AdminStatGrid, type AdminStatTone } from "@/shared/components/admin";
import { Money } from "@/shared/components/modern/money";
import { ReportFrame, useReportRange } from "./report-shell";
import { useCollectionsFigures } from "../pages/collections-report-page";
import { useCommissionFigures } from "../pages/commission-report-page";
import { useCustomerGrowthFigures } from "../pages/customer-growth-report-page";
import { useMembershipFigures } from "../pages/membership-report-page";
import { usePromoPointsFigures } from "../pages/promo-points-report-page";
import { useSalesFigures } from "../pages/sales-performance-report-page";
import { useStayPointsFigures } from "../pages/stay-points-report-page";

/** Report tabs of the Reports area, in the same values as its tab navigation. */
export type ReportKey = "sales" | "customers" | "collections" | "commissions" | "membership" | "stay-points" | "promo-points";

type SummaryCard = { key: ReportKey; label: string; caption: string; value: ReactNode; icon: LucideIcon; tone: AdminStatTone; loading: boolean; error: unknown };

/**
 * One card per report with its headline number for the selected range. A card opens its report through
 * `onOpen`. The Collections card shows only with `finance.reports.view`, the same rule as its report.
 */
export function ReportsSummaryPanel({ onOpen }: { onOpen: (reportKey: ReportKey) => void }) {
  const range = useReportRange();
  const sales = useSalesFigures(range);
  const customers = useCustomerGrowthFigures(range);
  const collections = useCollectionsFigures(range);
  const commissions = useCommissionFigures(range);
  const membership = useMembershipFigures(range);
  const stayPoints = useStayPointsFigures(range);
  const promoPoints = usePromoPointsFigures(range);
  const fmt = (value: number) => value.toLocaleString("en-PH");

  const cards: SummaryCard[] = [
    { key: "sales", label: "Sales", caption: "Period sales", value: <Money value={sales.confirmedInPeriod} />, icon: TrendingUp, tone: "brand", loading: sales.loading, error: sales.error },
    { key: "customers", label: "Customers", caption: "New customers", value: customers.newCustomers, icon: UserPlus, tone: "success", loading: customers.customers.isLoading, error: customers.customers.error },
    ...(collections.allowed
      ? [{ key: "collections" as const, label: "Collections", caption: "Verified collections", value: <Money value={collections.collected} />, icon: Wallet, tone: "success" as const, loading: collections.payments.isLoading, error: collections.payments.error }]
      : []),
    { key: "commissions", label: "Commissions", caption: "Approved", value: <Money value={commissions.approvedInPeriod} />, icon: BadgeCheck, tone: "brand", loading: commissions.commissions.isLoading, error: commissions.commissions.error },
    { key: "membership", label: "Membership", caption: "Activated", value: membership.activatedInPeriod, icon: UserCheck, tone: "success", loading: membership.memberships.isLoading, error: membership.memberships.error },
    { key: "stay-points", label: "Stay Points", caption: "Points released", value: fmt(stayPoints.released), icon: TrendingUp, tone: "info", loading: stayPoints.points.isLoading, error: stayPoints.points.error },
    { key: "promo-points", label: "Promo Points", caption: "Points earned", value: fmt(promoPoints.earned), icon: Gift, tone: "info", loading: promoPoints.ledger.isLoading, error: promoPoints.ledger.error },
  ];

  return (
    <ReportFrame range={range}>
      <AdminStatGrid columns={3}>
        {cards.map((card) => (
          <div key={card.key} className="reports-summary__card tw:relative tw:rounded-2xl tw:transition-transform tw:hover:-translate-y-0.5 tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0">
            <AdminStatCard label={card.label} value={card.value} description={card.caption} icon={card.icon} tone={card.tone} loading={card.loading} error={card.error} />
            <button
              type="button"
              aria-label={`Open the ${card.label} report`}
              onClick={() => onOpen(card.key)}
              className="tw:absolute tw:inset-0 tw:cursor-pointer tw:rounded-2xl tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50"
            />
          </div>
        ))}
      </AdminStatGrid>
    </ReportFrame>
  );
}
