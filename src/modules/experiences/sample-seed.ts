import {
  EXPERIENCE_CARDS,
  HOTEL,
  HOTEL_PAGE,
  NATURAL_FEATURES,
  RESORT_PAGE,
  RESTAURANT,
  RESTAURANT_PAGE,
} from "@/modules/public-site/content/experiences";
import type { Experience } from "./types";

const SEEDED_AT = "2026-11-17T09:00:00+08:00";

/**
 * The three owner-approved destinations as content records. Their designed pages
 * keep the full layout; these records drive the public cards and the admin list.
 */
export function seedExperiences(): Experience[] {
  return [
    {
      id: "exp-1",
      slug: "hotspring-ecofarm-resort",
      title: EXPERIENCE_CARDS[0].title,
      category: "Resort",
      summary: EXPERIENCE_CARDS[0].text,
      status: EXPERIENCE_CARDS[0].status,
      statusTone: EXPERIENCE_CARDS[0].statusTone,
      image: { ...EXPERIENCE_CARDS[0].image },
      overview: RESORT_PAGE.hero.lede,
      highlights: NATURAL_FEATURES.map((item) => ({ ...item })),
      standard: true,
      published: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    {
      id: "exp-2",
      slug: "smart-wellness-hotel",
      title: EXPERIENCE_CARDS[1].title,
      category: "Wellness hotel",
      summary: EXPERIENCE_CARDS[1].text,
      status: EXPERIENCE_CARDS[1].status,
      statusTone: EXPERIENCE_CARDS[1].statusTone,
      image: { ...EXPERIENCE_CARDS[1].image },
      overview: HOTEL_PAGE.hero.lede,
      highlights: HOTEL.features.map((item) => ({ ...item })),
      standard: true,
      published: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
    {
      id: "exp-3",
      slug: "alm-japanese-restaurant",
      title: EXPERIENCE_CARDS[2].title,
      category: "Restaurant",
      summary: EXPERIENCE_CARDS[2].text,
      status: EXPERIENCE_CARDS[2].status,
      statusTone: EXPERIENCE_CARDS[2].statusTone,
      image: { ...EXPERIENCE_CARDS[2].image },
      overview: RESTAURANT_PAGE.hero.lede,
      highlights: RESTAURANT.sections.map((item) => ({ ...item })),
      standard: true,
      published: true,
      createdAt: SEEDED_AT,
      updatedAt: SEEDED_AT,
    },
  ];
}
