import { img, type Highlight } from "./experiences";

/** About page content copied from the old site (owner decision UI22). */
export const ABOUT = {
  banner: "The 1st largest homestyle hotspring",
  bannerTagline: "Amazing and Fun, Your Home Away from Home",
  title: "About Us",
  subtitle: "Your Trusted Resort Developer and Operator in the Philippines",
  hero: img("home/arial-1-scaled", "Aerial view of the AFhomes resort grounds"),
  intro: [
    "AFhomes is a company built on good faith, mission, and gratitude. We believe in a culture that is joyful and open.",
    "AFhomes Group is a diversified hospitality and wellness conglomerate, spanning eco-tourism, premium food and beverage concepts, and advanced wellness hospitality.",
    "AFhomes Group focuses on upscale restaurant, hotel and resort development and management, dedicated to pioneering all-in-one hospitality destinations that deliver “Amazing & Fun, Homestyle & Wellness” experiences in the Philippines.",
    "As a core component of our market positioning strategy, the AFhomes Group operates a multi-tiered development model. This strategy allows us to deploy specialized, high-end boutique services through immediate-launch operations while our larger flagship project undergoes long-term, sequential compliance processing.",
  ],
  nowOpen: {
    title: "Now Open: Alaminos Branch Operations",
    text: "To provide immediate, elite service delivery to our Loyalty VIP cardholders, we have launched two independent subsidiary operations in Alaminos that represent the pinnacle of gourmet dining and intelligent comfort.",
  },
  restaurant: {
    title: "AFhomes ALM Japanese Restaurant",
    status: "Now open",
    text: "A 600sqm culinary landmark operating as an independent subsidiary with its own dedicated industrial-scale kitchen.",
    points: [
      { title: "Elite Teppanyaki Experience", text: "Discover the art of Japanese cuisine at our signature tables, where skilled chefs perform live culinary theater for our guests." },
      { title: "Upscale Infrastructure", text: "Featuring an exclusive lounge and reception area, perfectly suited for private family gatherings and refined corporate events." },
    ] satisfies Highlight[],
  },
  hotel: {
    title: "AFhomes Smart Wellness Hotel",
    status: "Grand opening: November 2026",
    text: "An upscale sanctuary designed to bridge the gap between luxury lodging and wellness science. Featuring 18 rooms: 1 signature suite and 17 smart wellness equipped rooms. Every accommodation is an adaptive ecosystem optimized for restorative stays.",
    advantage: [
      { title: "Non-Contact Sleep Intelligence", text: "Every room utilizes advanced mmWave sensors to monitor breathing patterns and sleep cycles, without the need for wearable devices or cameras." },
      { title: "Adaptive Airway Support", text: "The system is designed to detect sleep interruptions and snoring, automatically triggering environmental adjustments to support respiratory comfort throughout the night." },
      { title: "Negative Ion Refreshers", text: "Integrated “Forest-Ion” generators clear the air of micro-particles, creating a crisp, fresh atmosphere that promotes deep relaxation." },
      { title: "Smart AQI (Air Quality Index) Monitoring", text: "Real-time sensors track and maintain perfect indoor air quality, ensuring you breathe the purest air possible." },
    ] satisfies Highlight[],
    oxygenIntro: "Our unique Atmospheric Oxygen Enrichment system provides tangible lifestyle benefits during your stay:",
    oxygen: [
      { title: "Enhanced Recovery", text: "Elevated O₂ levels help accelerate recovery from travel fatigue and physical exhaustion." },
      { title: "Cognitive Clarity", text: "Improved oxygenation supports mental focus and alertness, making our suites ideal for high-performing professionals." },
      { title: "Deepened Sleep", text: "By maintaining an oxygen-rich atmosphere, the body can remain in deep, restorative sleep phases for longer periods." },
    ] satisfies Highlight[],
    analytics: "Smart Sleep Report: to support your wellness journey, guests can access data upon request, visualizing their sleep efficiency and breathing rhythms during their stay (to understand snoring and obstructive sleep apnea).",
  },
  vip: {
    title: "VIP Privilege Loyalty Program",
    text: "The AFhomes VIP Privilege Loyalty Program is the smart choice for health, family fun, and status. VIP privilege offers immediate, upscale service delivery across our entire operational network. Enjoy exclusive benefits at the AFhomes Smart Wellness Hotel, dine at AFhomes ALM Japanese Restaurant, and secure priority access and privileges as our flagship hotspring & ecofarm resort phases come to life.",
    quote: "Your VIP privilege is not just a card. It is your passport to the complete AFhomes experience, today and tomorrow.",
  },
  why: [
    { title: "Pioneer in Homestyle Hospitality", text: "We created a category that did not exist: all-in-one resort destinations that feel like home." },
    { title: "Wellness-First Philosophy", text: "From smart wellness hotel technology to natural hotsprings, everything we build is designed for your health and restoration." },
    { title: "Responsible Development", text: "We build phase by phase with full compliance, ensuring every project meets the highest environmental and regulatory standards." },
    { title: "Immediate Value", text: "Our Alaminos operations are open now. You don't have to wait to experience AFhomes quality." },
    { title: "Strategic Location", text: "Just 1 hour and 30 minutes from Manila via Taguig Skyway and SLEX, our Laguna destinations are the perfect escape from city life." },
  ] satisfies Highlight[],
  transparency: {
    title: "Our Commitment to Transparency",
    text: "We follow a strict, step-by-step Integrated Management System. At AFhomes, we build more than resorts. We create destinations people love to return to.",
    image: img("about/compliance-milestones-v2-scaled", "Compliance milestones"),
  },
  registrations: [
    { label: "SEC REG. NO.: 2024020136881-29", image: img("about/1280px-sec-philippines-logo-official-1024x633", "Securities and Exchange Commission logo") },
    { label: "BIR 2303 OCN: 056RC20240000003585", image: img("about/1280px-bureau-of-internal-revenue-bir-svg-1024x1024", "Bureau of Internal Revenue logo") },
  ],
  vision: "To redefine Philippine hospitality by pioneering the “Amazing & Fun, Homestyle & Wellness” concept across an integrated group of upscale restaurant, hotel, and resort destinations, where sustainable luxury meets homestyle living, and every brand sets a new standard for places that feel like your favorite family gathering place.",
  mission: "To build all-in-one destinations where families and friends experience homestyle comfort in beautiful natural surroundings, combining the warmth and freedom of home with resort-quality amenities, wellness-driven technology, and endless entertainment. Through our multi-tiered model, we deliver immediate, elite service today while developing our flagship destination responsibly, phase by phase, with full environmental and regulatory compliance.",
  logo: {
    title: "AFhomes Logo Meaning",
    image: img("about/af-logo-2025-1349x1536", "The AFhomes logo"),
    text: "The letters “AF” are crafted in a fluid, rounded typeface with seamless gradient transitions flowing through coral pink, turquoise blue, sunny yellow-orange, and fresh green tones. The word “HOMES” is presented with a distinctive heart symbol replacing the letter “O,” emphasizing our commitment to heartfelt hospitality.",
    colors: [
      { title: "Coral to Pink", text: "Represents warmth, hospitality, and the welcoming embrace we extend to every guest." },
      { title: "Turquoise Blue", text: "Symbolizes tranquility, natural hot springs, and the calming waters that rejuvenate body and spirit." },
      { title: "Yellow to Orange", text: "Reflects sunshine, joy, and the “Amazing & Fun” experience we promise." },
      { title: "Green", text: "Embodies our ecofarm commitment, sustainability, and harmony with nature's lush surroundings." },
    ] satisfies Highlight[],
  },
  visit: {
    title: "Visit Us",
    address: "Brgy. Perez, Calauan, Laguna, Region IV-A (CALABARZON), 4012",
    travel: "Only 1 hour and 30 minutes travel from SLEX Taguig Skyway to the resort, and expected to be only 40 minutes once the Alaminos TR4 exit becomes fully accessible.",
    text: "The resort is strategically located in Calauan, Laguna, making it very accessible from Manila, Cavite, Batangas, Bulacan, and the rest of Luzon through existing highways and the ongoing SLEX extension TR4. The municipality of Calauan is abundant in natural spring water and lush woods, especially fruit trees.",
    map: img("about/map-1-scaled", "Map to the AFhomes Hotspring & Ecofarm Resort in Calauan, Laguna"),
  },
};
