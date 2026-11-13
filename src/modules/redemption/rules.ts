import { addDaysToDate, addYearsToDate } from "@/shared/lib/dates";
import type { BookingNight, NightReason, PointsBucket, PointsTableVersion, RedemptionVenue } from "./types";

const MAX_NIGHTS = 365; // technical guard against absurd date ranges, not a business limit

/** Day of week of a date-only value (0 = Sunday), without any timezone shift. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** A holiday night is a holiday night whatever its weekday; otherwise the configured weekend days decide (doc 10 section 7). */
export function classifyNight(date: string, weekendDays: readonly number[], holidays: ReadonlySet<string>): NightReason {
  if (holidays.has(date)) return "holiday";
  return weekendDays.includes(weekdayOf(date)) ? "weekend" : "weekday";
}

export function bucketOf(reason: NightReason): PointsBucket {
  return reason === "weekday" ? "weekday" : "weekend";
}

/** Nights of a stay: check-in date up to the day before departure. */
export function nightsOfStay(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  let day: string | null = checkIn;
  while (day && day < checkOut && nights.length <= MAX_NIGHTS) {
    nights.push(day);
    day = addDaysToDate(day, 1);
  }
  return nights;
}

/** The version in effect on the Card Claim Date: the latest one effective on or before it (doc 10 section 8.2). */
export function selectTableVersion(versions: readonly PointsTableVersion[], claimDate: string): PointsTableVersion | null {
  const candidates = versions.filter((item) => item.effectiveDate <= claimDate);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, item) => (item.effectiveDate > best.effectiveDate || (item.effectiveDate === best.effectiveDate && item.version > best.version) ? item : best));
}

export type StayPricing = {
  nights: BookingNight[];
  weekdayPoints: number;
  weekendPoints: number;
  cashNights: number;
};

/**
 * Classifies each night and prices it from the card's version. A stay is split
 * by whole nights: each night is fully points or fully cash (owner ruling A1).
 */
export function priceStay(input: {
  version: PointsTableVersion;
  venueId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  holidays: ReadonlySet<string>;
  cashNightDates: readonly string[];
}): StayPricing {
  const dates = nightsOfStay(input.checkIn, input.checkOut);
  if (dates.length === 0) throw new Error("A stay needs at least one night.");
  if (dates.length > MAX_NIGHTS) throw new Error("The stay is too long.");
  const row = input.version.rows.find((item) => item.venueId === input.venueId && item.roomType === input.roomType);
  if (!row) throw new Error("This room type has no points value in the card's points table.");
  for (const cash of input.cashNightDates) {
    if (!dates.includes(cash)) throw new Error("A cash night must be a night of the stay.");
  }
  const nights: BookingNight[] = dates.map((date) => {
    const reason = classifyNight(date, input.version.weekendDays, input.holidays);
    const bucket = bucketOf(reason);
    const cash = input.cashNightDates.includes(date);
    const required = bucket === "weekday" ? row.weekdayPoints : row.weekendPoints;
    return { date, reason, bucket, payment: cash ? "cash" : "points", points: cash ? 0 : required };
  });
  const sum = (bucket: PointsBucket) => nights.filter((n) => n.bucket === bucket).reduce((total, n) => total + n.points, 0);
  return { nights, weekdayPoints: sum("weekday"), weekendPoints: sum("weekend"), cashNights: nights.filter((n) => n.payment === "cash").length };
}

/** Moment of the venue's cancellation deadline (Asia/Manila check-in time minus the cut-off hours). */
export function cutoffDeadline(venue: Pick<RedemptionVenue, "checkInTime" | "cutoffHours">, checkIn: string): number {
  return Date.parse(`${checkIn}T${venue.checkInTime}:00+08:00`) - venue.cutoffHours * 3_600_000;
}

/** At or before the cut-off returns the points; after it forfeits them (doc 10 section 10). */
export function cancellationOutcome(venue: Pick<RedemptionVenue, "checkInTime" | "cutoffHours">, checkIn: string, cancelledAtIso: string): "return" | "forfeit" {
  return Date.parse(cancelledAtIso) <= cutoffDeadline(venue, checkIn) ? "return" : "forfeit";
}

export type EligibilityMembership = {
  status: string;
  financialHold: boolean;
  activationDate: string | null;
  validityEndDate: string | null;
  cardId: string | null;
};

/**
 * Card-side eligibility (doc 10 section 6 items 1, 2, 3, 6). Returns the blocking reasons.
 * shortcut: the Membership model has no Card Claim Date or full-payment flag; an Active
 * membership with a Card ID stands in for both. Replace when the card-claim work lands.
 */
export function checkMembershipEligibility(membership: EligibilityMembership, checkIn: string, checkOut: string): string[] {
  const reasons: string[] = [];
  if (membership.status !== "active") reasons.push("The membership is not Active.");
  if (membership.financialHold) reasons.push("The membership is on Financial Hold.");
  if (!membership.cardId || !membership.activationDate) reasons.push("The card has not been claimed.");
  else if (checkIn < membership.activationDate) reasons.push("The stay starts before the card was claimed.");
  if (membership.validityEndDate && checkOut > membership.validityEndDate) reasons.push("The stay is outside the card's validity period.");
  return reasons;
}

/**
 * First-redemption check (doc 10 section 11; owner ruling A7b). Kept separate so the
 * later earning-model rewrite only has to supply `yearOneConditionMet`. When the PAD is
 * not yet set and the Year 1 condition is unmet, tranche 1 is not released and not
 * carried over, so nothing is available to redeem.
 */
export function evaluateFirstRedemption(input: { padSet: boolean; claimDate: string; checkIn: string; yearOneConditionMet: boolean }): { ok: boolean; setsPad: boolean; message?: string } {
  if (input.padSet) return { ok: true, setsPad: false };
  if (!input.yearOneConditionMet) {
    return { ok: false, setsPad: false, message: "The Year 1 condition is not met, so tranche 1 is not released and points are not available." };
  }
  const secondAnniversary = addYearsToDate(input.claimDate, 2);
  return { ok: true, setsPad: Boolean(secondAnniversary && input.checkIn < secondAnniversary) };
}
