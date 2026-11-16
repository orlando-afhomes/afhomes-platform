/** Experience pages: resort, smart wellness hotel and ALM restaurant (owner decision UI22). */
const IMG = "/images/site";

export type SiteImage = { src: string; alt: string };
export const img = (path: string, alt: string): SiteImage => ({ src: `${IMG}/${path}.webp`, alt });

export type Highlight = { title: string; text: string; image?: SiteImage };

export const EXPERIENCE_CARDS = [
  {
    href: "/experiences/hotspring-ecofarm-resort",
    title: "AFhomes Hotspring & Ecofarm Resort",
    status: "In development",
    text: "Our flagship 60-hectare master-planned destination is our most ambitious project to date. Due to the massive scale of this development and our commitment to rigorous environmental and governmental compliance, this project is being built phase by phase.",
    image: img("resort/1-masterplan-new", "Masterplan of the AFhomes Hotspring & Ecofarm Resort"),
  },
  {
    href: "/experiences/smart-wellness-hotel",
    title: "AFhomes Smart Wellness Hotel",
    status: "Grand opening November 2026",
    text: "An upscale sanctuary designed to bridge the gap between luxury lodging and wellness science. 18 rooms: 1 signature suite and 17 smart wellness equipped rooms. Every accommodation is an adaptive ecosystem optimized for restorative stays.",
    image: img("hotel/smart-wellness-pod-1024x797", "A smart wellness room"),
  },
  {
    href: "/experiences/alm-japanese-restaurant",
    title: "AFhomes ALM Japanese Restaurant",
    status: "Now open",
    text: "A 600sqm culinary landmark operating as an independent subsidiary with its own dedicated industrial-scale kitchen.",
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

export const ROOM_FILTERS: { value: "all" | RoomCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "villa", label: "Villas" },
  { value: "a-frame", label: "A-Frames" },
  { value: "glamping", label: "Glamping" },
];

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
    "An upscale sanctuary designed to bridge the gap between luxury lodging and wellness science. Featuring 18 rooms: 1 signature suite and 17 smart wellness equipped rooms. Every accommodation is an adaptive ecosystem optimized for restorative stays.",
  hero: img("hotel/s-1-ps-985x1024", "The AFhomes Smart Wellness Hotel"),
  features: [
    { title: "Smart Sleep Intelligence", text: "Non-contact mmWave sensors monitor breathing patterns and sleep cycles. No wearables, no cameras." },
    { title: "Atmospheric Oxygen Enrichment", text: "Elevated O2 levels support travel recovery, cognitive clarity, and deeper restorative sleep." },
    { title: "Forest-Ion & AQI Control", text: "Negative-ion generators and real-time air-quality sensors maintain the purest indoor environment." },
    { title: "Personalized Guest Analytics", text: "Smart Sleep Report: to support your wellness journey, guests can access data upon request, visualizing their sleep efficiency and breathing rhythms during their stay (to understand snoring and obstructive sleep apnea)." },
  ] satisfies Highlight[],
  apnea: { title: "Do you know about sleep apnea?", text: "Sleep apnea is more common than you think and serious if left untreated.", image: img("hotel/apnea-scaled", "Sleep apnea information") },
  gallery: [img("hotel/smart-wellness-pod-1024x797", "A smart wellness room"), img("hotel/reception-1024x683", "The hotel reception"), img("hotel/room-1024x683", "A hotel room")],
  lounge: {
    title: "The Smart Wellness Lounge",
    text: "Beyond the rooms, a dedicated guest gathering space for dining, relaxation, and recovery, all without leaving the property.",
    items: [
      { title: "In-House Teppanyaki Food Service", text: "A teppanyaki dining counter within the lounge extends the signature ALM culinary standard to hotel guests, served live by skilled chefs, just steps from the rooms.", image: img("hotel/teppan-scene-2-ps-1-1024x683", "The teppanyaki counter") },
      { title: "Coffee & Wine Bar", text: "A curated coffee and wine selection in a relaxed lounge setting, available from morning service through the evening, for quiet work or unhurried conversation.", image: img("hotel/2-coffee-wine-bar-1-1024x683", "The coffee and wine bar") },
      { title: "Sauna Rooms", text: "Private sauna facilities for restorative heat therapy, a natural complement to the hotel's smart-sleep intelligence and oxygen-enriched wellness focus.", image: img("hotel/sauna-1024x683", "A private sauna room") },
    ] satisfies Highlight[],
  },
};

export const RESTAURANT = {
  status: "Now open",
  title: "AFhomes ALM Japanese Restaurant",
  hero: img("restaurant/afhomes-resto-v4-1024x683", "The AFhomes ALM Japanese Restaurant"),
  intro: [
    "A premier 600-square-meter culinary destination, AFhomes ALM Japanese Restaurant stands as a landmark dining establishment operating as an independent subsidiary with its own dedicated industrial-scale kitchen. Designed to deliver an exceptional Japanese dining experience, the restaurant combines authentic flavors, elegant interiors, and world-class hospitality.",
    "The restaurant features an exclusive lounge and reception area, providing a sophisticated setting for private family celebrations, business meetings, corporate functions, and special occasions. Every space is thoughtfully designed to offer comfort, privacy, and refined elegance.",
  ],
  sections: [
    { title: "Authentic Japanese Cuisine", text: "From expertly crafted sushi and maki rolls to flavorful teppanyaki specialties prepared with fresh meats, seafood, and vegetables, every dish is designed to showcase the rich flavors and culinary traditions of Japan. Our chefs combine traditional techniques with contemporary presentation, creating meals that satisfy both the palate and the senses." },
    { title: "Signature Refreshments", text: "Enhance your dining experience with our selection of handcrafted, alcohol-free beverages. Featuring refreshing fruit-infused mocktails, crisp botanical blends, and tropical favorites, our drinks are thoughtfully created to complement the flavors of Japanese cuisine while providing a refreshing and sophisticated alternative." },
    { title: "Premium Coffee Selection", text: "Complete your dining experience with our freshly brewed coffee offerings. From rich, aromatic coffee to smooth and creamy café favorites, each cup is carefully prepared to provide the perfect balance of flavor and comfort. Whether you're enjoying a rich cappuccino or a smooth café latte, our beverage collection provides the perfect accompaniment to any meal or gathering." },
  ] satisfies Highlight[],
  closing: "Whether you're planning an intimate dinner or celebrating a special milestone, AFhomes ALM Japanese Restaurant provides a welcoming atmosphere where exceptional food, attentive service, and elegant surroundings create an unforgettable dining experience.",
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
