import type { RedemptionState } from "./types";

/**
 * Initial Redemption configuration. shortcut: the approved points-per-night table, the
 * weekend nights, the venue cut-offs and the holiday calendar have not been supplied
 * (doc 10 section 23), so every value below is SAMPLE data created by the prototype.
 * Replace by publishing a new dated version in the admin page once the owner supplies it.
 */
export function createRedemptionSeed(): RedemptionState {
  return {
    venues: [
      { id: "venue-wellness-hotel", name: "AFhomes Smart Wellness Hotel", status: "open", cutoffHours: 48, checkInTime: "14:00", sample: true },
      { id: "venue-hotspring-resort", name: "AFhomes Hotspring & Ecofarm Resort", status: "not_open", cutoffHours: 72, checkInTime: "14:00", sample: true },
    ],
    tableVersions: [
      {
        id: "ptv-seed-1",
        version: 1,
        effectiveDate: "2026-01-01",
        weekendDays: [5, 6],
        rows: [
          { venueId: "venue-wellness-hotel", roomType: "Standard", weekdayPoints: 3000, weekendPoints: 4500 },
          { venueId: "venue-wellness-hotel", roomType: "Deluxe", weekdayPoints: 4500, weekendPoints: 6500 },
          { venueId: "venue-hotspring-resort", roomType: "Villa", weekdayPoints: 6000, weekendPoints: 9000 },
        ],
        // Sample values carry the `sample` flag only; no notice is shown (owner ruling 2026-11-15).
        note: null,
        sample: true,
        createdAt: "2026-11-13T00:00:00.000Z",
        createdBy: "system",
      },
    ],
    holidays: [
      { id: "hol-seed-1", date: "2026-12-25", name: "Christmas Day", removed: false, addedBy: "system", addedAt: "2026-11-13T00:00:00.000Z" },
      { id: "hol-seed-2", date: "2027-01-01", name: "New Year's Day", removed: false, addedBy: "system", addedAt: "2026-11-13T00:00:00.000Z" },
    ],
    bookings: [],
    ledger: [],
    pads: {},
    requests: {},
    sequence: 1,
  };
}
