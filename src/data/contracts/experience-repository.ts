import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Experience, ExperienceHighlight, ExperienceStatusTone } from "@/modules/experiences/types";

export type ExperienceInput = {
  title: string;
  slug: string;
  category: string;
  summary: string;
  status: string;
  statusTone: ExperienceStatusTone;
  imageSrc: string;
  imageAlt: string;
  overview: string;
  highlights: ExperienceHighlight[];
};

/** Public website Experiences content, distinct from Promo Rewards. */
export interface ExperienceRepository {
  /** Every experience for the admin list, archived ones included. */
  list(options?: MockAsyncOptions): Promise<Experience[]>;
  /** Published entries only, safe for the public website. */
  listPublic(options?: MockAsyncOptions): Promise<Experience[]>;
  create(input: ExperienceInput, options?: MockAsyncOptions): Promise<Experience>;
  update(id: string, input: ExperienceInput, options?: MockAsyncOptions): Promise<Experience>;
  /** Archive (hide from the public site) or restore an entry. */
  setPublished(id: string, published: boolean, options?: MockAsyncOptions): Promise<Experience>;
}
