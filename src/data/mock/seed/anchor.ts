import { addDaysToDate, addMonthsToDate, addYearsToDate, manilaToday } from "@/shared/lib/dates";

/**
 * Date anchor for the synthetic seed. Every seeded date is an offset from the
 * Asia/Manila business date on which the store is built, so the dashboard,
 * reports and current-month views always have recent records. Date-only fields
 * stay date-only strings; timestamps use a fixed Manila time on that date.
 */
export type SeedClock = {
  /** Business date the seed was built on (YYYY-MM-DD, Asia/Manila). */
  today: string;
  /** Date `days` before today (positive values go back in time). */
  ago(days: number): string;
  /** Date `days` after today. */
  ahead(days: number): string;
  /** First day of the month `monthsBack` months before the current month. */
  monthStart(monthsBack: number): string;
  /** YYYY-MM of the month `monthsBack` months before the current month. */
  month(monthsBack: number): string;
  /** A day inside the month `monthsBack` months before the current month (day is clamped to 28). */
  inMonth(monthsBack: number, day: number): string;
  addYears(date: string, years: number): string;
  addMonths(date: string, months: number): string;
  addDays(date: string, days: number): string;
  /** ISO timestamp at a fixed Manila time on a business date. */
  at(date: string, time?: string): string;
};

const must = (value: string | null, label: string): string => {
  if (!value) throw new Error(`Seed date could not be built: ${label}`);
  return value;
};

/** Current Asia/Manila time as HH:MM. */
function manilaTimeNow(): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
}

export function createSeedClock(fixedToday?: string): SeedClock {
  const today = fixedToday ?? manilaToday();
  // Seeded events on today's date never sit later than the moment the store is built.
  const nowTime = fixedToday ? null : manilaTimeNow();
  const currentMonthStart = `${today.slice(0, 7)}-01`;
  const monthStart = (monthsBack: number) => must(addMonthsToDate(currentMonthStart, -monthsBack), `month ${monthsBack}`);
  return {
    today,
    ago: (days) => must(addDaysToDate(today, -days), `${days} days ago`),
    ahead: (days) => must(addDaysToDate(today, days), `${days} days ahead`),
    monthStart,
    month: (monthsBack) => monthStart(monthsBack).slice(0, 7),
    inMonth: (monthsBack, day) => `${monthStart(monthsBack).slice(0, 7)}-${String(Math.min(Math.max(day, 1), 28)).padStart(2, "0")}`,
    addYears: (date, years) => must(addYearsToDate(date, years), `${date} + ${years} years`),
    addMonths: (date, months) => must(addMonthsToDate(date, months), `${date} + ${months} months`),
    addDays: (date, days) => must(addDaysToDate(date, days), `${date} + ${days} days`),
    at: (date, time = "09:00") => `${date}T${nowTime && date === today && time > nowTime ? nowTime : time}:00+08:00`,
  };
}
