import { describe, expect, it } from "vitest";
import type { ExperienceInput } from "@/data/contracts/experience-repository";
import { getDevIdentity } from "./dev-identities";
import { createMockRepositories } from "./repositories";
import { createMockStore } from "./seed";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

const input = (overrides: Partial<ExperienceInput> = {}): ExperienceInput => ({
  title: "Night Market",
  slug: "night-market",
  category: "Community",
  summary: "An evening market of local food, crafts, and music.",
  status: "Opening soon",
  statusTone: "upcoming",
  imageSrc: "/images/site/resort/amenities-w-park1.webp",
  imageAlt: "The resort park at dusk",
  overview: "A weekly evening market on the resort grounds.",
  highlights: [{ title: "Local food", text: "Stalls from Laguna kitchens." }],
  ...overrides,
});

describe("experience content", () => {
  it("seeds the three existing destinations with their public slugs", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const all = await admin.experiences.list();
    expect(all.filter((item) => item.standard).map((item) => item.slug)).toEqual([
      "hotspring-ecofarm-resort",
      "smart-wellness-hotel",
      "alm-japanese-restaurant",
    ]);
    expect((await admin.experiences.listPublic()).map((item) => item.title)).toEqual([
      "Hotspring & Ecofarm Resort",
      "Smart Wellness Hotel",
      "ALM Japanese Restaurant",
    ]);
  });

  it("publishes a valid new experience on save and adds it to the public list", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const created = await admin.experiences.create(input());
    expect(created).toMatchObject({ slug: "night-market", published: true, standard: false });
    const published = await admin.experiences.listPublic();
    expect(published.some((item) => item.slug === "night-market")).toBe(true);
    const events = store.auditEvents.filter((item) => item.action === "EXPERIENCE_CREATED" && item.entityId === created.id);
    expect(events).toHaveLength(1);
    expect(events[0].module).toBe("experiences");
  });

  it("archives an experience without deleting it, and restores it", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const created = await admin.experiences.create(input());
    await admin.experiences.setPublished(created.id, false);
    expect((await admin.experiences.listPublic()).some((item) => item.slug === "night-market")).toBe(false);
    expect((await admin.experiences.list()).some((item) => item.id === created.id)).toBe(true);
    await admin.experiences.setPublished(created.id, true);
    expect((await admin.experiences.listPublic()).some((item) => item.slug === "night-market")).toBe(true);
  });

  it("rejects duplicate and badly formed slugs, and incomplete content", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const create = (overrides: Partial<ExperienceInput>) => admin.experiences.create(input(overrides));
    await expect(create({ slug: "hotspring-ecofarm-resort" })).rejects.toThrow(/already used/i);
    await expect(create({ slug: "Night Market" })).rejects.toThrow(/lowercase/i);
    await expect(create({ slug: "night--market" })).rejects.toThrow(/lowercase/i);
    await expect(create({ title: " " })).rejects.toThrow(/title/i);
    await expect(create({ summary: "" })).rejects.toThrow(/summary/i);
    await expect(create({ overview: "" })).rejects.toThrow(/overview/i);
    await expect(create({ imageSrc: "" })).rejects.toThrow(/image/i);
    await expect(create({ imageSrc: "https://example.com/photo.jpg" })).rejects.toThrow(/\/images/i);
    await expect(create({ imageSrc: "/images/%2e%2e/secret.webp" })).rejects.toThrow(/\/images/i);
    await expect(create({ imageSrc: "/images/%252e%252e/secret.webp" })).rejects.toThrow(/\/images/i);
    await expect(create({ imageSrc: "/images/site/../../secret.webp" })).rejects.toThrow(/\/images/i);
    for (const hidden of ["/images/.\t./secret.webp", "/images/.%09./secret.webp", "/images/.\n./secret.webp", "/images/a.webp?x=1", "/images/a.webp#top", "/images/a%20b.webp"]) {
      await expect(create({ imageSrc: hidden }), hidden).rejects.toThrow(/\/images/i);
    }
    await expect(create({ highlights: [{ title: "x".repeat(81), text: "Fine." }] })).rejects.toThrow(/title/i);
    await expect(create({ statusTone: "closed" as never })).rejects.toThrow(/status/i);
  });

  it("keeps the three original page addresses, overviews and highlights fixed", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin");
    const resort = (await admin.experiences.list()).find((item) => item.slug === "hotspring-ecofarm-resort")!;
    await expect(admin.experiences.update(resort.id, input({ slug: "resort", title: resort.title }))).rejects.toThrow(/address/i);
    await expect(admin.experiences.update(resort.id, input({
      slug: resort.slug, title: resort.title, category: resort.category, summary: resort.summary,
      status: resort.status, statusTone: resort.statusTone, imageSrc: resort.image.src, imageAlt: resort.image.alt,
      overview: "A changed overview.",
    }))).rejects.toThrow(/overview and highlights/i);
  });

  it("needs the Experiences content permission", async () => {
    const store = createMockStore();
    for (const id of ["dev-clerk", "dev-finance", "dev-hr", "dev-svd-a", "dev-ost-a1"]) {
      await expect(as(store, id).experiences.create(input())).rejects.toThrow(/not allowed/i);
      await expect(as(store, id).experiences.setPublished("exp-1", false)).rejects.toThrow(/not allowed/i);
    }
    await expect(as(store, "dev-admin").experiences.create(input())).resolves.toMatchObject({ slug: "night-market" });
  });
});
