import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Holiday, PointsRow, PointsTableVersion, RedemptionBooking, RedemptionLedgerEntry, RedemptionVenue } from "@/modules/redemption/types";

export type BookingInput = {
  /** Client-generated key; submitting the same key again returns the same booking and moves no points. */
  requestId: string;
  membershipId: string;
  venueId: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  stayingHolder: string;
  /** Nights paid in money instead of points, whole nights only (owner ruling A1). */
  cashNightDates: string[];
  /** Money part in centavos, entered by staff; counts only after Finance approves the receipt (doc 07). */
  cashAmountCentavos: number;
};

export type BookingView = RedemptionBooking & { customerName: string; venueName: string };

export type MemberPoints = {
  membershipId: string;
  customerName: string;
  productCode: string;
  vipNumber: string | null;
  /** Date used as the Card Claim Date (shortcut: activation date until the Membership model records it). */
  claimDate: string | null;
  tableVersion: number | null;
  padDate: string | null;
  weekday: { available: number; reserved: number };
  weekend: { available: number; reserved: number };
  /** Why this card cannot book now, if it cannot. */
  blockedReasons: string[];
};

export type RedemptionOverview = {
  venues: RedemptionVenue[];
  tableVersions: PointsTableVersion[];
  holidays: Holiday[];
  bookings: BookingView[];
  members: MemberPoints[];
  ledger: RedemptionLedgerEntry[];
};

export type TableVersionInput = { effectiveDate: string; weekendDays: number[]; rows: PointsRow[]; note: string | null };
export type VenueInput = { id?: string; name: string; status: "open" | "not_open"; cutoffHours: number; checkInTime: string };

/** Points bookings, the versioned points table, holidays and venues (doc 10). Office staff book; there is no member portal. */
export interface RedemptionRepository {
  overview(options?: MockAsyncOptions): Promise<RedemptionOverview>;
  createBooking(input: BookingInput, options?: MockAsyncOptions): Promise<BookingView>;
  /** Finance (or Administrator) approves the money part of a points plus cash booking. */
  approveCashPayment(bookingId: string, reference: string, options?: MockAsyncOptions): Promise<BookingView>;
  /** `cancelledAt` is the recorded date and time of the request; defaults to now. */
  cancelBooking(bookingId: string, reason: string, cancelledAt?: string, options?: MockAsyncOptions): Promise<BookingView>;
  recordNoShow(bookingId: string, reason: string, options?: MockAsyncOptions): Promise<BookingView>;
  completeBooking(bookingId: string, options?: MockAsyncOptions): Promise<BookingView>;
  /** Owner ruling A7a: a card transfer cancels the former holder's future points bookings; their points are forfeited. Called by card servicing. */
  cancelFutureBookingsForTransfer(membershipId: string, effectiveDate: string, options?: MockAsyncOptions): Promise<BookingView[]>;
  publishTableVersion(input: TableVersionInput, options?: MockAsyncOptions): Promise<PointsTableVersion>;
  addHoliday(date: string, name: string, options?: MockAsyncOptions): Promise<Holiday>;
  removeHoliday(holidayId: string, reason: string, options?: MockAsyncOptions): Promise<Holiday>;
  saveVenue(input: VenueInput, options?: MockAsyncOptions): Promise<RedemptionVenue>;
}
