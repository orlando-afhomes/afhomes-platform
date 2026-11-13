import type { OrgMember } from "@/modules/organization/types";
import { formatManilaDateParts, parseManilaDateOnly } from "@/modules/accreditation/dates";

/**
 * Effective-dated vacant leader seat (doc 02 section 5.1.1, AUG R1, R3, R23; owner ruling R3).
 * The seat stays where it is in the genealogy: nobody is moved. A vacancy only changes how the
 * seat is treated on a given date, so earlier periods are never rewritten. There is no Acting
 * or temporary leader (owner answer A5): a seat is filled only by promotion or team transfer.
 */
export type SeatFillMethod = "promotion" | "transfer";

export type SeatVacancy = {
  id: string;
  /** The member node of the leader seat (SVD, SSM or SM) whose holder left. */
  seatMemberId: string;
  /** Date-only. Last day of the departed holder. */
  holderEndDate: string;
  /** Date-only. The day after the holder's end date. */
  startDate: string;
  /** Date-only. The roll-up ends from this date; null while the seat is vacant. */
  filledOn: string | null;
  filledMethod: SeatFillMethod | null;
  /** The member who promoted or transferred into the seat. */
  filledByMemberId: string | null;
  recordedBy: string;
  recordedAt: string;
};

/** The vacancy starts the day after the holder's end date. Returns the input unchanged if it is not a valid date. */
export function vacancyStartDate(holderEndDate: string): string {
  const parts = parseManilaDateOnly(holderEndDate);
  if (!parts) return holderEndDate;
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return formatManilaDateParts({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

function isVacantAt(vacancy: SeatVacancy, onDate: string): boolean {
  return onDate >= vacancy.startDate && (vacancy.filledOn === null || onDate < vacancy.filledOn);
}

export function isSeatVacantOn(vacancies: readonly SeatVacancy[], seatMemberId: string, onDate: string): boolean {
  return vacancies.some((vacancy) => vacancy.seatMemberId === seatMemberId && isVacantAt(vacancy, onDate));
}

/** The seat's unfilled vacancy, if any (for the "Vacant since" indicator). */
export function findOpenVacancy(vacancies: readonly SeatVacancy[], seatMemberId: string): SeatVacancy | null {
  return vacancies.find((vacancy) => vacancy.seatMemberId === seatMemberId && vacancy.filledOn === null) ?? null;
}

/** Seat member id to its open vacancy's start date, for read-only "Vacant since" indicators. */
export function openVacancyStartByMember(vacancies: readonly SeatVacancy[]): Map<string, string> {
  return new Map(vacancies.filter((vacancy) => vacancy.filledOn === null).map((vacancy) => [vacancy.seatMemberId, vacancy.startDate]));
}

/** A vacant seat earns no allowance for the vacancy period. Flag only: allowances are not built yet. */
export function seatEarnsAllowanceOn(vacancies: readonly SeatVacancy[], seatMemberId: string, onDate: string): boolean {
  return !isSeatVacantOn(vacancies, seatMemberId, onDate);
}

/** Upper bound on genealogy hops; protects against malformed data. */
const MAX_DEPTH = 32;

/**
 * The next active level above a member on a date: the nearest ancestor whose seat is not vacant.
 * Null at the top of the tree, where a vacant seat's stream earns nothing for the vacancy period.
 */
export function getEffectiveParentId(
  memberId: string,
  members: readonly OrgMember[],
  vacancies: readonly SeatVacancy[],
  onDate: string,
): string | null {
  const byId = new Map(members.map((item) => [item.id, item]));
  const visited = new Set<string>([memberId]);
  let current = byId.get(memberId);
  for (let depth = 0; current?.parentId && depth < MAX_DEPTH; depth += 1) {
    const parent = byId.get(current.parentId);
    if (!parent || visited.has(parent.id)) return null;
    visited.add(parent.id);
    if (!isSeatVacantOn(vacancies, parent.id, onDate)) return parent.id;
    current = parent;
  }
  return null;
}

/** Members credited directly to a leader on a date: its children, with vacant children replaced by their own (recursively). */
export function getEffectiveChildIds(
  leaderId: string,
  members: readonly OrgMember[],
  vacancies: readonly SeatVacancy[],
  onDate: string,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>([leaderId]);
  const walk = (parentId: string, depth: number) => {
    if (depth > MAX_DEPTH) return;
    for (const child of members) {
      if (child.parentId !== parentId || visited.has(child.id)) continue;
      visited.add(child.id);
      if (isSeatVacantOn(vacancies, child.id, onDate)) walk(child.id, depth + 1);
      else result.push(child.id);
    }
  };
  walk(leaderId, 0);
  return result;
}
