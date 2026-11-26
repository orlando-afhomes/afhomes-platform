import type { AllowanceReview } from "@/modules/commissions/allowances";
import type { OrgMember } from "@/modules/organization/types";
import {
  latestEntry,
  MEASURE_LABELS,
  RECONCILIATION_MEASURES,
  type ReconciliationEntry,
  type SourceTotal,
} from "@/modules/reconciliation/rules";
import { isSeatVacantOn, type SeatVacancy } from "@/modules/sales-network/vacancy";

/**
 * Parallel-run switch sign-off (doc 08 section 16, doc 11 section 26; F11.5).
 * The Super Administrator signs off only after a month closes with no
 * unexplained differences. Differences are checked, never edited, here:
 * every reconciliation measure for the month must have a current check
 * (a match or an explained difference), and every Internal Seller leader in
 * post that month must have a saved allowance review carrying the
 * company-spreadsheet figures, with any platform difference explained.
 * Explained differences do not block the switch; unchecked or unexplained
 * ones do. The repository records the sign-off and the audit event.
 */

export type MonthSwitchSignOff = {
  id: string;
  /** Closed month as YYYY-MM. */
  month: string;
  actorId: string;
  recordedAt: string;
  /** Measures checked and leaders reviewed at sign-off time. */
  checkedMeasures: number;
  checkedLeaders: number;
};

export type MonthSwitchStatus = {
  month: string;
  closed: boolean;
  signOff: MonthSwitchSignOff | null;
  unexplained: string[];
  ready: boolean;
  /** Measures checked and leaders reviewed at status time. */
  checkedMeasures: number;
  checkedLeaders: number;
};

export type SwitchCheckData = {
  totals: readonly SourceTotal[];
  entries: readonly ReconciliationEntry[];
  reviews: readonly AllowanceReview[];
  members: readonly Pick<OrgMember, "id" | "displayName" | "designation">[];
  vacancies: readonly SeatVacancy[];
  month: string;
};

/** Days of the month a seat was not vacant. */
function eligibleDays(vacancies: readonly SeatVacancy[], memberId: string, month: string, daysInMonth: number): number {
  let days = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    if (!isSeatVacantOn(vacancies, memberId, `${month}-${String(day).padStart(2, "0")}`)) days += 1;
  }
  return days;
}

const LEADER_DESIGNATIONS: ReadonlySet<string> = new Set(["SM", "SSM", "SVD"]);

function daysInMonthOf(month: string): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
}

/** The leader seats the switch must find a review for: leaders in post that month, a seat vacant all month excluded. */
export function leadersInPostForSwitch(
  members: readonly Pick<OrgMember, "id" | "displayName" | "designation">[],
  vacancies: readonly SeatVacancy[],
  month: string,
): Array<Pick<OrgMember, "id" | "displayName" | "designation">> {
  const daysInMonth = daysInMonthOf(month);
  return members.filter((member) => LEADER_DESIGNATIONS.has(member.designation) && eligibleDays(vacancies, member.id, month, daysInMonth) > 0);
}

/**
 * Every unexplained difference blocking the switch for a closed month.
 * Empty means the month is ready for the Super Administrator sign-off.
 */
export function checkMonthSwitchReady(input: SwitchCheckData): string[] {
  const { totals, entries, reviews, members, vacancies, month } = input;
  const unexplained: string[] = [];

  for (const measure of RECONCILIATION_MEASURES) {
    const total = totals.find((item) => item.measure === measure);
    const entry = latestEntry(entries, month, measure);
    if (!entry) {
      unexplained.push(`No company-spreadsheet check for ${MEASURE_LABELS[measure]}.`);
      continue;
    }
    if (!total || entry.liveCentavos !== total.totalCentavos) {
      unexplained.push(`${MEASURE_LABELS[measure]} changed since the check. Record it again.`);
    }
  }

  for (const member of leadersInPostForSwitch(members, vacancies, month)) {
    const review = [...reviews].reverse().find((item) => item.month === month && item.memberId === member.id);
    if (!review) {
      unexplained.push(`No allowance review for ${member.displayName}.`);
      continue;
    }
    if (!review.workbook) {
      unexplained.push(`No company-spreadsheet figures for ${member.displayName}.`);
      continue;
    }
    const differs = review.result.baCentavos !== review.workbook.baCentavos ||
      review.result.paCentavos !== review.workbook.paCentavos ||
      review.result.pbCentavos !== review.workbook.pbCentavos;
    if (differs && !review.workbookDifferenceReason) {
      unexplained.push(`Unexplained allowance difference for ${member.displayName}.`);
    }
  }

  return unexplained;
}
