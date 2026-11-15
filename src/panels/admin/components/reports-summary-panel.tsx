"use client";

import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Gift, TrendingUp, UserCheck, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { manilaDateOf } from "@/shared/lib/dates";
import { OPEN_FROM, OPEN_TO, ReportFrame, useReportRange, type ReportRange } from "./report-shell";
import { useCollectionsFigures } from "../pages/collections-report-page";
import { useCommissionFigures } from "../pages/commission-report-page";
import { useCustomerGrowthFigures } from "../pages/customer-growth-report-page";
import { useMembershipFigures } from "../pages/membership-report-page";
import { usePromoPointsFigures } from "../pages/promo-points-report-page";
import { useSalesFigures } from "../pages/sales-performance-report-page";
import { useStayPointsFigures } from "../pages/stay-points-report-page";

/** Report tabs of the Reports area, in the same values as its tab navigation. */
export type ReportKey = "sales" | "customers" | "collections" | "commissions" | "membership" | "stay-points" | "promo-points";

type CardTone = "brand" | "success" | "info";

const TONE_CHIP: Record<CardTone, string> = {
  brand: "tw:bg-[var(--color-brand-soft)] tw:text-primary",
  success: "tw:bg-success/10 tw:text-[var(--color-success-strong)]",
  info: "tw:bg-info/10 tw:text-info",
};

type SummaryCard = {
  key: ReportKey;
  /** Name of the report, used for the accessible "Open the ... report" button. */
  report: string;
  label: string;
  caption: string;
  value: ReactNode;
  current: number;
  previous: number;
  icon: LucideIcon;
  tone: CardTone;
  loading: boolean;
  error: unknown;
};

const DAY_MS = 86_400_000;
const dayNumber = (dateOnly: string) => {
  const [year, month, day] = dateOnly.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};
const dateOfDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/**
 * The period right before `range`, with the same number of days. `comparable` is false when the range has no
 * start or end date, or starts after it ends, so no comparison is shown.
 */
export function previousPeriod(range: Pick<ReportRange, "from" | "to">) {
  const comparable = range.from !== OPEN_FROM && range.to !== OPEN_TO && range.from <= range.to;
  const length = comparable ? dayNumber(range.to) - dayNumber(range.from) + 1 : 1;
  const to = comparable ? dateOfDay(dayNumber(range.from) - 1) : range.to;
  const from = comparable ? dateOfDay(dayNumber(to) - (length - 1)) : range.from;
  const inRange = (date: string | null | undefined) => Boolean(date) && manilaDateOf(date as string) >= from && manilaDateOf(date as string) <= to;
  return { from, to, inRange, comparable };
}

/** Comparison with the previous period: green up, red down, muted dash when there is nothing to compare. */
function Comparison({ current, previous, comparable }: { current: number; previous: number; comparable: boolean }) {
  if (!comparable || previous <= 0) {
    return <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">— <span className="tw:sr-only">No previous period to compare with</span></p>;
  }
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (current === previous) return <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">No change vs previous period</p>;
  const up = current > previous;
  return (
    <p className={cn("tw:m-0 tw:text-xs tw:font-medium", up ? "tw:text-(--color-success-strong)" : "tw:text-destructive")}>
      <span aria-hidden="true">{up ? "▲" : "▼"} {percent}% vs previous period</span>
      <span className="tw:sr-only">{up ? "Up" : "Down"} {percent}% vs previous period</span>
    </p>
  );
}

function SummaryStatCard({ card, comparable, onOpen }: { card: SummaryCard; comparable: boolean; onOpen: (reportKey: ReportKey) => void }) {
  const Icon = card.icon;
  return (
    <div className="reports-summary__card tw:group tw:relative tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:p-4 tw:text-card-foreground tw:shadow-(--shadow-soft) tw:transition-transform tw:hover:-translate-y-0.5 tw:sm:p-5 tw:motion-reduce:transition-none tw:motion-reduce:hover:translate-y-0">
      <div className="tw:flex tw:items-center tw:gap-3">
        <span aria-hidden="true" className={cn("tw:flex tw:size-10 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-xl", TONE_CHIP[card.tone])}>
          <Icon className="tw:size-5" strokeWidth={1.75} />
        </span>
        <span className="tw:min-w-0 tw:flex-1 tw:truncate tw:text-sm tw:font-medium tw:text-muted-foreground">{card.label}</span>
        <span aria-hidden="true" className="report-print__hide tw:flex tw:shrink-0 tw:items-center tw:gap-1 tw:text-xs tw:font-medium tw:text-muted-foreground tw:transition-colors tw:group-hover:text-primary">
          Open report <ArrowRight className="tw:size-3.5" />
        </span>
      </div>
      <div className="tw:flex tw:flex-col tw:gap-1">
        {card.loading ? (
          <Skeleton className="tw:h-8 tw:w-28 tw:max-w-full" />
        ) : card.error ? (
          <p className="tw:m-0 tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</p>
        ) : (
          <p className="tw:m-0 tw:truncate tw:text-3xl tw:leading-none tw:font-bold tw:tracking-tight tw:tabular-nums">{card.value}</p>
        )}
        <p className="tw:m-0 tw:truncate tw:text-xs tw:text-muted-foreground">{card.caption}</p>
      </div>
      {card.loading || card.error ? null : <Comparison current={card.current} previous={card.previous} comparable={comparable} />}
      <button
        type="button"
        aria-label={`Open the ${card.report} report`}
        onClick={() => onOpen(card.key)}
        className="tw:absolute tw:inset-0 tw:cursor-pointer tw:rounded-2xl tw:outline-none tw:focus-visible:ring-3 tw:focus-visible:ring-ring/50"
      />
    </div>
  );
}

/**
 * Headline numbers for the selected range, grouped as Money, People and Points. Each card compares with the
 * previous period of the same length and opens its report through `onOpen`. The Collections card shows only with
 * `finance.reports.view`, the same rule as its report.
 */
export function ReportsSummaryPanel({ onOpen }: { onOpen: (reportKey: ReportKey) => void }) {
  const range = useReportRange();
  const previous = previousPeriod(range);
  const sales = useSalesFigures(range);
  const customers = useCustomerGrowthFigures(range);
  const collections = useCollectionsFigures(range);
  const commissions = useCommissionFigures(range);
  const membership = useMembershipFigures(range);
  const stayPoints = useStayPointsFigures(range);
  const promoPoints = usePromoPointsFigures(range);
  const salesBefore = useSalesFigures(previous);
  const customersBefore = useCustomerGrowthFigures(previous);
  const collectionsBefore = useCollectionsFigures(previous);
  const commissionsBefore = useCommissionFigures(previous);
  const membershipBefore = useMembershipFigures(previous);
  const stayPointsBefore = useStayPointsFigures(previous);
  const promoPointsBefore = usePromoPointsFigures(previous);
  const fmt = (value: number) => value.toLocaleString("en-PH");

  const groups: { title: string; cards: SummaryCard[] }[] = [
    {
      title: "Money",
      cards: [
        { key: "sales", report: "Sales", label: "Sales", caption: "Sales closed in this period", value: <Money value={sales.confirmedInPeriod} />, current: sales.confirmedInPeriod, previous: salesBefore.confirmedInPeriod, icon: TrendingUp, tone: "brand", loading: sales.loading, error: sales.error },
        ...(collections.allowed
          ? [{ key: "collections" as const, report: "Collections", label: "Collections", caption: "Verified payments received", value: <Money value={collections.collected} />, current: collections.collected, previous: collectionsBefore.collected, icon: Wallet, tone: "success" as const, loading: collections.payments.isLoading, error: collections.payments.error }]
          : []),
        { key: "commissions", report: "Commissions", label: "Commissions", caption: "Commissions approved", value: <Money value={commissions.approvedInPeriod} />, current: commissions.approvedInPeriod, previous: commissionsBefore.approvedInPeriod, icon: BadgeCheck, tone: "brand", loading: commissions.commissions.isLoading, error: commissions.commissions.error },
      ],
    },
    {
      title: "People",
      cards: [
        { key: "customers", report: "Customers", label: "New customers", caption: "Customers added", value: fmt(customers.newCustomers), current: customers.newCustomers, previous: customersBefore.newCustomers, icon: UserPlus, tone: "success", loading: customers.customers.isLoading, error: customers.customers.error },
        { key: "membership", report: "Membership", label: "Memberships activated", caption: "Memberships started", value: fmt(membership.activatedInPeriod), current: membership.activatedInPeriod, previous: membershipBefore.activatedInPeriod, icon: UserCheck, tone: "success", loading: membership.memberships.isLoading, error: membership.memberships.error },
      ],
    },
    {
      title: "Points",
      cards: [
        { key: "stay-points", report: "Stay Points", label: "Stay points released", caption: "Points given to members", value: fmt(stayPoints.released), current: stayPoints.released, previous: stayPointsBefore.released, icon: TrendingUp, tone: "info", loading: stayPoints.points.isLoading, error: stayPoints.points.error },
        { key: "promo-points", report: "Promo Points", label: "Promo points earned", caption: "Points earned from promos", value: fmt(promoPoints.earned), current: promoPoints.earned, previous: promoPointsBefore.earned, icon: Gift, tone: "info", loading: promoPoints.ledger.isLoading, error: promoPoints.ledger.error },
      ],
    },
  ];

  return (
    <ReportFrame range={range}>
      <div className="report-print__hide">
        <FilterBar>{range.dateFields}</FilterBar>
      </div>
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`reports-summary-${group.title.toLowerCase()}`} className="tw:flex tw:flex-col tw:gap-3">
          <h2 id={`reports-summary-${group.title.toLowerCase()}`} className="tw:m-0 tw:text-sm tw:font-semibold tw:tracking-wide tw:text-muted-foreground tw:uppercase">{group.title}</h2>
          <div className="tw:grid tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
            {group.cards.map((card) => (
              <SummaryStatCard key={card.key} card={card} comparable={previous.comparable} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </ReportFrame>
  );
}
