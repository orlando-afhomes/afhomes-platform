/** Experience pages: resort, smart wellness hotel and ALM restaurant (owner decision UI22). */
const IMG = "/images/site";

export type SiteImage = { src: string; alt: string };
export const img = (path: string, alt: string): SiteImage => ({ src: `${IMG}/${path}.webp`, alt });

export type Highlight = { title: string; text: string; image?: SiteImage };

export const EXPERIENCE_CARDS = [
  {
    href: "/experiences/hotspring-ecofarm-resort",
    title: "Hotspring & Ecofarm Resort",
    status: "In development",
    statusTone: "progress" as const,
    text: "Our flagship 60-hectare destination. Built phase by phase.",
    image: img("resort/1-masterplan-new", "Masterplan of the AFhomes Hotspring & Ecofarm Resort"),
  },
  {
    href: "/experiences/smart-wellness-hotel",
    title: "Smart Wellness Hotel",
    status: "Grand opening November 2026",
    statusTone: "upcoming" as const,
    text: "An upscale sanctuary for wellness. It offers 18 rooms.",
    image: img("hotel/smart-wellness-pod-1024x797", "A smart wellness room"),
  },
  {
    href: "/experiences/alm-japanese-restaurant",
    title: "ALM Japanese Restaurant",
    status: "Now open",
    statusTone: "live" as const,
    text: "A 600sqm culinary landmark. It has an industrial-scale kitchen.",
    image: img("restaurant/afhomes-resto-v4-1024x683", "The AFhomes ALM Japanese Restaurant"),
  },
];

export const NATURAL_FEATURES: Highlight[] = [
  { title: "Overflowing Natural Hotsprings", text: "Natural geothermal springs for relaxation and wellness." },
  { title: "Infinity Overlooking Views", text: "Luxurious accommodations designed with breathtaking, expansive vistas of the surrounding mountains and countryside." },
  { title: "Integrated Ecofarm", text: "A sustainable sanctuary featuring farming education, nature-based attractions, and eco-friendly activities designed for wellness and family bonding." },
];

export const KEY_OFFERINGS: Highlight[] = [
  {
    title: "Natural Geothermal Hot Springs Pools",
    text: "Our geothermal pools unlock deep healing relaxation. Feel tensions ease as warm, mineral-rich waters envelop your skin. Restore your vibrancy amid abundant nature.",
    image: img("resort/18", "A natural geothermal hot spring pool"),
  },
  {
    title: "Luxury Villas with Farm-to-Table Dining",
    text: "Step into your private villa, an intimate sanctuary amidst nature's bounty. Floor-to-ceiling windows invite lush tropical gardens inside, and your personal balcony overlooks swaying trees. Friendly staff tend discreetly to every need.",
    image: img("resort/beautiful-shot-modern-house-kitchen-dining-room", "A villa kitchen and dining room"),
  },
  {
    title: "Regenerative Agriculture EcoFarm",
    text: "We cultivate boutique organic produce across our on-site ecofarm, following the highest standards in sustainable ecofarming. Our farm-to-table cuisine offers the freshest, most nutritious meals imaginable.",
    image: img("resort/chatgpt-image-apr-18-2026-03-30-11-pm", "The regenerative agriculture ecofarm"),
  },
  {
    title: "Bamboo Spa Sanctuary",
    text: "We integrate wellness across all programs, from our thermally-heated spa to nutrition workshops and nature-based activities guided by expert practitioners. Our retreat nurtures body, mind, and spirit.",
    image: img("resort/chatgpt-image-apr-18-2026-02-55-34-pm", "The bamboo spa sanctuary"),
  },
];

export const RESORT_ACTIVITIES = ["Hot Spring Pools", "Eco Farm produce", "Nature walks", "Kayaking", "Farm tours", "Workshops", "Cultural nights"];

export const RESORT_AMENITIES: SiteImage[] = [
  img("resort/amenities-w-entrance1", "The resort entrance"),
  img("resort/amenities-w-pool1", "A large public pool"),
  img("resort/amenities-w-pool-with-slides1", "A pool with slides"),
  img("resort/amenities-w-pool-with-fountain", "A pool with a fountain"),
  img("resort/amenities-w-terraces-pool1", "The terrace pool"),
  img("resort/amenities-w-glamping-pool1", "The glamping pool"),
  img("resort/amenities-w-basketball-court1", "The outdoor basketball court"),
  img("resort/amenities-w-park1", "The park"),
  img("resort/amenities-w-playground1", "The kids playground"),
  img("resort/amenities-w-restaurant1", "The resort restaurant"),
];

export type RoomCategory = "villa" | "a-frame" | "glamping";
export type Room = { id: string; name: string; category: RoomCategory; photos: SiteImage[]; floorPlan?: SiteImage };

/** Singular room type shown on a single room card. */
export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = { villa: "Villa", "a-frame": "A-Frame", glamping: "Glamping" };

export const ROOMS: Room[] = [
  { id: "king-villa", name: "King Villa", category: "villa", photos: [img("rooms/king-villa", "King Villa"), img("rooms/king-villa-top-1", "King Villa seen from above"), img("rooms/king-villa-side-1", "King Villa seen from the side")], floorPlan: img("rooms/1-king-villa", "King Villa floor plan") },
  { id: "queen-villa", name: "Queen Villa", category: "villa", photos: [img("rooms/queen-villa", "Queen Villa"), img("rooms/queen-villa-1", "Queen Villa exterior"), img("rooms/queen-villa-2", "Queen Villa living area")], floorPlan: img("rooms/queen-villa-floor-plan-1", "Queen Villa floor plan") },
  { id: "three-bedroom", name: "3 Bedroom Deluxe Villa", category: "villa", photos: [img("rooms/3-bedroom-deluxe-villa", "3 Bedroom Deluxe Villa"), img("rooms/3br-top-1", "3 Bedroom Deluxe Villa seen from above"), img("rooms/3br-side-1", "3 Bedroom Deluxe Villa seen from the side")] },
  { id: "two-bedroom", name: "2 Bedroom Deluxe Villa", category: "villa", photos: [img("rooms/2-bedroom-1-4", "2 Bedroom Deluxe Villa"), img("rooms/2-bedroom-2-4", "2 Bedroom Deluxe Villa interior")] },
  { id: "one-bedroom", name: "1 Bedroom Deluxe Villa", category: "villa", photos: [img("rooms/1-bedroom-deluxe-villa", "1 Bedroom Deluxe Villa")] },
  { id: "premier-a-frame", name: "Premier A-Frame", category: "a-frame", photos: [img("rooms/premier-a-frame", "Premier A-Frame"), img("rooms/a-frame-6-min", "Premier A-Frame interior")] },
  { id: "deluxe-a-frame", name: "Deluxe A-Frame", category: "a-frame", photos: [img("rooms/deluxe-a-framze-low-size-4-1", "Deluxe A-Frame")] },
  { id: "premier-glamping", name: "Premier Glamping", category: "glamping", photos: [img("rooms/premier-glamping", "Premier Glamping"), img("rooms/premier-glamping-1-1", "Premier Glamping interior")] },
  { id: "deluxe-glamping", name: "Deluxe Glamping", category: "glamping", photos: [img("rooms/deluxe-glamping-1-1", "Deluxe Glamping")] },
];

/** Accommodation types listed in the old FAQ; some are not shown with photos yet. */
export const ACCOMMODATION_TYPES = [
  "Deluxe Glamping", "Premier Glamping", "Deluxe A-Frames", "Premier A-Frames", "Deluxe Villas (1 BR)", "Deluxe Villas (2 BR)", "Deluxe Villas (3 BR)",
  "Premier Queen Villas", "Premier King Villas", "Skyline Club Hotel (7-storey)", "Deluxe Camping (Small & Large)", "Premier Camping (Small & Large)",
];

export const HOTEL = {
  status: "Grand opening: November 2026",
  eyebrow: "Your sleep health expert",
  title: "AFhomes Smart Wellness Hotel",
  lede: "Bridging luxury lodging and wellness science.",
  intro:
    "18 rooms: one signature suite and 17 smart wellness rooms. Every stay is tuned for deeper rest.",
  hero: img("hotel/s-1-ps-985x1024", "The AFhomes Smart Wellness Hotel"),
  features: [
    { title: "Smart Sleep Intelligence", text: "Contact-free sensors track breathing and sleep cycles. No wearables or cameras." },
    { title: "Atmospheric Oxygen Enrichment", text: "Elevated oxygen supports recovery, focus, and deeper sleep." },
    { title: "Forest-Ion & AQI Control", text: "Negative ions and live air-quality sensors keep the room fresh." },
    { title: "Personalized Guest Analytics", text: "Request your Smart Sleep Report to review sleep efficiency and breathing patterns." },
  ] satisfies Highlight[],
  apnea: { title: "Do you know about sleep apnea?", text: "Sleep apnea is more common than you think and serious if left untreated.", image: img("hotel/apnea-scaled", "Sleep apnea information") },
  gallery: [img("hotel/smart-wellness-pod-1024x797", "A smart wellness room"), img("hotel/reception-1024x683", "The hotel reception"), img("hotel/room-1024x683", "A hotel room")],
  lounge: {
    title: "The Smart Wellness Lounge",
    text: "Dining, coffee, wine, and sauna—all without leaving the hotel.",
    items: [
      { title: "In-House Teppanyaki Food Service", text: "Live teppanyaki by ALM chefs, steps from your room.", image: img("hotel/teppan-scene-2-ps-1-1024x683", "The teppanyaki counter") },
      { title: "Coffee & Wine Bar", text: "Coffee by day, wine by evening, in a quiet lounge.", image: img("hotel/2-coffee-wine-bar-1-1024x683", "The coffee and wine bar") },
      { title: "Sauna Rooms", text: "Private sauna sessions to complement your sleep-focused stay.", image: img("hotel/sauna-1024x683", "A private sauna room") },
    ] satisfies Highlight[],
  },
};

export const RESTAURANT = {
  status: "Now open",
  title: "AFhomes ALM Japanese Restaurant",
  hero: img("restaurant/afhomes-resto-v4-1024x683", "The AFhomes ALM Japanese Restaurant"),
  intro: [
    "A 600-square-meter Japanese restaurant with its own industrial kitchen, lounge, and reception. Refined interiors and attentive service set the stage.",
    "Built for family celebrations, business dinners, corporate functions, and private events.",
  ],
  sections: [
    { title: "Authentic Japanese Cuisine", text: "Sushi, maki, and teppanyaki prepared with fresh meat, seafood, and vegetables." },
    { title: "Signature Refreshments", text: "Alcohol-free mocktails and botanical blends made to pair with Japanese flavors." },
    { title: "Premium Coffee Selection", text: "Cappuccino, latte, and freshly brewed coffee to close the meal." },
  ] satisfies Highlight[],
  closing: "Book ahead for an intimate dinner or a milestone celebration.",
  reservation: "Reservations only. No walk-ins accepted.",
  tagline: "Discover a place where Japanese culinary tradition meets modern sophistication.",
};

export const RESORT = {
  title: "AFhomes Hotspring & Ecofarm Resort",
  tagline: "Amazing and Fun, Your Home Away from Home",
  banner: "First largest homestyle hotspring resort in Laguna",
  intro:
    "Our flagship 60-hectare master-planned destination in Laguna is our most ambitious project to date. Due to the massive scale of this development and our commitment to rigorous environmental and governmental compliance, it is being built phase by phase.",
  masterplan: img("resort/1-masterplan-new", "Masterplan of the AFhomes Hotspring & Ecofarm Resort"),
  roomsIntro: "Discover the perfect blend of luxury and convenience in our villas, featuring top-notch amenities for a comfortable stay.",
  roomsNote: "All images shown are architectural renderings, and the rates are effective upon opening.",
  activitiesIntro: "AFhomes Hotspring & Ecofarm Resort in Calauan, Laguna offers hot springs, organic cuisine and villas.",
};

/**
 * Experience detail pages, laid out from the owner's resort detail reference design (2026-11-17).
 * Only facts already on the site are used: no guest counts, prices or accreditations were added.
 */
export const RESORT_PAGE = {
  hero: {
    eyebrow: "AFhomes Hotspring & Ecofarm Resort",
    title: RESORT.title,
    lede: "A homestyle resort destination in Calauan, Laguna that blends relaxation, wellness, leisure, and nature.",
    status: "In development",
    statusTone: "progress" as const,
    image: img("home/arial-1-scaled", "Aerial view of the AFhomes resort grounds"),
  },
  overview: {
    eyebrow: "Resort overview",
    title: "A 60-hectare master-planned destination in Laguna",
    text: RESORT.intro,
    features: [
      { title: "Master-planned Resort Living", text: "A 60-hectare destination, built phase by phase with full environmental and regulatory compliance." },
      ...NATURAL_FEATURES,
    ] satisfies Highlight[],
  },
  rooms: { eyebrow: "Stay and accommodations", title: "Where luxury meets convenience", text: RESORT.roomsIntro, note: RESORT.roomsNote },
  amenities: { eyebrow: "Amenities", title: "Fun for every age", text: "Pools, a playground, courts, parks and restaurants, all in one gated and guarded resort." },
  awaits: { eyebrow: "Resort lifestyle", title: "What awaits you", text: "More than a stay: hot spring pools, homestyle villas, ecofarm living, and spa wellness in one resort." },
  location: {
    eyebrow: "Location",
    title: RESORT.activitiesIntro,
    activities: RESORT_ACTIVITIES,
    sitePlan: {
      title: "Resort Site Plan",
      text: "The 60-hectare master plan brings together accommodations, hot spring facilities, ecofarm areas, and recreational spaces.",
      image: RESORT.masterplan,
    },
    map: { title: "Resort Location", text: "Find the resort in Brgy. Perez, Calauan, Laguna, and open the route in Google Maps." },
  },
  closing: {
    title: "Experience your home away from home",
    text: "Imagine a place where comfort meets excitement, and every moment feels like a dream come true. Your home away from home awaits!",
    image: img("resort/amenities-w-pool-with-fountain", "A resort pool with a fountain"),
  },
};

export const HOTEL_PAGE = {
  hero: { eyebrow: HOTEL.eyebrow, title: HOTEL.title, lede: HOTEL.lede, status: HOTEL.status, statusTone: "upcoming" as const, image: HOTEL.gallery[2] },
  overview: { eyebrow: "Hotel overview", title: "Every room is an adaptive ecosystem", text: HOTEL.intro, features: HOTEL.features },
  gallery: { eyebrow: "Inside the hotel", title: "Rooms and spaces made for rest", images: HOTEL.gallery },
  apnea: HOTEL.apnea,
  lounge: { eyebrow: "Beyond the rooms", title: HOTEL.lounge.title, text: HOTEL.lounge.text, items: HOTEL.lounge.items },
  closing: { title: "Grand opening: November 2026", text: "Ask us about the AFhomes Smart Wellness Hotel and your VIP Privilege Card.", image: img("hotel/reception-1024x683", "The hotel reception") },
};

/** Teppanyaki photo used as the restaurant hero and CTA background (owner request, 2026-11-18). */
const RESTAURANT_TEPPANYAKI = img("hotel/teppan-scene-2-ps-1-1024x683", "Teppanyaki dining at the ALM Japanese Restaurant");

export const RESTAURANT_PAGE = {
  hero: { eyebrow: "Alaminos, Laguna", title: RESTAURANT.title, lede: RESTAURANT.tagline, status: RESTAURANT.status, statusTone: "live" as const, image: RESTAURANT_TEPPANYAKI },
  overview: { eyebrow: "Restaurant overview", title: "A 600sqm landmark for authentic Japanese dining", text: RESTAURANT.intro, features: RESTAURANT.sections },
  reservation: {
    eyebrow: "Plan your visit",
    title: "Dinners and celebrations",
    text: RESTAURANT.closing,
    note: RESTAURANT.reservation,
    image: RESTAURANT.hero,
  },
  closing: { title: "Japanese tradition meets modern sophistication", text: "Contact our office to plan your dinner or celebration.", image: RESTAURANT_TEPPANYAKI },
};
