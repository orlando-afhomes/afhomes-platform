import { describe, expect, it } from "vitest";
import { MAX_PARTY_SIZE, reservationProblem, type ReservationInput } from "./types";

const valid: ReservationInput = { venueId: "outlet-teppanyaki", guestName: "Maria Cruz", contactNumber: "09170000000", date: "2026-11-30", time: "18:30", partySize: 4 };

describe("restaurant reservation validation", () => {
  it("accepts a complete reservation for today or later", () => {
    expect(reservationProblem(valid, "2026-11-30")).toBeNull();
  });

  it("rejects past dates, bad times and party sizes outside the limit", () => {
    expect(reservationProblem(valid, "2026-12-01")).toMatch(/past/);
    expect(reservationProblem({ ...valid, time: "6:30pm" }, "2026-11-23")).toMatch(/HH:MM/);
    expect(reservationProblem({ ...valid, partySize: 0 }, "2026-11-23")).toMatch(/Party size/);
    expect(reservationProblem({ ...valid, partySize: MAX_PARTY_SIZE + 1 }, "2026-11-23")).toMatch(/Party size/);
    expect(reservationProblem({ ...valid, guestName: " " }, "2026-11-23")).toMatch(/guest name/);
  });
});
