import type { BenefitsSnapshot } from "@/modules/contracts/types";
import { addYearsToDate } from "@/shared/lib/dates";
import type { CycleSummary, PointsEntry, PointsLedger, ResortSpend } from "./types";

const WEEKDAY_SHARE = 70;
const WEEKEND_SHARE = 30;

/**
 * Computes the Stay Points ledger from verified resort spend (doc 09).
 * 1 verified peso = 1 point (09 section 10). Every transaction splits 70% Weekday and
 * 30% Weekend regardless of its date (09 section 14). Points stay Pending until the cycle
 * minimum is reached, then unlock (09 section 12). Caps apply per bucket and in total
 * (09 sections 13-14). Fractional pesos or fractional splits are never rounded: no
 * rounding policy is approved (D14), so those entries are blocked.
 */
export function computePointsLedger(activationDate: string, benefits: BenefitsSnapshot, spends: readonly ResortSpend[]): PointsLedger {
  const sorted = [...spends].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)));
  const entries: PointsEntry[] = [];
  const cycles: CycleSummary[] = [];
  const weekdayCap = benefits.weekdayPointsPerCycle;
  const weekendCap = benefits.weekendPointsPerCycle;
  const totalCap = benefits.pointsPerCycle;

  const cycleOf = (date: string): number => {
    for (let n = 1; n <= benefits.earningCycles; n += 1) {
      const start = addYearsToDate(activationDate, n - 1);
      const end = addYearsToDate(activationDate, n);
      if (start && end && date >= start && date < end) return n;
    }
    return 0;
  };

  const state = new Map<number, { spend: number; wd: number; we: number; unlocked: boolean }>();
  const byCycle = new Map<number, PointsEntry[]>();

  for (const spend of sorted) {
    const cycle = cycleOf(spend.date);
    const base = { spendId: spend.id, date: spend.date, cycle, earnedWeekday: 0, earnedWeekend: 0, cappedExcess: 0 };
    if (cycle === 0) {
      entries.push({ ...base, status: "outside_cycles", note: "Outside the earning cycles of this membership." });
      continue;
    }
    if (spend.amountCentavos % 100 !== 0) {
      entries.push({ ...base, status: "blocked_rounding", note: "Fractional pesos need an approved rounding policy." });
      continue;
    }
    const points = spend.amountCentavos / 100;
    if ((points * WEEKDAY_SHARE) % 100 !== 0 || (points * WEEKEND_SHARE) % 100 !== 0) {
      entries.push({ ...base, status: "blocked_rounding", note: "The 70/30 split is not a whole number of points; a rounding policy is not approved." });
      continue;
    }
    const cs = state.get(cycle) ?? { spend: 0, wd: 0, we: 0, unlocked: false };
    state.set(cycle, cs);
    cs.spend += spend.amountCentavos;
    const wantWd = (points * WEEKDAY_SHARE) / 100;
    const wantWe = (points * WEEKEND_SHARE) / 100;
    const creditWd = Math.max(0, Math.min(wantWd, weekdayCap - cs.wd, totalCap - cs.wd - cs.we));
    const creditWe = Math.max(0, Math.min(wantWe, weekendCap - cs.we, totalCap - cs.wd - cs.we - creditWd));
    cs.wd += creditWd;
    cs.we += creditWe;
    if (cs.spend >= benefits.minSpendPerCycleCentavos) cs.unlocked = true;
    const excess = wantWd - creditWd + (wantWe - creditWe);
    const entry: PointsEntry = {
      ...base,
      status: spend.status === "refund_hold" ? "held" : spend.status === "voided" ? "voided" : "pending",
      earnedWeekday: creditWd,
      earnedWeekend: creditWe,
      cappedExcess: excess,
      note: excess > 0 ? "Part of this spend exceeded the cycle cap." : null,
    };
    entries.push(entry);
    const list = byCycle.get(cycle) ?? [];
    list.push(entry);
    byCycle.set(cycle, list);
  }

  // Unlock pending entries of cycles that reached the minimum.
  for (const [cycle, list] of byCycle) {
    if (state.get(cycle)?.unlocked) for (const entry of list) if (entry.status === "pending") entry.status = "spendable";
  }

  for (const [cycle, cs] of [...state.entries()].sort((a, b) => a[0] - b[0])) {
    cycles.push({
      cycle,
      startDate: addYearsToDate(activationDate, cycle - 1) ?? "",
      endDate: addYearsToDate(activationDate, cycle) ?? "",
      verifiedSpendCentavos: cs.spend,
      minimumSpendCentavos: benefits.minSpendPerCycleCentavos,
      minimumReached: cs.unlocked,
      weekdayCredited: cs.wd,
      weekendCredited: cs.we,
      weekdayCap,
      weekendCap,
      totalCap,
    });
  }

  let spendableWeekday = 0;
  let spendableWeekend = 0;
  let pending = 0;
  let held = 0;
  for (const entry of entries) {
    const sum = entry.earnedWeekday + entry.earnedWeekend;
    if (entry.status === "spendable") {
      spendableWeekday += entry.earnedWeekday;
      spendableWeekend += entry.earnedWeekend;
    } else if (entry.status === "pending") pending += sum;
    else if (entry.status === "held") held += sum;
  }
  const latest = cycles.length ? cycles[cycles.length - 1] : null;
  const remainingCapacity = latest ? totalCap - latest.weekdayCredited - latest.weekendCredited : totalCap;
  return { entries, cycles, balances: { spendableWeekday, spendableWeekend, pending, held, redeemed: 0, remainingCapacity } };
}
