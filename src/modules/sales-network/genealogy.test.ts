import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import {
  validateSalesParent,
  getDirectDownlineCount,
  getTotalDescendantCount,
} from "@/modules/sales-network/genealogy";

describe("sales network genealogy", () => {
  it("allows SVD to be a root", () => {
    const store = createMockStore();
    expect(validateSalesParent("SVD", null, store.members).ok).toBe(true);
  });

  it("rejects a parent for SVD", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-svd-a")!;
    expect(validateSalesParent("SVD", parent, store.members).ok).toBe(false);
  });

  it("requires SSM to have an SVD parent", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-svd-a")!;
    expect(validateSalesParent("SSM", parent, store.members).ok).toBe(true);
    const wrong = store.members.find((member) => member.id === "mem-sm-a")!;
    expect(validateSalesParent("SSM", wrong, store.members).ok).toBe(false);
  });

  it("requires SM to have an SSM parent", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-ssm-a")!;
    expect(validateSalesParent("SM", parent, store.members).ok).toBe(true);
  });

  it("allows OST to attach directly to SVD, SSM, or SM", () => {
    const store = createMockStore();
    for (const parentId of ["mem-svd-a", "mem-ssm-a", "mem-sm-a"]) {
      const parent = store.members.find((member) => member.id === parentId)!;
      expect(validateSalesParent("OST", parent, store.members).ok).toBe(true);
    }
  });

  it("rejects OST under OST", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-ost-a1")!;
    expect(validateSalesParent("OST", parent, store.members).ok).toBe(false);
  });

  it("rejects self-parenting and cycles", () => {
    const store = createMockStore();
    const member = store.members.find((member) => member.id === "mem-sm-a")!;
    expect(validateSalesParent("SM", member, store.members, "mem-sm-a").ok).toBe(false);
    const descendant = store.members.find((member) => member.id === "mem-ost-a1")!;
    // moving mem-sm-a under its own descendant
    expect(validateSalesParent("SM", descendant, store.members, "mem-sm-a").ok).toBe(false);
  });

  it("rejects an inactive or ineligible receiving manager", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-svd-a")!;
    parent.status = "inactive";
    expect(validateSalesParent("SSM", parent, store.members).ok).toBe(false);
    parent.status = "active";
    parent.mockAccreditationEligible = false;
    expect(validateSalesParent("SSM", parent, store.members).ok).toBe(false);
  });

  it("accepts an expired receiving manager but refuses a suspended or departed one (doc 03 section 9)", () => {
    const store = createMockStore();
    const parent = store.members.find((member) => member.id === "mem-svd-a")!;
    const record = store.accreditations.find((item) => item.memberId === parent.id)!;
    record.adminStatus = "active";
    record.expiryDate = "2020-01-01";
    expect(validateSalesParent("SSM", parent, store.members, undefined, store.accreditations).ok).toBe(true);
    record.adminStatus = "suspended";
    record.suspensionEffectiveDate = "2020-02-01";
    expect(validateSalesParent("SSM", parent, store.members, undefined, store.accreditations).ok).toBe(false);
    record.adminStatus = "active";
    record.suspensionEffectiveDate = null;
    record.endDate = "2020-02-01";
    expect(validateSalesParent("SSM", parent, store.members, undefined, store.accreditations).ok).toBe(false);
  });

  it("counts direct and total descendants", () => {
    const store = createMockStore();
    expect(getDirectDownlineCount("mem-svd-a", store.members)).toBe(2);
    expect(getTotalDescendantCount("mem-svd-a", store.members)).toBe(4);
    expect(getTotalDescendantCount("mem-ost-a1", store.members)).toBe(0);
  });
});