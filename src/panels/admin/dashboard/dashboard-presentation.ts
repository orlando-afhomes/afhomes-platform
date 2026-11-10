import { BadgeCheck, FileSignature, HandCoins, IdCard, ReceiptText, UserPlus, type LucideIcon } from "lucide-react";
import { compareKpi, previousPeriod } from "@/modules/reports/kpi-comparison";
import type { DashboardActivityEntry } from "@/shared/components/dashboard/dashboard-activity-list";
import type { DistributionRow } from "@/shared/components/dashboard/dashboard-distribution-chart";
import type { DashboardKpiTrend } from "@/shared/components/dashboard/dashboard-kpi";
import type { DashboardTone } from "@/shared/components/dashboard/dashboard-layout";
import { formatDate } from "@/shared/lib/format-date";
import { DASHBOARD_TIERS, type DashboardActivityItem, type DashboardActivityKind, type DashboardTierCode, type TierDistributionRow } from "../dashboard-metrics";

/**
 * Each tier uses its own metal: warm saturated gold, cool neutral silver, and
 * deep copper-brown bronze. Labels and shares always accompany the color.
 */
export const TIER_COLORS: Record<DashboardTierCode, string> = {
  G1: "var(--color-tier-gold)",
  S1: "var(--color-tier-silver)",
  B1: "var(--color-tier-bronze)",
};

/** Chart colors from the brand tokens; every dashboard uses the same meaning for a color. */
export const SERIES_COLORS = {
  primary: "var(--color-brand-primary)",
  secondary: "var(--color-accent)",
  tertiary: "var(--color-info)",
} as const;

/** Legend rows, highest tier first as in the dashboard design. */
export function tierRows(rows: readonly TierDistributionRow[]): DistributionRow[] {
  return [...rows]
    .reverse()
    .map((row) => ({ key: row.code, label: `VIP ${row.label}`, count: row.count, color: TIER_COLORS[row.code] }));
}

const ACTIVITY_PRESENTATION: Record<DashboardActivityKind, { icon: LucideIcon; tone: DashboardTone; noun: string }> = {
  customer: { icon: UserPlus, tone: "brand", noun: "Customer" },
  contract: { icon: FileSignature, tone: "accent", noun: "Contract" },
  sale: { icon: BadgeCheck, tone: "brand", noun: "Sale" },
  payment: { icon: ReceiptText, tone: "info", noun: "Payment" },
  membership: { icon: IdCard, tone: "violet", noun: "Membership" },
  commission: { icon: HandCoins, tone: "accent", noun: "Commission" },
};

function tierName(code: string | undefined) {
  const tier = DASHBOARD_TIERS.find((item) => item.code === code);
  return tier ? `VIP ${tier.label}` : null;
}

/** Builds each row's sentence from the record reference and tier only; no customer details. */
export function toActivityEntries(items: readonly DashboardActivityItem[]): DashboardActivityEntry[] {
  return items.map((item) => {
    const { icon, tone, noun } = ACTIVITY_PRESENTATION[item.kind];
    const tier = tierName(item.productCode);
    return {
      id: item.id,
      label: item.label,
      description: `${noun} ${item.reference}${tier ? ` for ${tier}` : ""}.`,
      timestamp: item.timestamp,
      icon,
      tone,
    };
  });
}

/** Labels a period KPI with the selected range, or says the range is invalid. */
export function periodScope(range: { label: string; valid: boolean }) {
  return range.valid ? range.label : "Invalid date range";
}

export const CURRENT_SCOPE = "Current";

/**
 * Comparison of a period KPI with the immediately preceding period of equal
 * length (doc 11 section 32). `measure` must be the same centralized
 * calculation used for the KPI value.
 */
export function periodTrend(
  range: { from: string; to: string; valid: boolean },
  measure: (from: string, to: string) => number,
): DashboardKpiTrend | undefined {
  if (!range.valid) return undefined;
  const previous = previousPeriod(range.from, range.to);
  if (!previous) return undefined;
  return {
    result: compareKpi(measure(range.from, range.to), measure(previous.from, previous.to)),
    previousLabel: `${formatDate(previous.from)} to ${formatDate(previous.to)}`,
  };
}
