import type { Promo } from "./types";

/** One sample promo so the Promo Points screens have something to show. Marked as sample. */
export function seedPromos(): Promo[] {
  return [
    {
      id: "promo-1",
      name: "Teppanyaki Dining Points (sample)",
      status: "active",
      startDate: "2026-11-01",
      endDate: "2026-12-31",
      earnOutletIds: ["outlet-teppanyaki"],
      earnPesosPerPointCentavos: 10_000,
      redeemOutletIds: ["outlet-teppanyaki"],
      pointsExpiryDate: "2027-06-30",
      sample: true,
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    },
  ];
}
