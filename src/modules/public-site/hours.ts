/**
 * Public office hours shown by the Home hero status badge (owner decision, 2026-11-18).
 * Same hours as the FAQ cash-payment note: 9:00 AM – 5:00 PM, Monday to Sunday, Asia/Manila.
 *
 * shortcut: fixed schedule; move to an Admin-edited setting when the backend exists.
 */
export const SITE_HOURS = {
  opensAt: "09:00",
  closesAt: "17:00",
  timeZone: "Asia/Manila",
} as const;

const OPEN_MINUTES = toMinutes(SITE_HOURS.opensAt);
const CLOSE_MINUTES = toMinutes(SITE_HOURS.closesAt);

function toMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** Minutes since midnight in the given time zone. */
function minutesInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  return hour * 60 + minute;
}

/** True from opening time (inclusive) until closing time (exclusive), every day, Asia/Manila. */
export function isSiteOpenAt(now: Date): boolean {
  const minutes = minutesInZone(now, SITE_HOURS.timeZone);
  return minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES;
}
