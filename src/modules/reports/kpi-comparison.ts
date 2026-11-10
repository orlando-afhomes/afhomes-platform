import { addDaysToDate } from "@/shared/lib/dates";

/**
 * Dashboard KPI comparison policy (doc 11 section 32, owner decision 2026-11-10).
 * Only period KPIs are compared; snapshot KPIs never are, because no
 * effective-dated history exists and none may be fabricated.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function daysInclusive(from: string, to: string): number {
  const start = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const end = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * The immediately preceding period of equal length, as Asia/Manila date-only
 * values. Returns null for an invalid range.
 */
export function previousPeriod(from: string, to: string): { from: string; to: string } | null {
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to) || from > to) return null;
  const length = daysInclusive(from, to);
  const previousTo = addDaysToDate(from, -1);
  const previousFrom = addDaysToDate(from, -length);
  return previousFrom && previousTo ? { from: previousFrom, to: previousTo } : null;
}

export type KpiComparison =
  /** Change against a positive baseline. `percentTenths` is the signed change in tenths of a percent. */
  | { kind: "change"; percentTenths: number; direction: "up" | "down" | "flat" }
  /** No baseline, but activity now: shown as "New". */
  | { kind: "new" }
  /** No valid baseline and nothing meaningful to compare. */
  | { kind: "none" };

/**
 * Compares two integer amounts (centavos or counts). A percentage is only
 * calculated against a positive baseline; the rounding is display-only.
 */
export function compareKpi(current: number, previous: number): KpiComparison {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return { kind: "none" };
  if (previous > 0) {
    const percentTenths = Math.round(((current - previous) * 1000) / previous);
    return { kind: "change", percentTenths, direction: percentTenths > 0 ? "up" : percentTenths < 0 ? "down" : "flat" };
  }
  if (current > 0) return { kind: "new" };
  return { kind: "none" };
}

/** Display text for a change, for example "+12.5%", "-3%", "0%". */
export function formatChange(percentTenths: number): string {
  const sign = percentTenths > 0 ? "+" : percentTenths < 0 ? "-" : "";
  const value = (Math.abs(percentTenths) / 10).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${sign}${value}%`;
}
