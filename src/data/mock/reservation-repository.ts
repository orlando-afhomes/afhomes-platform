import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReservationRepository } from "@/data/contracts/reservation-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { reservationProblem, type ReservationInput, type RestaurantReservation } from "@/modules/reservations/types";
import { BusinessRepository, today } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

const DENIED = "Only office staff with the Bookings permission can manage restaurant reservations.";

export class MockReservationRepository extends BusinessRepository implements ReservationRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  list(options?: MockAsyncOptions): Promise<RestaurantReservation[]> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", DENIED);
      return [...this.store.restaurantReservations].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    });
  }

  create(input: ReservationInput, options?: MockAsyncOptions): Promise<RestaurantReservation> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", DENIED);
      const problem = reservationProblem(input, today());
      if (problem) throw new Error(problem);
      const restaurant = this.store.outlets.find((outlet) => outlet.id === input.venueId && outlet.type === "restaurant" && outlet.status === "active");
      if (!restaurant) throw new Error("Choose an active restaurant.");
      const guestName = input.guestName.trim();
      if (this.store.restaurantReservations.some((item) => item.status === "reserved" && item.venueId === input.venueId
        && item.date === input.date && item.time === input.time && item.guestName.toLowerCase() === guestName.toLowerCase())) {
        throw new Error("This guest already has a reservation at that date and time.");
      }
      const id = nextId(this.store, "restaurantReservation", "rsv");
      const reservation: RestaurantReservation = {
        id, reference: `RSV-${id.slice(4).padStart(4, "0")}`, venueId: input.venueId, membershipId: input.membershipId ?? null, guestName, contactNumber: input.contactNumber.trim(),
        date: input.date, time: input.time, partySize: input.partySize, occasion: input.occasion?.trim() || null, note: input.note?.trim() || null,
        status: "reserved", createdBy: identity.id, createdAt: new Date().toISOString(), cancelledReason: null,
      };
      this.store.restaurantReservations.push(reservation);
      this.audit(identity, { module: "stay-points", action: "RESTAURANT_RESERVATION_CREATED", entityType: "restaurant-reservation", entityId: id,
        displayReference: reservation.reference, newValue: "reserved" });
      return reservation;
    });
  }

  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<RestaurantReservation> {
    return this.run(options, (identity) => {
      this.require(identity, "redemption.book", DENIED);
      const reservation = this.store.restaurantReservations.find((item) => item.id === id);
      if (!reservation) throw new Error("Reservation not found.");
      if (reservation.status === "cancelled") return reservation;
      if (!reason.trim()) throw new Error("Enter the reason for cancelling.");
      reservation.status = "cancelled";
      reservation.cancelledReason = reason.trim();
      this.audit(identity, { module: "stay-points", action: "RESTAURANT_RESERVATION_CANCELLED", entityType: "restaurant-reservation", entityId: id,
        displayReference: reservation.reference, previousValue: "reserved", newValue: "cancelled", reason: reason.trim() });
      return reservation;
    });
  }
}
