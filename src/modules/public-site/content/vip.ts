/**
 * VIP Privilege Card summary for the public site. Numbers match docs 05 and 09 (15/20/25 percent;
 * 10,000 / 20,000 / 25,000 points a year). The points wording follows doc 09: each year's tranche is
 * released when that year's qualifying spend is met, not "upon activation" (owner decision UI22).
 */
import type { PublicVipProduct, TierColorKey } from "@/modules/vip/types";

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

/** Public card presentation keyed by the owner-approved product codes. */
type CardPresentation = { name: string; style: "bronze" | "silver" | "gold"; discountYears: number; registration: string; image: string };

const CARD_PRESENTATION: Record<string, CardPresentation> = {
  G1: { name: "Gold", style: "gold", discountYears: 20, registration: "A Primary Cardholder with one Supplementary Cardholder", image: "/images/cards/gold.webp" },
  S1: { name: "Silver", style: "silver", discountYears: 10, registration: "A single Cardholder", image: "/images/cards/silver.webp" },
  B1: { name: "Bronze", style: "bronze", discountYears: 5, registration: "A single Cardholder", image: "/images/cards/bronze.webp" },
};

const STYLE_BY_COLOR: Record<TierColorKey, "bronze" | "silver" | "gold"> = {
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
  neutral: "gold",
};

/** The approved standard card perks; custom products use their own approved benefits instead. */
const STANDARD_PERKS = ["Free entrance fee (for the cardholder)", "Priority reservation rights"];

/** One data-driven public VIP card. `discountYears` is null for a new product without approved public copy. */
export type VipCardView = {
  /** Catalog product code, e.g. G1. */
  code: string;
  /** Card artwork and colour family; the three original designs keep their look. */
  style: "bronze" | "silver" | "gold";
  name: string;
  discountPercent: number;
  discountYears: number | null;
  registration: string;
  pointsPerYear: number;
  totalPoints: number;
  /** Years the total points are released over: the product's earning cycles. */
  pointsYears: number;
  image: string;
  /** Registration plus the product's own approved perks. */
  perks: string[];
};

/** Builds the public card copy from the allowlisted public product projection. */
export function vipCardView(product: PublicVipProduct): VipCardView {
  const known = CARD_PRESENTATION[product.code];
  const extras = product.supplementaryHolders;
  const registration = known?.registration ?? (extras > 1 ? `A Primary Cardholder with ${extras} Supplementary Cardholders` : extras === 1 ? "A Primary Cardholder with one Supplementary Cardholder" : "A single Cardholder");
  const customBenefits = (product.benefitsSummary ?? "")
    .split(/\r?\n|;|•/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    code: product.code,
    style: STYLE_BY_COLOR[product.tierColorKey] ?? "gold",
    name: known?.name ?? product.name,
    discountPercent: product.vipDiscountPercent,
    discountYears: known?.discountYears ?? null,
    registration,
    pointsPerYear: product.pointsPerCycle,
    totalPoints: product.lifetimePoints,
    pointsYears: product.earningCycles,
    image: product.imageUrl ?? known?.image ?? CARD_PRESENTATION.G1.image,
    perks: [...new Set([`Registration for ${registration.charAt(0).toLowerCase()}${registration.slice(1)}`, ...(known ? STANDARD_PERKS : customBenefits)])],
  };
}

/** The approved three cards, shown while the browser-memory content loads. */
export const VIP_CARD_SEED: VipCardView[] = VIP_TIERS.map((tier) => ({
  code: tier.code === "gold" ? "G1" : tier.code === "silver" ? "S1" : "B1",
  style: tier.code,
  name: tier.name,
  discountPercent: tier.discountPercent,
  discountYears: tier.discountYears,
  registration: tier.registration,
  pointsPerYear: tier.pointsPerYear,
  totalPoints: tier.totalPoints,
  pointsYears: tier.discountYears,
  image: tier.image,
  perks: [`Registration for ${tier.registration.charAt(0).toLowerCase()}${tier.registration.slice(1)}`, ...STANDARD_PERKS],
}));

export const VIP_INTRO = {
  eyebrow: "Exclusive Access, Exceptional Benefits",
  title: "VIP Privilege Card",
  lede: "A smart choice for your health, family fun and status.",
};

/** One benefit line. `strong` parts are shown in bold, as in the owner's VIP reference design (2026-11-17). */
export type VipBenefit = { parts: { text: string; strong?: boolean }[] };

export const VIP_BENEFITS: VipBenefit[] = [
  { parts: [{ text: "Special discounts of 15% to 25% on all consumption:", strong: true }, { text: " entrance fee, restaurants, coffee shop, wine bar, videoke, massage, spa, conference room, events, amusement games, adventure games, eco-farming experience, native products shops, and staycation." }] },
  { parts: [{ text: "The " }, { text: "Gold VIP Privilege Card", strong: true }, { text: " has a 20-year validity." }] },
  { parts: [{ text: "Advance reservation rights.", strong: true }, { text: " A VIP Privilege Cardholder can make reservations one month in advance, while a non-cardholder can only reserve one week in advance, giving the primary cardholder an advantage during peak times." }] },
  { parts: [{ text: "No annual maintenance fees,", strong: true }, { text: " plus birthday gifts and complimentary welcome drinks." }] },
];

/** Section copy for the VIP Privilege page (owner's reference design, 2026-11-17). */
export const VIP_PAGE = {
  hero: { image: { src: "/images/site/home/arial-1-scaled.webp", alt: "Aerial view of the AFhomes resort grounds" } },
  cards: {
    eyebrow: "Choose your card",
    title: "Gold, Silver or Bronze",
    text: "Every card gives a fixed VIP discount on all consumption, free entrance for the cardholder and priority reservation rights.",
  },
  benefits: {
    eyebrow: "Benefits",
    title: "What the card grants the Primary Cardholder",
    image: { src: "/images/site/resort/amenities-w-pool1.webp", alt: "A resort pool with loungers and umbrellas" },
  },
  disclaimer: { eyebrow: "Important", title: "Disclaimer" },
  closing: {
    titleStart: "Experience your",
    titleAccent: "home away from home",
    text: "Imagine a place where comfort meets excitement, and every moment feels like a dream come true. Your home away from home awaits!",
    image: { src: "/images/site/resort/amenities-w-terraces-pool1.webp", alt: "The resort terrace pool" },
  },
};

export const VIP_TIER_PERKS: string[] = [...STANDARD_PERKS];

export const VIP_POINTS_NOTE =
  "Annual Welcome Gift: Loyalty Stay Points for accommodation. Each year's points are released when that year's qualifying spend at AFhomes is met.";

export function formatPoints(points: number): string {
  return new Intl.NumberFormat("en-PH").format(points);
}
