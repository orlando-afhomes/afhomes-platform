import { describe, expect, it } from "vitest";
import { createPublicContentRepository } from "./public-content-repository";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

describe("focused public content repository", () => {
  it("matches the staff repositories' public allowlists", async () => {
    const store = createMockStore();
    const publicContent = createPublicContentRepository(store);
    const staff = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    expect(await publicContent.experiences()).toEqual(await staff.experiences.listPublic());
    expect(await publicContent.vipProducts()).toEqual(await staff.products.listPublic());
    expect(await publicContent.offers()).toEqual(await staff.promos.publicOffers());
  });

  it("reads staff changes from the same store and returns isolated copies", async () => {
    const store = createMockStore();
    const publicContent = createPublicContentRepository(store);
    const staff = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const experience = store.experiences[0];
    await staff.experiences.setPublished(experience.id, false);
    expect((await publicContent.experiences()).some((item) => item.id === experience.id)).toBe(false);
    const products = await publicContent.vipProducts();
    products[0].name = "Changed outside the store";
    expect((await publicContent.vipProducts())[0].name).not.toBe(products[0].name);
    expect(products[0]).not.toHaveProperty("changes");
    expect(products[0]).not.toHaveProperty("priceNote");
  });

  it("keeps async failures and cancellation available", async () => {
    const repository = createPublicContentRepository(createMockStore());
    await expect(repository.offers({ shouldFail: true })).rejects.toThrow();
    await expect(repository.experiences({ signal: AbortSignal.abort() })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("keeps drafts, retired products and unlisted products out of public results", async () => {
    const store = createMockStore();
    const original = store.products[0];
    store.products.push(
      { ...original, code: "X8", approvalStatus: "draft", publiclyListed: true },
      { ...original, code: "X7", status: "retired", publiclyListed: true },
      { ...original, code: "X6", publiclyListed: false },
    );
    const repository = createPublicContentRepository(store);
    expect((await repository.vipProducts()).every((item) => !["X8", "X7", "X6"].includes(item.code))).toBe(true);
  });
});
