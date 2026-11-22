import type { RedemptionState } from "./types";

/** Philippine regular holidays and fixed special non-working days, Nov 2026 to Dec 2027. Eid and proclaimed extra days are added by an Administrator. */
const PH_HOLIDAYS: ReadonlyArray<readonly [string, string]> = [
  ["2026-11-30", "Bonifacio Day"], ["2026-12-08", "Feast of the Immaculate Conception"], ["2026-12-24", "Christmas Eve"],
  ["2026-12-25", "Christmas Day"], ["2026-12-30", "Rizal Day"], ["2026-12-31", "Last Day of the Year"],
  ["2027-01-01", "New Year's Day"], ["2027-02-06", "Chinese New Year"], ["2027-03-25", "Maundy Thursday"],
  ["2027-03-26", "Good Friday"], ["2027-03-27", "Black Saturday"], ["2027-04-09", "Araw ng Kagitingan"],
  ["2027-05-01", "Labor Day"], ["2027-06-12", "Independence Day"], ["2027-08-21", "Ninoy Aquino Day"],
  ["2027-08-30", "National Heroes Day"], ["2027-11-01", "All Saints' Day"], ["2027-11-02", "All Souls' Day"],
  ["2027-11-30", "Bonifacio Day"], ["2027-12-08", "Feast of the Immaculate Conception"], ["2027-12-24", "Christmas Eve"],
  ["2027-12-25", "Christmas Day"], ["2027-12-30", "Rizal Day"], ["2027-12-31", "Last Day of the Year"],
];

/**
 * Initial Redemption configuration: owner-adopted values (2026-11-22). The company has not issued its own points-per-night
 * table, holiday calendar or venue cut-offs, so the owner adopted these as the working version. An Administrator publishes
 * a new dated version in the admin page whenever the company issues its own; the version in effect on the Card Claim Date applies.
 */
export function createRedemptionSeed(): RedemptionState {
  return {
    venues: [
      { id: "venue-wellness-hotel", name: "AFhomes Smart Wellness Hotel", status: "open", cutoffHours: 48, checkInTime: "14:00", sample: false },
      { id: "venue-hotspring-resort", name: "AFhomes Hotspring & Ecofarm Resort", status: "not_open", cutoffHours: 72, checkInTime: "14:00", sample: false },
    ],
    tableVersions: [
      {
        id: "ptv-seed-1",
        version: 1,
        effectiveDate: "2026-01-01",
        weekendDays: [5, 6],
        rows: [
          { venueId: "venue-wellness-hotel", roomType: "Standard", weekdayPoints: 1000, weekendPoints: 1500 },
          { venueId: "venue-wellness-hotel", roomType: "Deluxe", weekdayPoints: 1500, weekendPoints: 2000 },
          { venueId: "venue-hotspring-resort", roomType: "Villa", weekdayPoints: 2500, weekendPoints: 3000 },
        ],
        note: "Owner decision 2026-11-22.",
        sample: false,
        createdAt: "2026-11-22T00:00:00.000Z",
        createdBy: "system",
      },
    ],
    holidays: PH_HOLIDAYS.map(([date, name], index) => ({
      id: `hol-seed-${index + 1}`, date, name, removed: false, addedBy: "system", addedAt: "2026-11-22T00:00:00.000Z",
    })),
    bookings: [],
    ledger: [],
    pads: {},
    requests: {},
    sequence: 1,
  };
}
