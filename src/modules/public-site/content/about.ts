import { img, type SiteImage } from "./experiences";

/** A short titled item, optionally with a photo. */
export type AboutItem = { title: string; text: string; image?: SiteImage };

/**
 * About page content. Layout and copy follow the owner's About reference design (2026-11-17).
 * The SEC and BIR registrations are kept on purpose (owner decision, same day).
 */
export const ABOUT = {
  hero: img("home/arial-1-scaled", "Aerial view of the AFhomes resort grounds"),
  heroCopy: {
    eyebrow: "About AFhomes",
    title: "About AFhomes",
    accent: "A Premier Resort Lifestyle",
    lede: "Pioneering resort destinations that blend relaxation, wellness, and meaningful experiences in harmony with nature.",
  },
  story: {
    eyebrow: "Our story",
    title: "The AFhomes Story",
    paragraphs: [
      "AFhomes is a hospitality and resort development company committed to creating distinctive, nature-inspired destinations for relaxation, wellness, and family experiences.",
      "From our flagship AFhomes Hotspring & Ecofarm Resort to a growing portfolio of premium experiences, we combine warm Filipino hospitality, sustainable development, and long-term value for our members, guests, and partners.",
    ],
    image: img("resort/18", "A natural geothermal hot spring pool at the resort"),
    values: [
      { title: "Resort Lifestyle", text: "Nature, wellness, and relaxation in one destination." },
      { title: "Growing Community", text: "Members and guests who value meaningful experiences." },
      { title: "Lasting Value", text: "Sustainable development for families and future generations." },
    ] satisfies AboutItem[],
  },
  experiences: {
    eyebrow: "Our experiences",
    title: "Distinctive Resort Experiences",
    text: "A curated collection of resort experiences for leisure, wellness, and culinary excellence.",
    cards: [
      { href: "/experiences/alm-japanese-restaurant", title: "ALM Japanese Restaurant", text: "A 600sqm landmark for authentic Japanese dining.", image: img("hotel/teppan-scene-2-ps-1-1024x683", "Teppanyaki dining at the ALM Japanese Restaurant") },
      { href: "/experiences/smart-wellness-hotel", title: "Smart Wellness Hotel", text: "A wellness-focused hotel with 18 restful rooms.", image: img("hotel/room-1024x683", "A room at the AFhomes Smart Wellness Hotel") },
      { href: "/experiences/hotspring-ecofarm-resort", title: "Hotspring & Ecofarm Resort", text: "Our flagship 60-hectare hot spring and ecofarm resort.", image: img("resort/1-masterplan-new", "Masterplan of the AFhomes Hotspring & Ecofarm Resort") },
    ],
  },
  featured: {
    eyebrow: "Featured destination",
    title: "AFhomes Hotspring & Ecofarm Resort",
    text: "A 60-hectare sanctuary in Calauan, Laguna, where natural hot springs, ecofarm living, and modern resort comforts come together for a complete lifestyle escape.",
    href: "/experiences/hotspring-ecofarm-resort",
    cta: "Explore resort",
    image: img("resort/amenities-w-park1", "The resort park"),
    features: [
      { title: "Natural Hotsprings", text: "Relax and rejuvenate in mineral-rich, natural hot springs." },
      { title: "Ecofarm Experience", text: "Connect with nature through sustainable farming and agri-activities." },
      { title: "Resort Amenities", text: "Comfortable stays, leisure areas, and family-friendly facilities." },
    ] satisfies AboutItem[],
  },
  transparency: {
    eyebrow: "Our commitment",
    title: "Commitment to Transparency",
    text: "We believe in responsible, compliant, and trustworthy operations. AFhomes upholds industry standards, regulatory compliance, and ethical business practices in all our developments.",
    points: [
      "Legitimate and properly documented operations",
      "Compliance with environmental and local regulations",
      "Commitment to safety, sustainability, and community development",
    ],
    href: "/verify",
    cta: "Verify Accreditation",
    image: img("about/compliance-milestones-v2-scaled", "Compliance milestones overview"),
  },
  registrations: [
    { label: "SEC REG. NO.: 2024020136881-29", image: img("about/1280px-sec-philippines-logo-official-1024x633", "Securities and Exchange Commission logo") },
    { label: "BIR 2303 OCN: 056RC20240000003585", image: img("about/1280px-bureau-of-internal-revenue-bir-svg-1024x1024", "Bureau of Internal Revenue logo") },
  ],
  vip: {
    eyebrow: "VIP Privilege",
    title: "Exclusive Member Benefits",
    text: "Enjoy elevated perks and long-term value across the entire AFhomes resort portfolio.",
    href: "/vip-privilege#cards",
    cta: "Compare Memberships",
  },
  awaits: {
    eyebrow: "The resort lifestyle",
    title: "What Awaits at the Resort",
    text: "More than a stay: discover experiences that relax, delight, and reconnect you with what matters.",
    items: [
      { title: "Hot Spring & Wellness", text: "Relax, recharge, and restore balance in natural hot springs.", image: img("resort/18", "A natural geothermal hot spring pool") },
      { title: "Culinary Experiences", text: "Savor authentic flavors at our signature Japanese restaurant.", image: img("hotel/teppan-scene-2-ps-1-1024x683", "Teppanyaki dining") },
      { title: "Agri & Nature Experience", text: "Enjoy hands-on ecofarm activities and a closer connection to nature.", image: img("resort/chatgpt-image-apr-18-2026-03-30-11-pm", "The regenerative agriculture ecofarm") },
      { title: "Health & Relaxation", text: "Wellness services designed to help you unwind and feel renewed.", image: img("resort/chatgpt-image-apr-18-2026-02-55-34-pm", "The bamboo spa sanctuary") },
    ] satisfies AboutItem[],
  },
  /** Official company statements; kept word for word. */
  mission: "To build all-in-one destinations where families and friends experience homestyle comfort in beautiful natural surroundings, combining the warmth and freedom of home with resort-quality amenities, wellness-driven technology, and endless entertainment. Through our multi-tiered model, we deliver immediate, elite service today while developing our flagship destination responsibly, phase by phase, with full environmental and regulatory compliance.",
  vision: "To redefine Philippine hospitality by pioneering the “Amazing & Fun, Homestyle & Wellness” concept across an integrated group of upscale restaurant, hotel, and resort destinations, where sustainable luxury meets homestyle living, and every brand sets a new standard for places that feel like your favorite family gathering place.",
  logo: {
    eyebrow: "Our brand",
    title: "The AFhomes Logo Meaning",
    text: "The AFhomes logo represents our core identity: A and F for AFhomes, shaped in a modern, vibrant form that symbolizes people, places, and experiences coming together.",
    image: img("about/af-logo-2025-1349x1536", "The AFhomes logo"),
    parts: [
      { title: "A & F", text: "The foundation of AFhomes." },
      { title: "Vibrant Colors", text: "Hospitality, nature, and life at the resort." },
      { title: "Flowing Form", text: "Connection, movement, and lasting experiences." },
      { title: "Homes", text: "A sense of belonging and comfort for every guest." },
    ] satisfies AboutItem[],
  },
  visit: {
    eyebrow: "Visit us",
    title: "Come and Experience AFhomes",
    text: "Visit our flagship destination, AFhomes Hotspring & Ecofarm Resort, located in Calauan, Laguna. Discover a resort escape where wellness, nature, and hospitality come together.",
    address: "Brgy. Perez, Calauan, Laguna, Region IV-A (CALABARZON), 4012",
    cta: "Get Directions",
  },
  closing: {
    title: "Be Part of the AFhomes Experience",
    text: "Relax. Reconnect. Live the resort lifestyle.",
    href: "/vip-privilege#cards",
    cta: "Join VIP",
    image: img("resort/amenities-w-pool-with-fountain", "A resort pool with a fountain"),
  },
};
