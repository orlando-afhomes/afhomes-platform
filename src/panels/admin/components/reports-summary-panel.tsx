"use client";

import type { ReactNode } from "react";
import { ArrowRight, BadgeCheck, Gift, TrendingUp, UserCheck, UserPlus, Wallet, type LucideIcon } from "lucide-react";
import { FilterBar } from "@/shared/components/modern/filter-bar";
import { KpiDelta } from "@/shared/components/dashboard/kpi-delta";
import { Money } from "@/shared/components/modern/money";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import { manilaDateOf } from "@/shared/lib/dates";
import { formatPeso } from "@/shared/lib/money";
import { OPEN_FROM, OPEN_TO, ReportExport, ReportFrame, useReportRange, type ReportColumn, type ReportRange } from "./report-shell";
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

const ICON_TONE: Record<CardTone, string> = {
  brand: "tw:text-primary",
  success: "tw:text-(--color-success-strong)",
  info: "tw:text-info",
};

type SummaryCard = {
  key: ReportKey;
  /** Name of the report, used for the accessible "Open the ... report" button. */
  report: string;
  label: string;
  caption: string;
  value: ReactNode;
  /** The same figure as plain text for the PDF export. */
  plain: string;
  current: number;
  previous: number;
  icon: LucideIcon;
  tone: CardTone;
  loading: boolean;
  error: unknown;
};

type SummaryRow = { group: string; measure: string; value: string; comparison: string };

const SUMMARY_COLUMNS: ReportColumn<SummaryRow>[] = [
  { header: "Group", value: (row) => row.group },
  { header: "Measure", value: (row) => row.measure },
  { header: "Value", value: (row) => row.value },
  { header: "Compared with Previous Period", value: (row) => row.comparison },
];

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

/** Direction, KpiDelta wording and a plain sentence for the PDF. Null when there is nothing to compare. */
function comparisonParts(current: number, previous: number, comparable: boolean) {
  if (!comparable || previous <= 0) return null;
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  const formattedPercent = percent.toLocaleString("en-PH");
  const unchanged = current === previous;
  const up = current > previous;
  return {
    unchanged,
    up,
    value: unchanged ? "No Change" : `${up ? "+" : "−"}${formattedPercent}%`,
    label: unchanged ? "No change" : `${up ? "Up" : "Down"} ${formattedPercent}%`,
  };
}

function comparisonText(current: number, previous: number, comparable: boolean): string {
  return comparisonParts(current, previous, comparable)?.label ?? "No comparison available";
}

/** Compare the selected period with the immediately preceding period of the same length. */
function Comparison({ current, previous, comparable }: { current: number; previous: number; comparable: boolean }) {
  const parts = comparisonParts(current, previous, comparable);
  if (!parts) {
    return <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">No comparison available</p>;
  }
  return (
    <p className="tw:m-0 tw:flex tw:flex-wrap tw:items-center tw:gap-x-2 tw:gap-y-1 tw:text-xs tw:text-muted-foreground">
      <KpiDelta direction={parts.unchanged ? "flat" : parts.up ? "up" : "down"}
        value={parts.value}
        label={parts.label} />
      <span>vs. previous period</span>
    </p>
  );
}

function SummaryStatCard({ card, comparable, onOpen }: { card: SummaryCard; comparable: boolean; onOpen: (reportKey: ReportKey) => void }) {
  const Icon = card.icon;
  return (
    <div className="reports-summary__card tw:group tw:relative tw:flex tw:min-w-0 tw:flex-col tw:overflow-hidden tw:rounded-2xl tw:border tw:border-border tw:bg-card tw:text-card-foreground tw:transition-colors tw:hover:border-primary/40 tw:focus-within:border-ring tw:motion-reduce:transition-none">
      <div className="tw:flex tw:items-center tw:gap-2.5 tw:px-4 tw:pt-4 tw:sm:px-5 tw:sm:pt-5">
        <Icon aria-hidden="true" className={cn("tw:size-4.5 tw:shrink-0", ICON_TONE[card.tone])} strokeWidth={1.75} />
        <span className="tw:min-w-0 tw:flex-1 tw:text-sm tw:font-semibold">{card.label}</span>
        <span aria-hidden="true" className="report-print__hide tw:flex tw:size-8 tw:shrink-0 tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-border tw:bg-(--color-bg-subtle) tw:text-muted-foreground tw:transition-colors tw:group-hover:border-primary/25 tw:group-hover:text-primary">
          <ArrowRight className="tw:size-4" />
        </span>
      </div>
      <div className="tw:flex tw:flex-1 tw:flex-col tw:gap-1.5 tw:px-4 tw:pt-3 tw:pb-4 tw:sm:px-5">
        {card.loading ? (
          <Skeleton className="tw:h-8 tw:w-28 tw:max-w-full" />
        ) : card.error ? (
          <p className="tw:m-0 tw:text-base tw:font-medium tw:text-muted-foreground">Unavailable</p>
        ) : (
          <p className="tw:m-0 tw:text-3xl tw:leading-tight tw:font-bold tw:tracking-tight tw:tabular-nums tw:wrap-anywhere">{card.value}</p>
        )}
        <p className="tw:m-0 tw:text-xs tw:text-muted-foreground">{card.caption}</p>
      </div>
      <div className="tw:flex tw:min-h-11 tw:items-center tw:border-t tw:border-border tw:bg-(--color-bg-subtle) tw:px-4 tw:py-2 tw:sm:px-5">
        {card.loading ? <Skeleton className="tw:h-5 tw:w-36" /> : card.error ? null : <Comparison current={card.current} previous={card.previous} comparable={comparable} />}
      </div>
      <button
        type="button"
        aria-label={`Open the ${card.report} report`}
        onClick={() => onOpen(card.key)}
        className="tw:absolute tw:inset-0 tw:cursor-pointer tw:rounded-2xl tw:outline-none tw:focus-visible:ring-2 tw:focus-visible:ring-ring tw:focus-visible:ring-inset"
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
        { key: "sales", report: "Sales", label: "Sales", caption: "Sales closed in this period", value: <Money value={sales.confirmedInPeriod} />, plain: formatPeso(sales.confirmedInPeriod), current: sales.confirmedInPeriod, previous: salesBefore.confirmedInPeriod, icon: TrendingUp, tone: "brand", loading: sales.loading, error: sales.error },
        ...(collections.allowed
          ? [{ key: "collections" as const, report: "Collections", label: "Collections", caption: "Verified payments received", value: <Money value={collections.collected} />, plain: formatPeso(collections.collected), current: collections.collected, previous: collectionsBefore.collected, icon: Wallet, tone: "success" as const, loading: collections.payments.isLoading, error: collections.payments.error }]
          : []),
        { key: "commissions", report: "Commissions", label: "Commissions", caption: "Commissions approved", value: <Money value={commissions.approvedInPeriod} />, plain: formatPeso(commissions.approvedInPeriod), current: commissions.approvedInPeriod, previous: commissionsBefore.approvedInPeriod, icon: BadgeCheck, tone: "brand", loading: commissions.commissions.isLoading, error: commissions.commissions.error },
      ],
    },
    {
      title: "People",
      cards: [
        { key: "customers", report: "Customers", label: "New Customers", caption: "Customers added", value: fmt(customers.newCustomers), plain: fmt(customers.newCustomers), current: customers.newCustomers, previous: customersBefore.newCustomers, icon: UserPlus, tone: "success", loading: customers.customers.isLoading, error: customers.customers.error },
        { key: "membership", report: "Membership", label: "Memberships Activated", caption: "Memberships started", value: fmt(membership.activatedInPeriod), plain: fmt(membership.activatedInPeriod), current: membership.activatedInPeriod, previous: membershipBefore.activatedInPeriod, icon: UserCheck, tone: "success", loading: membership.memberships.isLoading, error: membership.memberships.error },
      ],
    },
    {
      title: "Points",
      cards: [
        { key: "stay-points", report: "Stay Points", label: "Stay Points Released", caption: "Points given to members", value: fmt(stayPoints.released), plain: fmt(stayPoints.released), current: stayPoints.released, previous: stayPointsBefore.released, icon: TrendingUp, tone: "info", loading: stayPoints.points.isLoading, error: stayPoints.points.error },
        { key: "promo-points", report: "Promo Points", label: "Promo Points Earned", caption: "Points earned from promos", value: fmt(promoPoints.earned), plain: fmt(promoPoints.earned), current: promoPoints.earned, previous: promoPointsBefore.earned, icon: Gift, tone: "info", loading: promoPoints.ledger.isLoading, error: promoPoints.ledger.error },
      ],
    },
  ];

  // The PDF carries the same figures and comparisons the cards show for this identity.
  const exportRows: SummaryRow[] = groups.flatMap((group) =>
    group.cards.map((card) => ({
      group: group.title,
      measure: card.label,
      value: card.error ? "Unavailable" : card.plain,
      comparison: card.error ? "No comparison available" : comparisonText(card.current, card.previous, previous.comparable),
    })),
  );
  const loading = groups.some((group) => group.cards.some((card) => card.loading));

  return (
    <ReportFrame range={range}>
      <div className="report-print__hide">
        <FilterBar>
          {range.dateFields}
          <ReportExport report="Reports Summary" fileName="reports-summary" columns={SUMMARY_COLUMNS} rows={exportRows} range={range} pdfOnly printable={false} disabled={loading} />
        </FilterBar>
      </div>
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`reports-summary-${group.title.toLowerCase()}`} className="tw:flex tw:flex-col tw:gap-3">
          <h2 id={`reports-summary-${group.title.toLowerCase()}`} className="tw:m-0 tw:text-sm tw:font-semibold tw:text-muted-foreground">{group.title}</h2>
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
