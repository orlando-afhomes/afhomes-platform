"use client";

import { usePublicExperiences } from "@/data/public-content-queries";
import { ExperienceUnavailable } from "../experience/experience-unavailable";
import { HotelPage, ResortPage, RestaurantPage } from "./experience-pages";

const PAGES = { resort: ResortPage, hotel: HotelPage, restaurant: RestaurantPage } as const;

/**
 * The three owner-designed destinations. Their layouts and copy stay fixed; the
 * Experiences record controls whether the published page is offered at all.
 */
export function StandardExperiencePage({ slug, variant }: { slug: string; variant: keyof typeof PAGES }) {
  const experiences = usePublicExperiences();
  const record = experiences.data?.find((item) => item.slug === slug);
  // While the browser-memory content loads, keep the designed page; only a loaded
  // missing/archived record hides it.
  if (!experiences.isPending && !record) return <ExperienceUnavailable />;
  const Page = PAGES[variant];
  return <Page />;
}
