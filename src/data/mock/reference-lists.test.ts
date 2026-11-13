import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

function setup(identityId = "dev-admin") {
  const store = createMockStore();
  const repos = createMockRepositories(store, () => getDevIdentity(identityId));
  return { store, repos };
}

describe("reference list repository", () => {
  it("lists the seeded lists for everyone, with stable values and corrected labels", async () => {
    const { repos } = setup("dev-ost-a1");
    const entries = await repos.referenceLists.list();
    const programs = entries.filter((entry) => entry.list === "program-category");
    expect(programs.map((entry) => entry.value)).toEqual(["vip_privilege_card_holder", "non_vip_client", "future_vip_privilege_card_holder"]);
    expect(programs[0].label).toBe("VIP Privilege Card Holder");
    expect(entries.some((entry) => entry.list === "gov-id-type" && entry.value === "Passport")).toBe(true);
    expect(entries.some((entry) => entry.list === "bank")).toBe(true);
  });

  it("only administrators manage the lists", async () => {
    for (const identityId of ["dev-finance", "dev-hr", "dev-clerk", "dev-ost-a1"]) {
      const { repos } = setup(identityId);
      await expect(repos.referenceLists.create({ list: "bank", label: "Test Bank" })).rejects.toThrow(/not allowed/);
      await expect(repos.referenceLists.update("ref-bank-1", { label: "x" })).rejects.toThrow(/not allowed/);
      await expect(repos.referenceLists.delete("ref-bank-1")).rejects.toThrow(/not allowed/);
    }
    const { repos } = setup("dev-super-admin");
    await expect(repos.referenceLists.create({ list: "bank", label: "Test Bank" })).resolves.toMatchObject({ label: "Test Bank", value: "test_bank", status: "active" });
  });

  it("rejects an empty or duplicate name and keeps government ID values as the plain label", async () => {
    const { repos } = setup();
    await expect(repos.referenceLists.create({ list: "bank", label: "  " })).rejects.toThrow(/required/);
    await expect(repos.referenceLists.create({ list: "bank", label: "metrobank" })).rejects.toThrow(/already/);
    const created = await repos.referenceLists.create({ list: "gov-id-type", label: "Senior Citizen ID" });
    expect(created.value).toBe("Senior Citizen ID");
  });

  it("deletes an entry no record uses and audits it", async () => {
    const { repos, store } = setup();
    const created = await repos.referenceLists.create({ list: "program-category", label: "Event Guest" });
    expect(created.inUse).toBe(false);
    await repos.referenceLists.delete(created.id);
    expect((await repos.referenceLists.list()).some((entry) => entry.id === created.id)).toBe(false);
    const actions = store.auditEvents.filter((event) => event.entityId === created.id).map((event) => event.action);
    expect(actions).toEqual(["REFERENCE_ENTRY_CREATED", "REFERENCE_ENTRY_DELETED"]);
  });

  it("refuses to delete a used entry and only deactivates it, keeping its value", async () => {
    const { repos, store } = setup();
    const created = await repos.referenceLists.create({ list: "program-category", label: "Event Guest" });
    const member = store.members.find((item) => item.sellerProfile)!;
    member.sellerProfile!.programCategory = created.value;
    expect((await repos.referenceLists.list()).find((entry) => entry.id === created.id)?.inUse).toBe(true);
    await expect(repos.referenceLists.delete(created.id)).rejects.toThrow(/used by existing records/);
    const deactivated = await repos.referenceLists.deactivate(created.id);
    expect(deactivated).toMatchObject({ status: "inactive", value: created.value, inUse: true });
    expect(store.auditEvents.some((event) => event.entityId === created.id && event.action === "REFERENCE_ENTRY_UPDATED" && event.newValue === "status:inactive")).toBe(true);
  });

  it("changes the label but never the stored value", async () => {
    const { repos } = setup();
    const updated = await repos.referenceLists.update("ref-program-category-2", { label: "Non VIP Guest" });
    expect(updated).toMatchObject({ label: "Non VIP Guest", value: "non_vip_client" });
  });

  it("treats a bank on a payment as use", async () => {
    const { repos, store } = setup();
    store.payments[0].bankId = "ref-bank-2";
    expect((await repos.referenceLists.list()).find((entry) => entry.id === "ref-bank-2")?.inUse).toBe(true);
    await expect(repos.referenceLists.delete("ref-bank-2")).rejects.toThrow(/used by existing records/);
  });
});

describe("outlet repository", () => {
  it("seeds the two overnight venues with their ids, plus sample outlets", async () => {
    const { repos } = setup("dev-clerk");
    const outlets = await repos.outlets.list();
    expect(outlets.find((outlet) => outlet.id === "venue-wellness-hotel")?.type).toBe("accommodation");
    expect(outlets.find((outlet) => outlet.id === "venue-hotspring-resort")).toBeTruthy();
    expect(outlets.find((outlet) => outlet.type === "restaurant")).toMatchObject({ name: "Teppanyaki Restaurant", sample: true });
  });

  it("only administrators manage outlets", async () => {
    const { repos } = setup("dev-finance");
    await expect(repos.outlets.create({ name: "Cafe", type: "restaurant" })).rejects.toThrow(/not allowed/);
    await expect(repos.outlets.deactivate("outlet-spa")).rejects.toThrow(/not allowed/);
    await expect(repos.outlets.delete("outlet-spa")).rejects.toThrow(/not allowed/);
  });

  it("creates, edits and deletes an unused outlet with audit entries", async () => {
    const { repos, store } = setup();
    const created = await repos.outlets.create({ name: "Garden Cafe", type: "restaurant" });
    await repos.outlets.update(created.id, { name: "Garden Cafe & Bar", type: "other" });
    await repos.outlets.delete(created.id);
    expect((await repos.outlets.list()).some((outlet) => outlet.id === created.id)).toBe(false);
    const actions = store.auditEvents.filter((event) => event.entityId === created.id).map((event) => event.action);
    expect(actions).toEqual(["OUTLET_CREATED", "OUTLET_UPDATED", "OUTLET_UPDATED", "OUTLET_DELETED"]);
    await expect(repos.outlets.create({ name: "garden cafe", type: "restaurant" })).resolves.toBeTruthy();
    await expect(repos.outlets.create({ name: "Garden Cafe", type: "restaurant" })).rejects.toThrow(/already exists/);
  });

  it("refuses to delete an outlet with a resort bill and only deactivates it", async () => {
    const { repos, store } = setup();
    store.resortSpends[0].venueId = "outlet-spa";
    const outletId = "outlet-spa";
    expect((await repos.outlets.list()).find((outlet) => outlet.id === outletId)?.inUse).toBe(true);
    await expect(repos.outlets.delete(outletId)).rejects.toThrow(/used by existing records/);
    expect(await repos.outlets.deactivate(outletId)).toMatchObject({ status: "inactive" });
  });

  it("resort bill entry offers only active outlets", async () => {
    const { repos } = setup();
    expect((await repos.stayPoints.venues()).map((venue) => venue.id)).toContain("outlet-teppanyaki");
    await repos.outlets.deactivate("outlet-teppanyaki");
    expect((await repos.stayPoints.venues()).map((venue) => venue.id)).not.toContain("outlet-teppanyaki");
  });
});
