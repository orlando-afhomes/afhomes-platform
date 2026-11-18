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

/** `map.embedSrc` is the owner-supplied Google Maps embed URL; `map.href` opens the same place in Google Maps. */
export type Office = { id: string; label: string; name: string; lines: string[]; landmark?: string; map: { embedSrc: string; href: string } };

export const OFFICES: Office[] = [
  {
    id: "satellite",
    label: "Satellite Office",
    name: "AFhomes Hotspring & Ecofarm Resort Corp.",
    lines: ["Alaminos Commercial Complex", "Maharlika Road, Brgy. San Juan, Alaminos, Laguna", "2nd Floor, Units 201-207"],
    landmark: "Located above Puregold Alaminos",
    map: {
      embedSrc: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3870.2698870470545!2d121.23496237540918!3d14.061233886363397!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bd69007c5d7a7b%3A0x51868980e31a27b7!2sAFHomes%20Satellite%20Office!5e0!3m2!1sen!2sph!4v1794920507607!5m2!1sen!2sph",
      href: "https://www.google.com/maps/search/?api=1&query=AFHomes%20Satellite%20Office%2C%20Alaminos%2C%20Laguna",
    },
  },
  {
    id: "head",
    label: "Head Office",
    name: "AFhomes Hotspring & Ecofarm Resort Corp.",
    lines: ["Brgy. Perez, Calauan, Laguna", "Region IV-A (CALABARZON), 4012"],
    map: {
      embedSrc: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3869.5602722871154!2d121.25441907541052!3d14.103115786326342!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bd67003f398345%3A0x88aba5401f799eed!2s(Under%20construction)%20AFhomes%20Hotspring%20and%20Ecofarm%20Resort!5e0!3m2!1sen!2sph!4v1794920555735!5m2!1sen!2sph",
      href: "https://www.google.com/maps/search/?api=1&query=AFhomes%20Hotspring%20and%20Ecofarm%20Resort%2C%20Calauan%2C%20Laguna",
    },
  },
];

/** Footer and Contact page anchor for one office's map. */
export const officeMapAnchor = (office: Office) => `map-${office.id}`;

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
