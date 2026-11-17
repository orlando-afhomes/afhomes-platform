/**
 * Public website content carried over from the old afhomes.com.ph site (owner decision UI22).
 * Typos fixed, no new facts. Bank and support details live in `../support-info.ts`.
 */
export const SITE = {
  name: "AFhomes",
  groupName: "AFhomes Group of Companies",
  tagline: "Amazing and Fun, Homestyle & Wellness",
  slogan: "Amazing & Fun, Your Home Away From Home",
  corporateName: "AFhomes Hotspring & Ecofarm Resort Corp.",
  facebookUrl: "https://www.facebook.com/AFHomes.Hotspring.and.Ecofarm.Resort",
  infoEmail: "info@afhomes.com.ph",
  hrEmail: "hrconnect@afhomes.com.ph",
  sec: "SEC REG. NO.: 2024020136881-29",
  bir: "BIR 2303 OCN: 056RC20240000003585",
} as const;

export type Office = { id: string; label: string; name: string; lines: string[]; landmark?: string };

export const OFFICES: Office[] = [
  {
    id: "satellite",
    label: "Satellite Office",
    name: "AFhomes Hotspring & Ecofarm Resort Corp.",
    lines: ["Alaminos Commercial Complex", "Maharlika Road, Brgy. San Juan, Alaminos, Laguna", "2nd Floor, Units 201-207"],
    landmark: "Located above Puregold Alaminos",
  },
  {
    id: "head",
    label: "Head Office",
    name: "AFhomes Hotspring & Ecofarm Resort Corp.",
    lines: ["Brgy. Perez, Calauan, Laguna", "Region IV-A (CALABARZON), 4012"],
  },
];

export const DISCLAIMER =
  "AFhomes is a hospitality and resort developer and operator. We do not offer real estate investments, timeshares, club shares, or any form of investment or securities. All developments are intended for tourism, hospitality, and leisure purposes only.";

export const PAYMENT_DISCLAIMER =
  "All payments must be made directly to the AFhomes Finance Department through official and verified channels only (see the FAQ). AFhomes does not authorize any agent, broker, or third party to collect payments on its behalf. The company shall not be held liable for any loss, misappropriation, or dispute arising from payments made outside of the official AFhomes Finance Department.";

export const RENDERINGS_NOTE = "All images are architectural renderings.";

export type NavLink = { href: string; label: string; description?: string; imageSrc?: string };

export const EXPERIENCE_LINKS: NavLink[] = [
  { href: "/experiences/hotspring-ecofarm-resort", label: "Hotspring & Ecofarm Resort", description: "Our flagship 60-hectare destination", imageSrc: "/images/site/resort/1-masterplan-new.webp" },
  { href: "/experiences/smart-wellness-hotel", label: "Smart Wellness Hotel", description: "Your sleep health expert", imageSrc: "/images/site/hotel/smart-wellness-pod-1024x797.webp" },
  { href: "/experiences/alm-japanese-restaurant", label: "ALM Japanese Restaurant", description: "Teppanyaki and refined dining", imageSrc: "/images/site/restaurant/afhomes-resto-v4-1024x683.webp" },
];

export const MAIN_NAV: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/vip-privilege", label: "VIP Privilege" },
  { href: "/compliance", label: "Compliance" },
  { href: "/faq", label: "FAQ" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

/** Public actions shown at the right of the header and in the phone menu. Sales Sign-In is deliberately not linked anywhere public (owner decision, 2026-11-17); sellers type /login/sales. */
export const ACTION_LINKS: NavLink[] = [
  { href: "/verify", label: "Verify Accreditation" },
  { href: "/vip-privilege#cards", label: "Join VIP" },
];

/** Footer link columns. Every target is an existing route (checked by public-links.test.tsx). */
export const FOOTER_COLUMNS: { heading: string; links: NavLink[] }[] = [
  { heading: "Explore", links: MAIN_NAV.filter((link) => link.href !== "/") },
  { heading: "Experiences", links: EXPERIENCE_LINKS },
  {
    heading: "Access",
    links: [
      { href: "/verify", label: "Verify Accreditation" },
      { href: "/login", label: "Staff Login" },
    ],
  },
];
