import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ExperienceInput, ExperienceRepository } from "@/data/contracts/experience-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import {
  EXPERIENCE_HIGHLIGHT_TEXT_MAX,
  EXPERIENCE_TEXT_MAX,
  experienceSlugProblem,
  isExperienceStatusTone,
} from "@/modules/experiences/rules";
import type { Experience } from "@/modules/experiences/types";
import type { DevIdentity } from "@/modules/identity/types";
import { BusinessRepository, nowIso } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

const DENIED = "Managing Experiences content is not allowed for this identity.";
const TITLE_MAX = 80;
const CATEGORY_MAX = 40;
const SUMMARY_MAX = 240;
const STATUS_MAX = 60;
const IMAGE_MAX = 300;
const ALT_MAX = 160;
const HIGHLIGHTS_MAX = 6;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Resolves percent escapes and `.`/`..` segments before the folder check, so an encoded
 * path such as `/images/%2e%2e/secret.webp` cannot resolve outside `/images/`.
 * Returns the normalized path, or null when the input is not a plain site path.
 */
function normalizedImageSrc(raw: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // A second decoding must not be able to produce a new separator or dot segment.
  if (!decoded.startsWith("/") || /[\\\0%]/.test(decoded)) return null;
  const segments: string[] = [];
  for (const segment of decoded.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return null;
    segments.push(segment);
  }
  return `/${segments.join("/")}`;
}

/** Cleaned content fields; the repository owns the lifecycle fields. */
type ExperienceFields = Omit<Experience, "id" | "standard" | "published" | "createdAt" | "updatedAt">;

export class MockExperienceRepository extends BusinessRepository implements ExperienceRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private find(id: string): Experience {
    const experience = this.store.experiences.find((item) => item.id === id);
    if (!experience) throw new Error("Experience not found.");
    return experience;
  }

  private clean(input: ExperienceInput, current?: Experience): ExperienceFields {
    const title = input.title.trim().replace(/\s+/g, " ");
    if (!title) throw new Error("A title is required.");
    if (title.length > TITLE_MAX) throw new Error(`The title must be ${TITLE_MAX} characters or fewer.`);
    const slugProblem = experienceSlugProblem(input.slug, this.store.experiences, current?.id);
    if (slugProblem) throw new Error(slugProblem);
    const category = input.category.trim();
    if (!category) throw new Error("A category is required.");
    if (category.length > CATEGORY_MAX) throw new Error(`The category must be ${CATEGORY_MAX} characters or fewer.`);
    const summary = input.summary.trim();
    if (!summary) throw new Error("A card summary is required.");
    if (summary.length > SUMMARY_MAX) throw new Error(`The summary must be ${SUMMARY_MAX} characters or fewer.`);
    const status = input.status.trim();
    if (!status) throw new Error("A public status label is required.");
    if (status.length > STATUS_MAX) throw new Error(`The status label must be ${STATUS_MAX} characters or fewer.`);
    if (!isExperienceStatusTone(input.statusTone)) throw new Error("Choose a valid public status tone.");
    const rawImageSrc = input.imageSrc.trim();
    if (!rawImageSrc) throw new Error("An image path is required.");
    if (rawImageSrc.length > IMAGE_MAX) throw new Error(`The image path must be ${IMAGE_MAX} characters or fewer.`);
    const imageSrc = normalizedImageSrc(rawImageSrc);
    if (!imageSrc || !imageSrc.startsWith("/images/")) {
      throw new Error("Use an image from the site's /images folder.");
    }
    const imageAlt = input.imageAlt.trim();
    if (!imageAlt) throw new Error("Describe the image in plain words.");
    if (imageAlt.length > ALT_MAX) throw new Error(`The image description must be ${ALT_MAX} characters or fewer.`);
    const overview = input.overview.trim();
    if (!overview) throw new Error("An overview paragraph is required.");
    if (overview.length > EXPERIENCE_TEXT_MAX) throw new Error(`The overview must be ${EXPERIENCE_TEXT_MAX} characters or fewer.`);
    if (input.highlights.length > HIGHLIGHTS_MAX) throw new Error(`Add at most ${HIGHLIGHTS_MAX} highlight blocks.`);
    const highlights = input.highlights.map((item) => {
      const highlightTitle = item.title.trim();
      const text = item.text.trim();
      if (!highlightTitle) throw new Error("Every highlight needs a title.");
      if (!text) throw new Error("Every highlight needs its text.");
      if (text.length > EXPERIENCE_HIGHLIGHT_TEXT_MAX) throw new Error(`Highlight text must be ${EXPERIENCE_HIGHLIGHT_TEXT_MAX} characters or fewer.`);
      return { title: highlightTitle, text };
    });
    return { title, slug: input.slug.trim(), category, summary, status, statusTone: input.statusTone, image: { src: imageSrc, alt: imageAlt }, overview, highlights };
  }

  private record(identity: DevIdentity, action: string, experience: Experience, previousValue: string | null, newValue: string | null) {
    this.audit(identity, {
      module: "vip-products",
      action,
      entityType: "experience",
      entityId: experience.id,
      previousValue,
      newValue,
    });
  }

  async list(options?: MockAsyncOptions): Promise<Experience[]> {
    return this.run(options, () => this.store.experiences.map((item) => clone(item)));
  }

  async listPublic(options?: MockAsyncOptions): Promise<Experience[]> {
    return this.run(options, () => this.store.experiences.filter((item) => item.published).map((item) => clone(item)));
  }

  async create(input: ExperienceInput, options?: MockAsyncOptions): Promise<Experience> {
    return this.run(options, (identity) => {
      this.require(identity, "experiences.manage", DENIED);
      const fields = this.clean(input);
      const now = nowIso();
      const experience: Experience = {
        id: nextId(this.store, "experience", "exp"),
        ...fields,
        standard: false,
        published: true,
        createdAt: now,
        updatedAt: now,
      };
      this.store.experiences.push(experience);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.EXPERIENCE_CREATED, experience, null, `${experience.slug}:published`);
      return clone(experience);
    });
  }

  async update(id: string, input: ExperienceInput, options?: MockAsyncOptions): Promise<Experience> {
    return this.run(options, (identity) => {
      this.require(identity, "experiences.manage", DENIED);
      const experience = this.find(id);
      if (experience.standard && input.slug.trim() !== experience.slug) {
        throw new Error("The three original destinations keep their page address.");
      }
      const fields = this.clean(input, experience);
      if (experience.standard && (fields.overview !== experience.overview || JSON.stringify(fields.highlights) !== JSON.stringify(experience.highlights))) {
        throw new Error("The designed page keeps its overview and highlights.");
      }
      const previous = `${experience.slug}:${experience.published ? "published" : "archived"}`;
      Object.assign(experience, fields, { updatedAt: nowIso() });
      this.record(identity, BUSINESS_AUDIT_ACTIONS.EXPERIENCE_UPDATED, experience, previous, `${experience.slug}:${experience.published ? "published" : "archived"}`);
      return clone(experience);
    });
  }

  async setPublished(id: string, published: boolean, options?: MockAsyncOptions): Promise<Experience> {
    return this.run(options, (identity) => {
      this.require(identity, "experiences.manage", DENIED);
      const experience = this.find(id);
      const previous = experience.published ? "published" : "archived";
      experience.published = published;
      experience.updatedAt = nowIso();
      this.record(
        identity,
        published ? BUSINESS_AUDIT_ACTIONS.EXPERIENCE_RESTORED : BUSINESS_AUDIT_ACTIONS.EXPERIENCE_ARCHIVED,
        experience,
        previous,
        published ? "published" : "archived",
      );
      return clone(experience);
    });
  }
}
