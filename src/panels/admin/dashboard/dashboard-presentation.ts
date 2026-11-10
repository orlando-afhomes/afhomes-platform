import { BadgeCheck, FileSignature, HandCoins, IdCard, ReceiptText, UserPlus, type LucideIcon } from "lucide-react";
import type { DashboardActivityEntry } from "@/shared/components/dashboard/dashboard-activity-list";
import type { DistributionRow } from "@/shared/components/dashboard/dashboard-distribution-chart";
import type { DashboardTone } from "@/shared/components/dashboard/dashboard-layout";
import type { DashboardActivityItem, DashboardActivityKind, DashboardTierCode, TierDistributionRow } from "../dashboard-metrics";

const TIER_COLORS: Record<DashboardTierCode, string> = {
  B1: "var(--color-accent-strong)",
  S1: "var(--color-border-strong)",
  G1: "var(--color-accent-light)",
};

/** Chart colors from the brand tokens; every dashboard uses the same meaning for a color. */
export const SERIES_COLORS = {
  primary: "var(--color-brand-primary)",
  secondary: "var(--color-accent)",
  tertiary: "var(--color-info)",
} as const;

export function tierRows(rows: readonly TierDistributionRow[]): DistributionRow[] {
  return rows.map((row) => ({ key: row.code, label: row.label, detail: row.code, count: row.count, color: TIER_COLORS[row.code] }));
}

const ACTIVITY_PRESENTATION: Record<DashboardActivityKind, { icon: LucideIcon; tone: DashboardTone }> = {
  customer: { icon: UserPlus, tone: "info" },
  contract: { icon: FileSignature, tone: "brand" },
  sale: { icon: BadgeCheck, tone: "soft" },
  payment: { icon: ReceiptText, tone: "accent" },
  membership: { icon: IdCard, tone: "soft" },
  commission: { icon: HandCoins, tone: "accent" },
};

export function toActivityEntries(items: readonly DashboardActivityItem[]): DashboardActivityEntry[] {
  return items.map((item) => ({ id: item.id, label: item.label, reference: item.reference, timestamp: item.timestamp, ...ACTIVITY_PRESENTATION[item.kind] }));
}

/** Labels a period KPI with the selected range, or says the range is invalid. */
export function periodScope(range: { label: string; valid: boolean }) {
  return range.valid ? range.label : "Invalid date range";
}

export const CURRENT_SCOPE = "Current";
