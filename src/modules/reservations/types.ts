/**
 * Restaurant table reservations (owner decision 2026-11-23). The ALM Japanese Restaurant takes
 * reservations only and no walk-ins (public site), and doc 10 does not allow points at restaurants,
 * so a reservation records the booking only: no points and no money.
 */
export type ReservationStatus = "reserved" | "cancelled";

export type RestaurantReservation = {
  id: string;
  reference: string;
  /** Outlet id of the restaurant. */
  venueId: string;
  /** Set when the reservation was made for a cardholder from Customer Search. */
  membershipId: string | null;
  guestName: string;
  contactNumber: string;
  /** Business date, YYYY-MM-DD. */
  date: string;
  /** 24-hour time, HH:MM. */
  time: string;
  partySize: number;
  occasion: string | null;
  note: string | null;
  status: ReservationStatus;
  createdBy: string;
  createdAt: string;
  cancelledReason: string | null;
};

export type ReservationInput = {
  venueId: string;
  membershipId?: string;
  guestName: string;
  contactNumber: string;
  date: string;
  time: string;
  partySize: number;
  occasion?: string;
  note?: string;
};

// shortcut: sample party-size ceiling because no restaurant capacity rule exists yet; replace when the owner supplies it.
export const MAX_PARTY_SIZE = 20;

/** Returns the first problem with a reservation, or null when it can be recorded. */
export function reservationProblem(input: ReservationInput, today: string): string | null {
  if (!input.venueId) return "Choose the restaurant.";
  if (!input.guestName.trim()) return "Enter the guest name.";
  if (!input.contactNumber.trim()) return "Enter a contact number.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return "Choose the reservation date.";
  if (input.date < today) return "The reservation date cannot be in the past.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) return "Enter the time as HH:MM, for example 18:30.";
  if (!Number.isSafeInteger(input.partySize) || input.partySize < 1 || input.partySize > MAX_PARTY_SIZE) {
    return `Party size must be a whole number from 1 to ${MAX_PARTY_SIZE}.`;
  }
  return null;
}
