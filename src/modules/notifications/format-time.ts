import { formatDate } from "@/shared/lib/format-date";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Relative bell-list time for an audit event timestamp. Buckets:
 * "just now" (< 1 min, or a future timestamp from clock skew),
 * "N min ago" (< 1 hr), "N hr ago" (< 24 hr), "Yesterday" (< 48 hr),
 * otherwise the shared date display. Never returns a raw ISO string:
 * unparseable input renders as an em dash.
 */
export function formatNotificationTime(iso: string, now: Date = new Date()): string {
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";
  const diffMs = now.getTime() - at;
  if (diffMs < MINUTE_MS) return "just now";
  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes} min ago`;
  }
  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return `${hours} hr ago`;
  }
  if (diffMs < 2 * DAY_MS) return "Yesterday";
  return formatDate(iso);
}
