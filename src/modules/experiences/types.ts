import type { SiteImage } from "@/modules/public-site/content/experiences";

/** Tone of the public status badge on an experience card. */
export type ExperienceStatusTone = "progress" | "upcoming" | "live";

export const EXPERIENCE_STATUS_TONES: readonly ExperienceStatusTone[] = ["progress", "upcoming", "live"];

/** One short detail block on an experience's own page. */
export type ExperienceHighlight = { title: string; text: string };

/**
 * Public website content for one destination. Content saves publish immediately
 * after validation (prototype plan, Phase 2); archiving hides it without deleting it.
 */
export type Experience = {
  id: string;
  /** Page address under /experiences/. The three original destinations keep theirs. */
  slug: string;
  title: string;
  /** Short category line, e.g. Resort, Wellness hotel, Restaurant. */
  category: string;
  /** One or two sentences for the public card and detail hero. */
  summary: string;
  status: string;
  statusTone: ExperienceStatusTone;
  image: SiteImage;
  /** Intro paragraph for a newly added destination's own page. */
  overview: string;
  highlights: ExperienceHighlight[];
  /** Seeded destinations have a designed page of their own; their slug is fixed. */
  standard: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};
