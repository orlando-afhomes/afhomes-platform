/** Redemption of Stay Points for accommodation (doc 10). Points are integers; money is integer centavos. */

export type PointsBucket = "weekday" | "weekend";
/** A holiday night draws from the weekend bucket (doc 10 section 7). */
export type NightReason = "weekday" | "weekend" | "holiday";

export type RedemptionVenue = {
  id: string;
  name: string;
  /** A venue is bookable only while open (doc 10 section 5.3). */
  status: "open" | "not_open";
  /** Cancellation cut-off: hours before check-in (doc 10 section 10). */
  cutoffHours: number;
  /** Check-in time, Asia/Manila, HH:MM. */
  checkInTime: string;
  /** Marked sample data, replaced when the real configuration is supplied. */
  sample: boolean;
};

export type PointsRow = { venueId: string; roomType: string; weekdayPoints: number; weekendPoints: number };

/** One dated, immutable version of the Terms of Use points-per-night table (doc 10 section 8). */
export type PointsTableVersion = {
  id: string;
  version: number;
  /** Cards whose Card Claim Date is on or after this date use this version. */
  effectiveDate: string;
  /** Weekend nights, 0 = Sunday to 6 = Saturday; set by Admin, never assumed (doc 10 section 7.4). */
  weekendDays: number[];
  rows: PointsRow[];
  note: string | null;
  sample: boolean;
  createdAt: string;
  createdBy: string;
};

export type Holiday = { id: string; date: string; name: string; removed: boolean; addedBy: string; addedAt: string };

export type BookingNight = {
  date: string;
  reason: NightReason;
  bucket: PointsBucket;
  payment: "points" | "cash";
  /** Points required for this night under the stored version; 0 when paid in cash. */
  points: number;
};

export type BookingStatus = "pending_payment" | "confirmed" | "completed" | "cancelled" | "late_cancelled" | "no_show" | "transfer_cancelled";

export type BookingEvent = { at: string; actorId: string; event: string; note: string | null };

export type RedemptionBooking = {
  id: string;
  reference: string;
  membershipId: string;
  vipNumber: string;
  venueId: string;
  roomType: string;
  checkIn: string;
  /** Departure date; the last night is the day before. */
  checkOut: string;
  guests: number;
  /** Who stays: the primary holder or the Gold supplementary cardholder share one balance (doc 10 section 14). */
  stayingHolder: string;
  nights: BookingNight[];
  basisVersionId: string;
  basisVersion: number;
  reservedWeekday: number;
  reservedWeekend: number;
  /** A first stay may hold a room before the first gift is released, without reserving points. */
  provisional?: boolean;
  cashNights: number;
  cashAmountCentavos: number;
  /** Receipt reference of the cash part once Finance approves it (doc 07). */
  cashReference: string | null;
  status: BookingStatus;
  createdBy: string;
  createdAt: string;
  history: BookingEvent[];
};

export type LedgerEntryType = "reserve" | "return" | "consume" | "forfeit";

/** Append-only (doc 10 section 13). */
export type RedemptionLedgerEntry = {
  id: string;
  membershipId: string;
  vipNumber: string;
  bookingId: string;
  type: LedgerEntryType;
  bucket: PointsBucket;
  points: number;
  basisVersionId: string;
  /** Tranche number for this movement. Null represents a legacy movement. */
  trancheId: string | null;
  actorId: string;
  at: string;
  reason: string | null;
};

export type RedemptionState = {
  venues: RedemptionVenue[];
  tableVersions: PointsTableVersion[];
  holidays: Holiday[];
  bookings: RedemptionBooking[];
  ledger: RedemptionLedgerEntry[];
  /** Points Activation Date set by a first redemption, by membership id (doc 10 section 11). */
  pads: Record<string, { date: string; bookingId: string }>;
  /** Idempotency keys of submitted bookings, mapped to the booking id. */
  requests: Record<string, string>;
  sequence: number;
};
