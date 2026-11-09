import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import { createMockRepositories } from "@/data/mock/repositories";
import { getDevIdentity } from "@/data/mock/dev-identities";

describe("sales network repository", () => {
  it("creates an SSM under an eligible SVD", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    // Approve the seeded pending accreditation so the SVD is an eligible sponsor.
    await adminRepos.accreditations.updateStatus("accr-seed-1", "active");
    const repo = adminRepos.members;
    const created = await repo.create({ displayName: "New SSM", designation: "SSM", parentId: "mem-svd-a" });
    expect(created.id).toBe("mem-8");
    expect(created.designation).toBe("SSM");
    expect(created.parentId).toBe("mem-svd-a");
    expect(created.branchId).toBe("branch-a");
    expect(created.status).toBe("active");
    expect(created.accountId).toBeNull();
    expect(created.referralCode).toBeNull();
    expect(store.memberSequence).toBe(9);
  });

  it("rejects OST creation through the management repository", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await expect(repo.create({ displayName: "OST", designation: "OST", parentId: "mem-svd-a" })).rejects.toThrow();
  });

  it("rejects creating an SVD with a parent", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await expect(repo.create({ displayName: "Bad SVD", designation: "SVD", parentId: "mem-svd-a" })).rejects.toThrow();
  });

  it("rejects an ineligible receiving manager", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const parent = store.members.find((member) => member.id === "mem-svd-a")!;
    parent.mockAccreditationEligible = false;
    await expect(repo.create({ displayName: "SSM", designation: "SSM", parentId: "mem-svd-a" })).rejects.toThrow(/eligib/i);
  });

  it("does not create accounts, staff, or referral codes", async () => {
    const store = createMockStore();
    const beforeAccounts = store.accounts.length;
    const beforeStaff = store.staff.length;
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-1", "active");
    const repo = adminRepos.members;
    const created = await repo.create({ displayName: "New SSM", designation: "SSM", parentId: "mem-svd-a" });
    expect(store.accounts.length).toBe(beforeAccounts);
    expect(store.staff.length).toBe(beforeStaff);
    expect(created.referralCode).toBeNull();
  });

  it("protects fields through update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const updated = await repo.update("mem-ssm-a", { displayName: "Renamed SSM" });
    expect(updated.displayName).toBe("Renamed SSM");
    const member = store.members.find((item) => item.id === "mem-ssm-a")!;
    expect(member.parentId).toBe("mem-svd-a");
    expect(member.designation).toBe("SSM");
    expect(member.branchId).toBe("branch-a");
  });

  it("updates the seller profile and recomposes the display name", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const updated = await repo.update("mem-ssm-a", {
      firstName: "Ramon",
      middleName: "Cruz",
      lastName: "Del Rosario",
      suffix: "Jr.",
      mobileNumber: "09171234567",
      gender: "Male",
      subdivision: "Bel-Air Village",
      tin: "123-456-789",
    });
    expect(updated.displayName).toBe("Ramon Cruz Del Rosario Jr.");
    expect(updated.sellerProfile?.suffix).toBe("Jr.");
    expect(updated.sellerProfile?.mobileNumber).toBe("09171234567");
    expect(updated.sellerProfile?.gender).toBe("Male");
    expect(updated.sellerProfile?.address.subdivision).toBe("Bel-Air Village");
    expect(updated.sellerProfile?.tin).toBe("123456789");
    const stored = store.members.find((item) => item.id === "mem-ssm-a")!;
    expect(stored.displayName).toBe("Ramon Cruz Del Rosario Jr.");
  });

  it("clears the middle name and suffix when attested absent", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const updated = await repo.update("mem-sm-a", { noMiddleName: true, suffix: null });
    expect(updated.displayName).toBe("Jose Reyes");
    expect(updated.sellerProfile?.middleName).toBeNull();
  });

  it("rejects a duplicate seller email on update", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const other = store.members.find((item) => item.id === "mem-ssm-a")!;
    await expect(repo.update("mem-sm-a", { email: other.sellerProfile!.email })).rejects.toThrow(/already has seller/i);
  });

  it("transfers an IST member to OST under an eligible head", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-1", "active");
    const repo = adminRepos.members;
    const leaf = await repo.create({ displayName: "Temp SSM", designation: "SSM", parentId: "mem-svd-a" });
    await adminRepos.accreditations.updateStatus("accr-seed-2", "active");
    const moved = await repo.transfer(leaf.id, "mem-ssm-a", { designation: "OST" });
    expect(moved.designation).toBe("OST");
    expect(moved.parentId).toBe("mem-ssm-a");
    expect(moved.branchId).toBe("branch-a");
    expect(moved.teamName).toBeNull();
  });

  it("transfers an OST member to IST", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-1", "active");
    const repo = adminRepos.members;
    const moved = await repo.transfer("mem-ost-b1", "mem-svd-a", { designation: "SSM" });
    expect(moved.designation).toBe("SSM");
    expect(moved.parentId).toBe("mem-svd-a");
    expect(moved.branchId).toBe("branch-a");
  });

  it("blocks a transfer that would orphan downline members", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-6", "active");
    const repo = adminRepos.members;
    await expect(repo.transfer("mem-ssm-a", "mem-svd-b", { designation: "OST" })).rejects.toThrow(/eligible sponsor/);
    const member = store.members.find((item) => item.id === "mem-ssm-a")!;
    expect(member.designation).toBe("SSM");
    expect(member.parentId).toBe("mem-svd-a");
  });

  it("creates a new branch when transferring to SVD", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const moved = await repo.transfer("mem-ost-b1", null, { designation: "SVD", teamName: "Team Cignal" });
    expect(moved.designation).toBe("SVD");
    expect(moved.parentId).toBeNull();
    expect(moved.teamName).toBe("Team Cignal");
    expect(moved.branchId).not.toBe("branch-b");
    await expect(repo.transfer("mem-ost-a1", null, { designation: "SVD", teamName: "" })).rejects.toThrow(/Team name/);
  });

  it("transfers a branch atomically and preserves descendants", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    // Approve the seeded pending accreditation so SVD Beta is an eligible receiving manager.
    await adminRepos.accreditations.updateStatus("accr-seed-6", "active");
    const repo = adminRepos.members;
    const before = store.members.map((member) => ({ ...member }));
    const moved = await repo.transfer("mem-ssm-a", "mem-svd-b");
    expect(moved.parentId).toBe("mem-svd-b");
    expect(moved.branchId).toBe("branch-b");
    const sm = store.members.find((member) => member.id === "mem-sm-a")!;
    const ost = store.members.find((member) => member.id === "mem-ost-a1")!;
    expect(sm.parentId).toBe("mem-ssm-a");
    expect(sm.branchId).toBe("branch-b");
    expect(ost.branchId).toBe("branch-b");
    expect(moved.parentHistory?.some((entry) => entry.operation === "transfer")).toBe(true);
    // Unaffected branch remains.
    expect(store.members.find((member) => member.id === "mem-svd-a")?.branchId).toBe("branch-a");
    expect(before.find((member) => member.id === "mem-svd-a")).toBeDefined();
  });

  it("rejects a transfer that would create a cycle", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const before = JSON.stringify(store.members);
    await expect(repo.transfer("mem-svd-a", "mem-ssm-a")).rejects.toThrow();
    expect(JSON.stringify(store.members)).toBe(before);
  });

  it("rejects transfer of an SVD root", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await expect(repo.transfer("mem-svd-a", "mem-svd-b")).rejects.toThrow(/SVD root/i);
  });

  it("lists eligible parents for a designation", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-1", "active");
    await adminRepos.accreditations.updateStatus("accr-seed-6", "active");
    const repo = adminRepos.members;
    const parents = await repo.listEligibleParents("SSM");
    expect(parents.map((member) => member.id)).toEqual(["mem-svd-a", "mem-svd-b"]);
  });

  it("returns direct downline and descendants", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const direct = await repo.getDirectDownline("mem-svd-a");
    expect(direct.map((member) => member.id).sort()).toEqual(["mem-ost-a2", "mem-ssm-a"]);
    const descendants = await repo.getDescendants("mem-svd-a");
    expect(descendants).toHaveLength(4);
  });

  it("scopes reads by identity", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    const members = await repo.list();
    expect(members.map((member) => member.id)).toEqual(["mem-ost-a1"]);
    await expect(repo.getById("mem-svd-a")).resolves.toBeNull();
  });

  it("denies inactive identities", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-inactive")).members;
    expect(await repo.list()).toEqual([]);
    await expect(repo.create({ displayName: "X", designation: "SSM", parentId: "mem-svd-a" })).rejects.toThrow();
  });

  it("denies OST management", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-ost-a1")).members;
    await expect(repo.create({ displayName: "X", designation: "SSM", parentId: "mem-svd-a" })).rejects.toThrow();
    await expect(repo.transfer("mem-ost-a2", "mem-svd-b")).rejects.toThrow();
  });

  it("changes status without affecting descendants", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await repo.changeStatus("mem-svd-a", "inactive");
    expect(store.members.find((member) => member.id === "mem-svd-a")?.status).toBe("inactive");
    expect(store.members.find((member) => member.id === "mem-ost-a1")?.status).toBe("active");
  });

  it("restricts reactivation to administrators", async () => {
    const store = createMockStore();
    const svdRepo = createMockRepositories(store, () => getDevIdentity("dev-svd-a")).members;
    await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members.changeStatus("mem-ssm-a", "inactive");
    await expect(svdRepo.changeStatus("mem-ssm-a", "active")).rejects.toThrow(/administrator/i);
  });

  it("preserves parent history", async () => {
    const store = createMockStore();
    const adminRepos = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    await adminRepos.accreditations.updateStatus("accr-seed-6", "active");
    const repo = adminRepos.members;
    const history = await repo.getParentHistory("mem-ssm-a");
    expect(history.length).toBe(0);
    await repo.transfer("mem-ssm-a", "mem-svd-b");
    const after = await repo.getParentHistory("mem-ssm-a");
    expect(after).toHaveLength(1);
    expect(after[0].previousParentId).toBe("mem-svd-a");
    expect(after[0].newParentId).toBe("mem-svd-b");
  });

  it("edits a member with a blank TIN and clears the stored value", async () => {
    const store = createMockStore();
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await repo.update("mem-ssm-a", { tin: "123-456-789" });
    expect(store.members.find((item) => item.id === "mem-ssm-a")!.sellerProfile!.tin).toBe("123456789");
    await repo.update("mem-ssm-a", { tin: "" });
    expect(store.members.find((item) => item.id === "mem-ssm-a")!.sellerProfile!.tin).toBeNull();
    await expect(repo.update("mem-ssm-a", { tin: null })).resolves.toBeDefined();
  });

  it("rejects profile edits for a member without a seller profile and does not fabricate one", async () => {
    const store = createMockStore();
    const member = store.members.find((item) => item.id === "mem-ssm-a")!;
    member.sellerProfile = null;
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    await expect(repo.update("mem-ssm-a", { mobileNumber: "09171234567" })).rejects.toThrow(/no seller profile/i);
    await expect(repo.update("mem-ssm-a", { tin: null })).rejects.toThrow(/no seller profile/i);
    expect(member.sellerProfile).toBeNull();
  });

  it("still renames a member that has no seller profile", async () => {
    const store = createMockStore();
    const member = store.members.find((item) => item.id === "mem-ssm-a")!;
    member.sellerProfile = null;
    const repo = createMockRepositories(store, () => getDevIdentity("dev-super-admin")).members;
    const updated = await repo.update("mem-ssm-a", { displayName: "Renamed Without Profile" });
    expect(updated.displayName).toBe("Renamed Without Profile");
    expect(member.sellerProfile).toBeNull();
  });
});
describe("referral sponsor verification", () => {
  it("verifies an eligible sales manager and keeps unknown codes generic", async () => {
    const store = createMockStore();
    for (const record of store.accreditations) {
      record.adminStatus = "active";
      record.expiryDate = "2099-12-31";
    }
    const sponsor = store.members.find((member) => member.designation === "SM" && member.status === "active")!;
    sponsor.referralCode = "REF-OK";
    const repositories = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    expect(await repositories.members.resolveReferralSponsor("REF-OK")).toMatchObject({ ok: true, sponsor: { memberId: sponsor.id } });
    expect(await repositories.members.resolveReferralSponsor("NOPE")).toMatchObject({ ok: false, publicMessage: "Referral code is invalid or currently unavailable." });
  });

  it("returns the same generic message for every failure reason", async () => {
    const store = createMockStore();
    for (const record of store.accreditations) {
      record.adminStatus = "active";
      record.expiryDate = "2099-12-31";
    }
    const sponsor = store.members.find((member) => member.id === "mem-sm-a")!;
    const ost = store.members.find((member) => member.designation === "OST")!;
    ost.referralCode = "REF-OST";
    const repositories = createMockRepositories(store, () => getDevIdentity("dev-super-admin"));
    const resolve = (code: string) => repositories.members.resolveReferralSponsor(code);
    expect(sponsor.referralCode).toBe("REF-SMALPHA");
    expect(await resolve("REF-SMALPHA")).toMatchObject({ ok: true });
    expect(await resolve("   ")).toMatchObject({ ok: false, reason: "EMPTY_INPUT" });
    expect(await resolve("REF-OST")).toMatchObject({ ok: false, reason: "INELIGIBLE_DESIGNATION" });
    const twin = store.members.find((member) => member.id === "mem-ssm-a")!;
    twin.referralCode = "REF-SMALPHA";
    expect(await resolve("REF-SMALPHA")).toMatchObject({ ok: false, reason: "AMBIGUOUS_CODE" });
    twin.referralCode = null;
    sponsor.status = "suspended";
    expect(await resolve("REF-SMALPHA")).toMatchObject({ ok: false, reason: "INACTIVE_SPONSOR" });
    sponsor.status = "active";
    store.accreditations.find((record) => record.memberId === sponsor.id)!.adminStatus = "pending";
    expect(await resolve("REF-SMALPHA")).toMatchObject({ ok: false, reason: "INELIGIBLE_ACCREDITATION" });
    for (const code of ["REF-OST", "NOPE"]) {
      expect(await resolve(code)).toMatchObject({ publicMessage: "Referral code is invalid or currently unavailable." });
    }
  });
});
