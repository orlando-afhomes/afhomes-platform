import { describe, expect, it } from "vitest";
import type { BookingInput } from "@/data/contracts/redemption-repository";
import { getDevIdentity } from "./dev-identities";
import { MockRedemptionRepository } from "./redemption-repository";
import type { PointsSource } from "./redemption-points-source";
import { createMockStore } from "./seed";

// 2027-03-04 is a Thursday (weekday night), 2027-03-05 a Friday (weekend night). Sample table: Standard 3,000 / 4,500.
const stay = (overrides: Partial<BookingInput> = {}): BookingInput => ({
  requestId: `req-${Math.random()}`, membershipId: "memb-1", venueId: "venue-wellness-hotel", roomType: "Standard",
  checkIn: "2027-03-04", checkOut: "2027-03-06", guests: 2, stayingHolder: "Primary cardholder", cashNightDates: [], cashAmountCentavos: 0, ...overrides,
});

function setup(identity = "dev-admin", gross = { weekday: 10000, weekend: 5000 }) {
  const store = createMockStore();
  store.memberships.find((m) => m.id === "memb-1")!.financialHold = false;
  const source = { gross, yearOne: true };
  const points: PointsSource = { grossSpendable: () => source.gross, yearOneConditionMet: () => source.yearOne };
  const as = (id: string) => new MockRedemptionRepository(store, () => getDevIdentity(id), {}, points);
  return { store, source, repo: as(identity), as };
}

const memb = async (repo: MockRedemptionRepository) => (await repo.overview()).members.find((m) => m.membershipId === "memb-1")!;

describe("booking with points", () => {
  it("reserves points per bucket from the card's table version, and a repeated request key books once", async () => {
    const { repo, store } = setup();
    const input = stay({ requestId: "same" });
    const booking = await repo.createBooking(input);
    expect(booking).toMatchObject({ status: "confirmed", reservedWeekday: 3000, reservedWeekend: 4500, basisVersion: 1 });
    expect((await repo.createBooking(input)).id).toBe(booking.id);
    expect(store.redemption.bookings).toHaveLength(1);
    expect(store.redemption.ledger.filter((e) => e.type === "reserve")).toHaveLength(2);
    const m = await memb(repo);
    expect(m.weekday.available).toBe(7000);
    expect(m.weekend.available).toBe(500);
  });

  it("does not borrow across buckets (scenario D)", async () => {
    const { repo } = setup("dev-admin", { weekday: 100000, weekend: 4000 });
    await expect(repo.createBooking(stay())).rejects.toThrow(/weekend points/i);
  });

  it("prevents double spend: a second booking cannot reuse reserved points", async () => {
    const { repo } = setup("dev-admin", { weekday: 3000, weekend: 4500 });
    await repo.createBooking(stay());
    await expect(repo.createBooking(stay())).rejects.toThrow(/not enough/i);
  });

  it("blocks cards that are held, expired, or at a venue that is not open", async () => {
    const { repo, store } = setup();
    await expect(repo.createBooking(stay({ venueId: "venue-hotspring-resort", roomType: "Villa" }))).rejects.toThrow(/not open/i);
    await expect(repo.createBooking(stay({ checkIn: "2033-11-01", checkOut: "2033-11-04" }))).rejects.toThrow(/validity/i);
    store.memberships.find((m) => m.id === "memb-1")!.financialHold = true;
    await expect(repo.createBooking(stay())).rejects.toThrow(/hold/i);
  });

  it("refuses a first redemption when the Year 1 condition is unmet (A7b)", async () => {
    const { repo, source } = setup();
    source.yearOne = false;
    await expect(repo.createBooking(stay())).rejects.toThrow(/Year 1/);
  });

  it("only staff with the Bookings permission book; Finance and sellers do not", async () => {
    const { as } = setup();
    await expect(as("dev-finance").createBooking(stay())).rejects.toThrow(/Bookings permission/);
    await expect(as("dev-ost-a1").createBooking(stay())).rejects.toThrow(/Bookings permission/);
  });

  it("splits points plus cash by whole nights and holds the booking in Pending Payment until Finance approves", async () => {
    const { as, repo } = setup();
    const booking = await repo.createBooking(stay({ cashNightDates: ["2027-03-05"], cashAmountCentavos: 500000 }));
    expect(booking).toMatchObject({ status: "pending_payment", reservedWeekday: 3000, reservedWeekend: 0, cashNights: 1 });
    await expect(repo.approveCashPayment(booking.id, "OR-1")).resolves.toMatchObject({ status: "confirmed" });
    const other = await repo.createBooking(stay({ cashNightDates: ["2027-03-05"], cashAmountCentavos: 500000 }));
    await expect(as("dev-finance").approveCashPayment(other.id, "or-1")).rejects.toThrow(/already used/);
    await expect(as("dev-finance").approveCashPayment(other.id, "OR-2")).resolves.toMatchObject({ status: "confirmed", cashReference: "OR-2" });
  });
});

describe("cancellation, no-show and completion", () => {
  it("returns points when cancelled by the cut-off, and a repeat cancel moves nothing", async () => {
    const { repo, store } = setup();
    const booking = await repo.createBooking(stay());
    const done = await repo.cancelBooking(booking.id, "Guest request", "2027-03-01T00:00:00.000Z");
    expect(done.status).toBe("cancelled");
    expect((await memb(repo)).weekend.available).toBe(5000);
    const count = store.redemption.ledger.length;
    await repo.cancelBooking(booking.id, "Guest request", "2027-03-01T00:00:00.000Z");
    expect(store.redemption.ledger).toHaveLength(count);
  });

  it("forfeits points when cancelled after the cut-off (scenario I2)", async () => {
    const { repo } = setup();
    const booking = await repo.createBooking(stay());
    expect((await repo.cancelBooking(booking.id, "Late call", "2027-03-03T12:00:00.000Z")).status).toBe("late_cancelled");
    const m = await memb(repo);
    expect(m.weekday.available).toBe(7000);
    expect(m.weekend.available).toBe(500);
  });

  it("records a no-show only from the check-in date and forfeits the points (scenario I)", async () => {
    const { repo, store } = setup();
    const booking = await repo.createBooking(stay());
    await expect(repo.recordNoShow(booking.id, "Did not arrive")).rejects.toThrow(/check-in date/);
    store.redemption.bookings[0].checkIn = "2026-11-01";
    expect((await repo.recordNoShow(booking.id, "Did not arrive")).status).toBe("no_show");
    expect(store.redemption.ledger.filter((e) => e.type === "forfeit")).toHaveLength(2);
  });

  it("consumes once on completion and sets the Points Activation Date on the first redemption (scenarios J, L)", async () => {
    const { repo, store } = setup();
    const booking = await repo.createBooking(stay());
    await expect(repo.completeBooking(booking.id)).rejects.toThrow(/ended/);
    Object.assign(store.redemption.bookings[0], { checkIn: "2026-11-05", checkOut: "2026-11-07" });
    await repo.completeBooking(booking.id);
    await repo.completeBooking(booking.id);
    expect(store.redemption.ledger.filter((e) => e.type === "consume")).toHaveLength(2);
    expect(store.redemption.pads["memb-1"]).toEqual({ date: "2026-11-05", bookingId: booking.id });
  });
});

describe("card transfer (A7a)", () => {
  it("cancels the former holder's future bookings, forfeits their points, and repeats safely", async () => {
    const { repo, store } = setup();
    const future = await repo.createBooking(stay());
    const past = await repo.createBooking(stay({ checkIn: "2027-03-11", checkOut: "2027-03-12" }));
    store.redemption.bookings[1].checkIn = "2027-02-01";
    const cancelled = await repo.cancelFutureBookingsForTransfer("memb-1", "2027-03-01");
    expect(cancelled.map((b) => b.id)).toEqual([future.id]);
    expect(store.redemption.bookings.map((b) => b.status)).toEqual(["transfer_cancelled", "confirmed"]);
    expect(past.status).toBe("confirmed");
    expect(await repo.cancelFutureBookingsForTransfer("memb-1", "2027-03-01")).toEqual([]);
    expect(store.redemption.ledger.filter((e) => e.type === "forfeit" && e.bookingId === future.id)).toHaveLength(2);
  });
});

describe("points table, holidays and venues", () => {
  const rows = [{ venueId: "venue-wellness-hotel", roomType: "Standard", weekdayPoints: 2000, weekendPoints: 3000 }];

  it("publishes a new dated version without touching older ones, and cards keep their claim-date version (scenario E)", async () => {
    const { repo, store } = setup();
    const v2 = await repo.publishTableVersion({ effectiveDate: "2026-12-01", weekendDays: [5, 6], rows, note: "Approved" });
    expect(v2).toMatchObject({ version: 2, sample: false });
    expect(store.redemption.tableVersions).toHaveLength(2);
    expect(store.redemption.tableVersions[0].rows[0].weekdayPoints).toBe(3000);
    expect((await repo.createBooking(stay())).basisVersion).toBe(1);
    await expect(repo.publishTableVersion({ effectiveDate: "2026-12-01", weekendDays: [5, 6], rows, note: null })).rejects.toThrow(/later than/);
    await expect(repo.publishTableVersion({ effectiveDate: "2027-01-01", weekendDays: [], rows, note: null })).rejects.toThrow(/weekend/);
  });

  it("classifies a configured holiday night in the weekend bucket (scenario C), and removal keeps history", async () => {
    const { repo, store } = setup();
    const holiday = await repo.addHoliday("2027-03-04", "Sample holiday");
    const booking = await repo.createBooking(stay({ checkOut: "2027-03-05" }));
    expect(booking.nights[0]).toMatchObject({ reason: "holiday", bucket: "weekend" });
    await repo.removeHoliday(holiday.id, "Calendar corrected");
    expect(store.redemption.holidays.find((h) => h.id === holiday.id)?.removed).toBe(true);
    expect((await repo.createBooking(stay({ checkOut: "2027-03-05" }))).nights[0].reason).toBe("weekday");
  });

  it("limits configuration to the Administrator and Super Administrator, but lets Finance view", async () => {
    const { as } = setup();
    await expect(as("dev-finance").saveVenue({ name: "X", status: "open", cutoffHours: 24, checkInTime: "14:00" })).rejects.toThrow(/Administrator/);
    await expect(as("dev-finance").overview()).resolves.toBeDefined();
    await expect(as("dev-ost-a1").overview()).rejects.toThrow(/access/);
    await expect(as("dev-super-admin").saveVenue({ name: "New Venue", status: "not_open", cutoffHours: 24, checkInTime: "14:00" })).resolves.toMatchObject({ sample: false });
  });

  it("audits every state change", async () => {
    const { repo, store } = setup();
    const booking = await repo.createBooking(stay());
    await repo.cancelBooking(booking.id, "Guest request", "2027-03-01T00:00:00.000Z");
    const actions = store.auditEvents.map((e) => e.action);
    expect(actions).toContain("REDEMPTION_BOOKING_CREATED");
    expect(actions).toContain("REDEMPTION_BOOKING_CANCELLED");
  });
});
