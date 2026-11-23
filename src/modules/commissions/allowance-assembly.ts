import { approvedCollectionMilestone, periodCollections } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import type { IgpSale } from "@/modules/igp/types";
import type { OrgMember } from "@/modules/organization/types";
import type { Sale } from "@/modules/sales/types";
import { VIP_CLOSED_DEAL_THRESHOLD_BP } from "@/modules/sales/rules";
import { isSeatVacantOn, type SeatVacancy } from "@/modules/sales-network/vacancy";

/**
 * Assembly of BA, PA and PB review inputs from a month's business data
 * (doc 08 section 15; F8.6). The assembled month figures feed the allowance
 * review form; the existing `calculateAllowances` builder still computes the
 * allowances and the saved review keeps the company-spreadsheet comparison.
 *
 * Faithful readings applied here, each quoted from doc 08:
 * - A sale counts only once it is a Closed Deal: VIP at 25% collected, IGP at
 *   10%, each at the threshold frozen on the sale (section 15.2).
 * - A sale counts in a leader's own figures when the leader is its seller or
 *   its referrer, and in Team Closed Deal TCP once for every leader strictly
 *   above either of them (OCT I1). The team rule runs on both legs, so a sale
 *   a leader closed can still appear in their team figure through the
 *   referrer leg; each sale counts once per leader.
 * - Team credit follows the current upline chain when the month is built
 *   (AUG R23, OCT I4); a vacant seat earns nothing and its downline rolls up
 *   to the next active level (AUG R1).
 * - Collections are verified receipts on those Closed Deal sales, counted in
 *   the month by accounting date.
 *
 * Genuinely undecided inputs the platform holds no source records for, so the
 * reviewer still supplies them and they are listed on every assembled row:
 * the Qualifying/Extended stretch split (AUG R11 states the split but no
 * boundary rule is on record), assumed collection credit (VIP 40%, IGP 20%;
 * no inherited-account records exist), the appointment-to-post filter
 * (OCT I2; members carry no appointment dates), the in-window test (OCT I3;
 * no window definition is on record), and engagement-end or suspension dates
 * (section 15.5, OCT I9; members carry only a current status).
 */

export type AllowanceAssemblyData = {
  members: readonly OrgMember[];
  vacancies: readonly SeatVacancy[];
  /** VIP sales. Closed Deal is tested at the threshold frozen on each sale. */
  sales: readonly Sale[];
  /** IGP sales. A set closedDealDate is the Closed Deal (10% at the frozen threshold). */
  igpSales: readonly IgpSale[];
  /** Both VIP payments (contractId = contract) and IGP payments (contractId = sale). */
  payments: readonly Payment[];
};

export type LeaderAllowanceAssembly = {
  memberId: string;
  memberName: string;
  position: "SM" | "SSM" | "SVD";
  /** Days in the month the seat was not vacant. A wholly vacant seat earns nothing (doc 08 section 15.2). */
  eligibleDays: number;
  vacantWholeMonth: boolean;
  /** Closed Deal TCP and month collections on sales the leader closed or referred (OCT I1, own figures). */
  ownTcpCentavos: number;
  ownCollectionsCentavos: number;
  /** Closed Deal TCP and month collections for every leader strictly above the seller or referrer (OCT I1). */
  teamTcpCentavos: number;
  teamCollectionsCentavos: number;
  /** Always zero: assumed credit has no source records, so the reviewer enters it. */
  assumedCreditCentavos: number;
  /** Rule inputs the reviewer must still supply or confirm, with the reason. */
  unapplied: string[];
};

export type AllowanceAssembly = {
  month: string;
  daysInMonth: number;
  leaders: LeaderAllowanceAssembly[];
};

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

const UNAPPLIED_ALL = [
  "Split the month figures into the Qualifying and Extended stretches (AUG R11 states the split but no boundary rule is on record).",
  "Enter assumed collection credit (VIP 40%, IGP 20% on inherited or rolled-up accounts): no inherited-account records exist.",
  "Confirm the appointment-to-post filter (OCT I2): members carry no appointment dates.",
  "Confirm engagement-end and suspension limits (doc 08 section 15.5): members carry only a current status.",
];

type CountedSale = {
  tcpCentavos: number;
  parties: string[];
  collectionsCentavos: number;
};

function daysInMonthOf(month: string): number | null {
  const match = MONTH_PATTERN.exec(month);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();
}

/** Leaders strictly above a member on the current upline chain, skipping vacant seats (AUG R23, AUG R1). */
function uplineLeaders(
  memberId: string,
  members: readonly OrgMember[],
  vacancies: AllowanceAssemblyData["vacancies"],
  monthEnd: string,
): string[] {
  const byId = new Map(members.map((item) => [item.id, item]));
  const leaders: string[] = [];
  const visited = new Set<string>([memberId]);
  let current = byId.get(memberId);
  for (let depth = 0; depth < 32 && current?.parentId; depth += 1) {
    const parent = byId.get(current.parentId);
    if (!parent || visited.has(parent.id)) break;
    visited.add(parent.id);
    if ((parent.designation === "SM" || parent.designation === "SSM" || parent.designation === "SVD") &&
      !isSeatVacantOn(vacancies, parent.id, monthEnd)) {
      leaders.push(parent.id);
    }
    current = parent;
  }
  return leaders;
}

/** Net verified collections on one sale's payments counted inside the month (existing periodCollections builder). */
function monthCollections(payments: readonly Payment[], from: string, to: string): number {
  return periodCollections(payments, from, to).net;
}

export function assembleAllowanceInputs(data: AllowanceAssemblyData, month: string): AllowanceAssembly {
  const daysInMonth = daysInMonthOf(month);
  if (daysInMonth === null) throw new Error("Enter a valid month.");
  const from = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const paymentsByContract = new Map<string, Payment[]>();
  for (const payment of data.payments) {
    const list = paymentsByContract.get(payment.contractId) ?? [];
    list.push(payment);
    paymentsByContract.set(payment.contractId, list);
  }

  // Closed Deal sales whose Closed Deal date falls in the month (doc 08 section 15.2).
  const counted: CountedSale[] = [];
  for (const sale of data.sales) {
    if (sale.status !== "confirmed") continue;
    const milestone = approvedCollectionMilestone(
      sale.valueCentavos, paymentsByContract.get(sale.contractId) ?? [], sale.closedDealThresholdBp ?? VIP_CLOSED_DEAL_THRESHOLD_BP,
    );
    if (!milestone || milestone.countedDate < from || milestone.countedDate > monthEnd) continue;
    const parties = [sale.sellerMemberId, sale.referrerMemberId].filter((id): id is string => Boolean(id));
    if (parties.length === 0) continue;
    counted.push({
      tcpCentavos: sale.valueCentavos,
      parties,
      collectionsCentavos: monthCollections(paymentsByContract.get(sale.contractId) ?? [], from, monthEnd),
    });
  }
  for (const sale of data.igpSales) {
    if (sale.status !== "approved" || !sale.closedDealDate || sale.closedDealDate < from || sale.closedDealDate > monthEnd) continue;
    const parties = [sale.sellerMemberId, sale.referrerMemberId].filter((id): id is string => Boolean(id));
    if (parties.length === 0) continue;
    counted.push({
      tcpCentavos: sale.priceCentavos,
      parties,
      collectionsCentavos: monthCollections(paymentsByContract.get(sale.id) ?? [], from, monthEnd),
    });
  }

  const leaders = data.members
    .filter((member): member is OrgMember & { designation: "SM" | "SSM" | "SVD" } =>
      member.designation === "SM" || member.designation === "SSM" || member.designation === "SVD")
    .map((leader) => {
      let eligibleDays = 0;
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = `${month}-${String(day).padStart(2, "0")}`;
        if (!isSeatVacantOn(data.vacancies, leader.id, date)) eligibleDays += 1;
      }
      const assembly: LeaderAllowanceAssembly = {
        memberId: leader.id,
        memberName: leader.displayName,
        position: leader.designation,
        eligibleDays,
        vacantWholeMonth: eligibleDays === 0,
        ownTcpCentavos: 0,
        ownCollectionsCentavos: 0,
        teamTcpCentavos: 0,
        teamCollectionsCentavos: 0,
        assumedCreditCentavos: 0,
        unapplied: [...UNAPPLIED_ALL],
      };
      if (assembly.vacantWholeMonth) {
        assembly.unapplied.unshift("Seat vacant the whole month: earns no allowance (doc 08 section 15.2).");
        return assembly;
      }
      const own = new Set<string>();
      const team = new Set<string>();
      for (let index = 0; index < counted.length; index += 1) {
        const sale = counted[index];
        if (sale.parties.includes(leader.id)) own.add(`${index}`);
        for (const party of sale.parties) {
          if (uplineLeaders(party, data.members, data.vacancies, monthEnd).includes(leader.id)) team.add(`${index}`);
        }
      }
      for (const key of own) {
        assembly.ownTcpCentavos += counted[Number(key)].tcpCentavos;
        assembly.ownCollectionsCentavos += counted[Number(key)].collectionsCentavos;
      }
      for (const key of team) {
        assembly.teamTcpCentavos += counted[Number(key)].tcpCentavos;
        assembly.teamCollectionsCentavos += counted[Number(key)].collectionsCentavos;
      }
      return assembly;
    });

  return { month, daysInMonth, leaders };
}
