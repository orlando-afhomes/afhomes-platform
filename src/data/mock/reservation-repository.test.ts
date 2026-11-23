import { describe, expect, it } from "vitest";
import { addDaysToDate, manilaToday } from "@/shared/lib/dates";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

const restaurantId = (store: ReturnType<typeof createMockStore>) => store.outlets.find((outlet) => outlet.type === "restaurant" && outlet.status === "active")!.id;
const tomorrow = () => addDaysToDate(manilaToday(), 1)!;

describe("restaurant reservations", () => {
  it("records a reservation without moving points or money, and audits it", async () => {
    const store = createMockStore();
    const clerk = as(store, "dev-admin");
    const pointsBefore = JSON.stringify(store.redemption.bookings);
    const reservation = await clerk.reservations.create({ venueId: restaurantId(store), guestName: "Maria Cruz", contactNumber: "09170000000", date: tomorrow(), time: "18:30", partySize: 4 });
    expect(reservation).toMatchObject({ status: "reserved", reference: "RSV-0001", partySize: 4 });
    expect(JSON.stringify(store.redemption.bookings)).toBe(pointsBefore);
    expect(store.auditEvents.some((event) => event.action === "RESTAURANT_RESERVATION_CREATED")).toBe(true);
    expect((await clerk.reservations.list()).map((item) => item.id)).toEqual([reservation.id]);
  });

  it("rejects a past date, a non-restaurant venue, a duplicate and a user without the Bookings permission", async () => {
    const store = createMockStore();
    const clerk = as(store, "dev-admin");
    const input = { venueId: restaurantId(store), guestName: "Maria Cruz", contactNumber: "09170000000", date: tomorrow(), time: "18:30", partySize: 2 };
    await expect(clerk.reservations.create({ ...input, date: addDaysToDate(manilaToday(), -1)! })).rejects.toThrow(/past/);
    await expect(clerk.reservations.create({ ...input, venueId: "venue-wellness-hotel" })).rejects.toThrow(/active restaurant/);
    await clerk.reservations.create(input);
    await expect(clerk.reservations.create({ ...input, guestName: "maria cruz" })).rejects.toThrow(/already has a reservation/);
    await expect(as(store, "dev-ost-a1").reservations.create({ ...input, time: "19:00" })).rejects.toThrow(/Bookings permission/);
  });

  it("cancels with a reason and keeps the history", async () => {
    const store = createMockStore();
    const clerk = as(store, "dev-admin");
    const reservation = await clerk.reservations.create({ venueId: restaurantId(store), guestName: "Maria Cruz", contactNumber: "09170000000", date: tomorrow(), time: "18:30", partySize: 2 });
    await expect(clerk.reservations.cancel(reservation.id, " ")).rejects.toThrow(/reason/);
    const cancelled = await clerk.reservations.cancel(reservation.id, "Guest called");
    expect(cancelled).toMatchObject({ status: "cancelled", cancelledReason: "Guest called" });
    expect(store.restaurantReservations).toHaveLength(1);
  });
});
