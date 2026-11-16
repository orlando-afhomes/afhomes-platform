import { describe, expect, it } from "vitest";
import { MockCommissionRepository } from "./commission-repository";
import { getDevIdentity } from "./dev-identities";
import { createMockStore } from "./seed";

const standard = { designation: "OST", role: "DSC", rateBp: 500, approvalReference: "Board-approved schedule A" } as const;

function setup(identityId = "dev-admin") {
  const store = createMockStore();
  const repository = new MockCommissionRepository(store, () => getDevIdentity(identityId), { delayMs: 0 });
  return { store, repository };
}

describe("VIP position rates", () => {
  it("copies an approved standard only after confirming a seller's service terms", async () => {
    const { store, repository } = setup();
    await repository.setPositionRate(standard);
    expect(store.commissionRateSettings).toEqual([]);
    const adoption = { memberId: "mem-ost-a1", standard, serviceTermsReference: "Signed service terms A" };
    await repository.applyPositionRate(adoption);
    await repository.setPositionRate({ ...standard, rateBp: 700 });
    expect(store.commissionRateSettings).toEqual([
      { memberId: "mem-ost-a1", product: "VIP", role: "DSC", rateBp: 500, standardRateBp: 500 },
    ]);
    await expect(repository.applyPositionRate(adoption)).rejects.toThrow(/already has/i);
  });

  it("protects existing zero rates and only copies the confirmed standard for the seller's current position", async () => {
    const { store, repository } = setup();
    const zero = { ...standard, rateBp: 0 };
    await repository.setPositionRate(zero);
    const adopt = (memberId: string, expected = zero) => repository.applyPositionRate({ memberId, standard: expected, serviceTermsReference: "Signed service terms B" });
    await expect(adopt("mem-ost-a1", standard)).rejects.toThrow(/changed/i);
    await expect(adopt(store.members.find((member) => member.designation !== "OST")!.id)).rejects.toThrow(/position/i);
    await adopt("mem-ost-a1");
    expect(store.commissionRateSettings[0]).toMatchObject({ rateBp: 0, standardRateBp: 0 });
    await expect(adopt("mem-ost-a1")).rejects.toThrow(/already has/i);
  });

  it("restricts standards and seller adoption to administrators and requires documented references", async () => {
    const { repository } = setup("dev-finance");
    await expect(repository.setPositionRate(standard)).rejects.toThrow(/administrator/i);
    await expect(repository.applyPositionRate({ memberId: "mem-ost-a1", standard, serviceTermsReference: "Terms" })).rejects.toThrow(/administrator/i);
    const admin = setup().repository;
    await expect(admin.setPositionRate({ ...standard, approvalReference: " " })).rejects.toThrow(/approval reference/i);
    await admin.setPositionRate(standard);
    await expect(admin.applyPositionRate({ memberId: "mem-ost-a1", standard, serviceTermsReference: " " })).rejects.toThrow(/service terms/i);
  });
});
