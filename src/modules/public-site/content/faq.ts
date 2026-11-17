import { PUBLIC_SUPPORT_INFO } from "../support-info";
import { SITE } from "./site";

/**
 * FAQ copied from the old site (owner decision UI22). The hot-spring count differs between the old
 * About page (10) and FAQ (5), so no number is shown until the owner confirms it.
 */
export type FaqBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "terms"; items: { term: string; text: string }[] }
  | { type: "bank" };

export type FaqItem = { id: string; question: string; blocks: FaqBlock[] };

export const FAQ_INTRO = {
  title: "Frequently Asked Questions",
  lede: "Your questions answered, from bookings to the VIP Privilege Loyalty Program.",
  text: "Find answers to all your questions about AFhomes Hotspring & Ecofarm Resort. Learn about our amenities, policies, activities, and exclusive VIP Privilege Loyalty Program perks.",
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "who",
    question: "Who is AFhomes Group of Companies?",
    blocks: [
      { type: "p", text: "AFhomes Group is a diversified hospitality and wellness conglomerate, spanning eco-tourism, premium food and beverage concepts, and advanced wellness hospitality." },
      { type: "p", text: "AFhomes Group focuses on upscale restaurant, hotel and resort development and management, dedicated to pioneering all-in-one hospitality destinations that deliver “Amazing & Fun, Homestyle & Wellness” experiences in the Philippines." },
      { type: "p", text: "As a core component of our market positioning strategy, the AFhomes Group operates a multi-tiered development model. This strategy allows us to deploy specialized, high-end boutique services through immediate-launch operations while our larger flagship project undergoes long-term, sequential compliance processing." },
      { type: "terms", items: [
        { term: "Our Vision", text: "To redefine Philippine hospitality by pioneering the “Amazing & Fun, Homestyle & Wellness” concept across an integrated group of upscale restaurant, hotel, and resort destinations, where sustainable luxury meets homestyle living, and every brand sets a new standard for places that feel like your favorite family gathering place." },
        { term: "Our Mission", text: "To build all-in-one destinations where families and friends experience homestyle comfort in beautiful natural surroundings, combining the warmth and freedom of home with resort-quality amenities, wellness-driven technology, and endless entertainment. Through our multi-tiered model, we deliver immediate, elite service today while developing our flagship destination responsibly, phase by phase, with full environmental and regulatory compliance." },
      ] },
    ],
  },
  {
    id: "logo",
    question: "What is the meaning behind the AFhomes logo?",
    blocks: [
      { type: "p", text: "The AFhomes logo features a vibrant, contemporary design that embodies the warmth and vitality of our brand. The letters “AF” are crafted in a fluid, rounded typeface with seamless gradient transitions flowing through coral pink, turquoise blue, sunny yellow-orange, and fresh green tones. Below, the word “HOMES” is presented with a distinctive heart symbol replacing the letter “O,” emphasizing our commitment to heartfelt hospitality." },
      { type: "terms", items: [
        { term: "Coral to Pink", text: "Represents warmth, hospitality, and the welcoming embrace we extend to every guest." },
        { term: "Turquoise Blue", text: "Symbolizes tranquility, natural hot springs, and the calming waters that rejuvenate body and spirit." },
        { term: "Yellow to Orange", text: "Reflects sunshine, joy, and the “Amazing & Fun” experience we promise." },
        { term: "Green", text: "Embodies our ecofarm commitment, sustainability, and harmony with nature's lush surroundings." },
      ] },
    ],
  },
  {
    id: "hotsprings",
    question: "What makes AFhomes' hotsprings special?",
    blocks: [
      { type: "p", text: "AFhomes features authentic natural hot springs that flow directly from the mountain without any artificial drilling or pumping. Unlike other commercial resorts that require expensive deep-well drilling, AFhomes' hotsprings emerge naturally with pure mineral content and reach optimal temperatures of around 41℃, classified as mid-temperature (mesothermal) springs that are perfect for therapeutic bathing." },
      { type: "p", text: "With zero environmental impact, guests enjoy a genuine geothermal experience with natural health benefits in a pristine mountain setting. Guaranteed authentic experience: no artificial heating or chemical treatment." },
    ],
  },
  {
    id: "homestyle",
    question: "What is a Homestyle Resort?",
    blocks: [
      { type: "p", text: "AFhomes reimagines the traditional resort experience by truly understanding what families need. We've studied common frustrations to create something genuinely different: a space where families can live, laugh, and create memories together with the convenience and luxuries of a resort, but the comfort and freedom of home." },
      { type: "terms", items: [
        { term: "Thoughtful Accessibility", text: "Direct parking access, no luggage struggles, no shuttle waits, easy vehicle access, perfect for families with seniors, children, or groceries." },
        { term: "True Family Freedom", text: "Bring your own food, fully-equipped kitchens, spacious dining areas, create your own meal schedule, honor Asian family cooking traditions." },
        { term: "Family-Centered Design", text: "Comfortable relaxation spaces, multi-generational entertainment, facilities for all ages, variety of tourist activities." },
      ] },
      { type: "p", text: "At AFhomes, convenience meets comfort: a true “amazing & fun home away from home.”" },
    ],
  },
  {
    id: "location",
    question: "Where is the resort located?",
    blocks: [
      { type: "p", text: "The resort is located at Brgy. Perez, Calauan, Laguna, Region IV-A (CALABARZON), 4012. Nestled in a scenic area that offers tranquility and natural beauty, the resort is:" },
      { type: "list", items: ["Only 1 hour and 30 minutes travel from SLEX Taguig Skyway to the resort.", "Expected to be only 40 minutes from SLEX Taguig Skyway once the Alaminos TR4 exit becomes fully accessible."] },
      { type: "p", text: "The resort is strategically located in Calauan, Laguna, making it very accessible from Manila, Cavite, Batangas, Bulacan, and the rest of Luzon through existing highways and the ongoing SLEX extension TR4. The municipality of Calauan is abundant in natural spring water and lush woods, especially fruit trees. Hot springs naturally overflow from the ground in various parts of Calauan, adding to the area's charm and appeal." },
      { type: "p", text: "AFhomes Satellite Office: AFhomes Hotspring & Ecofarm Resort Corp., Alaminos Commercial Complex, Maharlika Road, Brgy. San Juan, Alaminos, Laguna. 2nd Floor, Units 201-207. Landmark: Puregold Alaminos." },
    ],
  },
  {
    id: "offerings",
    question: "What are the key offerings?",
    blocks: [
      { type: "terms", items: [
        { term: "Natural Geothermal Pools", text: "Our geothermal pools unlock deep healing relaxation. Feel tensions ease as warm, mineral-rich waters envelop your skin, oxygenating from within. Restore your vibrancy amid abundant nature." },
        { term: "Luxury Villas with Farm-to-Table Dining", text: "Step into your private villa, an intimate sanctuary exuding luxury amidst nature's bounty. Floor-to-ceiling windows invite lush tropical gardens inside as you unwind in a secure and private space. Your personal balcony overlooks swaying trees and distant greenery views. These lightweight, sustainably crafted villas will give you the feeling of being right at home in paradise." },
        { term: "Spa Sanctuary", text: "We integrate wellness across all programs, from our thermally-heated spa to nutrition workshops and nature-based activities guided by expert practitioners. Our retreat nurtures body, mind, and spirit." },
        { term: "Regenerative Agriculture EcoFarm", text: "We cultivate boutique organic produce across our on-site ecofarm, following the highest standards in sustainable ecofarming. Our farm-to-table cuisine offers the freshest, most nutritious meals imaginable." },
      ] },
    ],
  },
  {
    id: "amenities",
    question: "What amenities does the resort offer?",
    blocks: [
      { type: "p", text: "Our resort offers a wide range of amenities designed to cater to guests of all ages, ensuring a memorable and comfortable experience:" },
      { type: "terms", items: [
        { term: "Reception Area with Shops", text: "A welcoming and elegant space to begin your stay, complete with convenient shopping options." },
        { term: "Main Office", text: "Onsite assistance and guest services, available to address your needs at any time." },
        { term: "Dance Room & Dynamic Gym", text: "A versatile space for dance, fitness, and wellness, offering a combination of creative movement, strength, and cardio training." },
        { term: "Gated and Guarded Resort Area", text: "Ensuring both the safety and privacy of our guests with secure, exclusive access to the resort." },
        { term: "Large Public Infinity Pool with Kids' Pool", text: "A beautiful infinity pool for adults and a separate kids' pool for family-friendly fun." },
        { term: "Natural Hot Springs", text: "Relax and rejuvenate in our soothing, naturally heated geothermal springs." },
        { term: "Kids Playground", text: "A safe and entertaining space for children to play and explore." },
        { term: "Outdoor Basketball Courts", text: "A perfect setting for friendly basketball games with family and friends." },
        { term: "Amusement and Local Farm Activities", text: "Engage in exciting local experiences, including farm-based activities for a unique, hands-on adventure." },
        { term: "ATV Adventure Park", text: "Experience thrilling ATV rides through scenic trails, perfect for adrenaline-seekers." },
        { term: "Man-Made Lake", text: "Ideal for leisurely walks, fishing, or simply enjoying the tranquil surroundings." },
        { term: "Unlimited Japanese/Korean BBQ", text: "Delight in endless BBQ options, featuring a variety of flavors to satisfy all tastes." },
        { term: "Asian Cuisine Restaurants (Filipino, Chinese, Japanese, Vietnamese)", text: "Explore diverse culinary offerings for a truly international dining experience." },
        { term: "Large Greenhouses", text: "Wander through our lush greenhouses, showcasing our commitment to sustainability and horticultural beauty." },
        { term: "Edu-Agricultural Exhibits", text: "Learn and engage with our educational agricultural displays, designed to inspire and inform visitors about eco-farming and sustainability." },
        { term: "Mini Farms", text: "Enjoy hands-on fun and interaction with our mini-farms, perfect for all ages." },
        { term: "Homestyle Accommodation Villas", text: "Modern, natural-concept villas, fully furnished for comfort, each with exclusive parking for a hassle-free experience." },
        { term: "And Many More", text: "Plus, a variety of other amenities designed to make your stay exceptional and unforgettable." },
      ] },
    ],
  },
  {
    id: "value",
    question: "What are the value propositions?",
    blocks: [
      { type: "terms", items: [
        { term: "Excellent Service", text: "We prioritize providing outstanding service to our guests, ensuring that their needs and desires are met with utmost care and attention. Our well-trained staff members go above and beyond to deliver a memorable and personalized experience." },
        { term: "All-in-one Fun", text: "We tailor our offerings to cater to each guest's individual preferences. From customized activity itineraries to personalized dining experiences, we aim to provide fun and enjoyable moments that create lasting memories." },
        { term: "Amazing Nature", text: "Situated amidst breathtaking natural surroundings, AFhomes Hotspring & Ecofarm Resort offers guests the opportunity to immerse themselves in the beauty of the environment, with stunning landscapes, lush greenery, and a variety of outdoor activities." },
        { term: "Value for Money", text: "We believe that luxury and sustainability can coexist without compromising affordability. We strive to offer our guests an exceptional experience at a reasonable price." },
        { term: "Home Away from Home", text: "Our goal is to create an ambiance where guests feel as comfortable and cared for as they would in their own homes, with cozy accommodations, warm hospitality, and a sense of familiarity." },
      ] },
    ],
  },
  {
    id: "accommodations",
    question: "What types of accommodations are available?",
    blocks: [
      { type: "p", text: "Our resort offers a variety of accommodations to suit different preferences, ensuring comfort and luxury for every guest. The available types of accommodations include:" },
      { type: "list", items: [
        "Deluxe Glamping", "Premier Glamping", "Deluxe A-Frames", "Premier A-Frames", "Deluxe Villas (1 BR)", "Deluxe Villas (2 BR)", "Deluxe Villas (3 BR)",
        "Premier Queen Villas", "Premier King Villas", "Skyline Club Hotel (7-storey)", "Deluxe Camping (Small & Large)", "Premier Camping (Small & Large)",
      ] },
      { type: "p", text: "Each accommodation type offers unique features and amenities, ensuring a personalized and comfortable stay for every guest. For detailed information, please see the Villas & Amenities section of our resort page, or contact us directly." },
    ],
  },
  {
    id: "vip-purpose",
    question: "What's the purpose of the VIP Privilege Loyalty Program?",
    blocks: [
      { type: "p", text: "Our VIP Privilege Loyalty Program provides exclusive resort access and lifestyle benefits for families and individuals. VIP Privilege Cardholders enjoy premium facilities, special rates, and privileges designed to enhance their leisure experiences. This is a pure consumer program focused on lifestyle benefits, not an investment opportunity." },
    ],
  },
  {
    id: "investment",
    question: "Is your company offering bonds, shares, stocks, or co-ownership?",
    blocks: [
      { type: "p", text: "No. Our VIP Privilege Loyalty Program provides access to resort facilities and exclusive benefits. It is not an investment product, timeshare, or ownership stake. VIP Privilege Cardholders receive only lifestyle privileges and discounts, with no financial returns or profit-sharing." },
    ],
  },
  {
    id: "payment",
    question: "What forms of payment are accepted for the VIP Privilege Loyalty Program?",
    blocks: [
      { type: "terms", items: [
        { term: "1. Cash payment", text: "Visit our office during business hours (9:00 AM – 5:00 PM, Monday to Sunday)." },
        { term: "2. Bank deposit", text: "We accept both cash and check deposits at any branch." },
      ] },
      { type: "bank" },
      { type: "p", text: `For check payments, please make checks payable to ${PUBLIC_SUPPORT_INFO.chequePayee}.` },
      { type: "list", items: ["Always verify account details before sending payment.", "Keep your payment receipt for reference.", "Send payment confirmation to our customer service.", "Direct payment collection from buyers is strictly prohibited for agents."] },
    ],
  },
  {
    id: "real-estate",
    question: "Is AFhomes a real estate developer and does it need LTS from DHSUD?",
    blocks: [
      { type: "p", text: "No. AFhomes is a hospitality resort developer and operator focused on tourism and leisure development. AFhomes doesn't need LTS from DHSUD since it doesn't sell subdivision lots or houses." },
    ],
  },
];

export const FAQ_HELP = {
  title: "Have more questions or need assistance?",
  text: "We're here to help. Reach out to us through any of the following channels.",
  email: SITE.infoEmail,
};

/** Section copy and photos for the FAQ page (owner's reference design, 2026-11-17). */
export const FAQ_PAGE = {
  hero: {
    titleStart: "Frequently Asked",
    titleAccent: "Questions",
    image: { src: "/images/site/resort/amenities-w-pool-with-slides1.webp", alt: "A resort pool with slides" },
    searchLabel: "Search the questions",
    searchPlaceholder: "Search a question (e.g., amenities, VIP program, payments)",
    quickHelpLabel: "Quick help:",
    /** Each chip jumps to (and opens) one question by its id. */
    quickHelp: [
      { label: "About AFhomes", target: "who", icon: "building" },
      { label: "Amenities", target: "amenities", icon: "amenities" },
      { label: "VIP Privilege", target: "vip-purpose", icon: "crown" },
      { label: "Location", target: "location", icon: "pin" },
    ] as const,
  },
  questions: {
    eyebrow: "Common questions",
    title: "Your AFhomes FAQs",
    text: "Browse through the most frequently asked questions about AFhomes Hotspring & Ecofarm Resort, our offerings, and the VIP Privilege Loyalty Program.",
    empty: "No questions match your search. Try another word, or contact us below.",
  },
  help: { eyebrow: "Still curious?" },
  closing: {
    titleStart: "Discover your perfect",
    titleAccent: "VIP Privilege Loyalty Program",
    titleEnd: "level",
    text: "Learn more about the exclusive benefits of our VIP Privilege Loyalty Program and how to become a valued Primary Cardholder.",
    href: "/vip-privilege",
    cta: "VIP Privilege",
    image: { src: "/images/site/resort/amenities-w-park1.webp", alt: "The resort park" },
  },
};
