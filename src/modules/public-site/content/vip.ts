/**
 * VIP Privilege Card summary for the public site. Numbers match docs 05 and 09 (15/20/25 percent;
 * 10,000 / 20,000 / 25,000 points a year). The points wording follows doc 09: each year's tranche is
 * released when that year's qualifying spend is met, not "upon activation" (owner decision UI22).
 */
export type VipTierSummary = {
  code: "bronze" | "silver" | "gold";
  name: string;
  discountPercent: number;
  discountYears: number;
  registration: string;
  pointsPerYear: number;
  totalPoints: number;
  image: string;
};

export const VIP_TIERS: VipTierSummary[] = [
  { code: "gold", name: "Gold", discountPercent: 25, discountYears: 20, registration: "A Primary Cardholder with one Supplementary Cardholder", pointsPerYear: 25000, totalPoints: 500000, image: "/images/cards/gold.webp" },
  { code: "silver", name: "Silver", discountPercent: 20, discountYears: 10, registration: "A single Cardholder", pointsPerYear: 20000, totalPoints: 200000, image: "/images/cards/silver.webp" },
  { code: "bronze", name: "Bronze", discountPercent: 15, discountYears: 5, registration: "A single Cardholder", pointsPerYear: 10000, totalPoints: 50000, image: "/images/cards/bronze.webp" },
];

export const VIP_INTRO = {
  eyebrow: "Exclusive Access, Exceptional Benefits",
  title: "VIP Privilege Card",
  lede: "A smart choice for your health, family fun and status.",
};

export const VIP_BENEFITS: string[] = [
  "Special discounts of 15% to 25% on all consumption: entrance fee, restaurants, coffee shop, wine bar, videoke, massage, spa, conference room, events, amusement games, adventure games, eco-farming experience, native products shops, and staycation.",
  "The Gold VIP Privilege Card has a 20-year validity.",
  "Advance reservation rights. A VIP Privilege Cardholder can make reservations one month in advance, while a non-cardholder can only reserve one week in advance, giving the primary cardholder an advantage during peak times.",
  "No annual maintenance fees, plus birthday gifts and complimentary welcome drinks.",
];

export const VIP_TIER_PERKS: string[] = ["Free entrance fee (for the cardholder)", "Priority reservation rights"];

export const VIP_POINTS_NOTE =
  "Annual Welcome Gift: Loyalty Stay Points for accommodation. Each year's points are released when that year's qualifying spend at AFhomes is met.";

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-PH").format(points);
}
