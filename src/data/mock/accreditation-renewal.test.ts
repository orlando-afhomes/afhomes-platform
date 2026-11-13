import { describe, expect, it } from "vitest";
import { MockAccreditationRepository } from "./accreditation-repository";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

/** OST accreditation expiring 2025-02-10 (in the past, so renewal dates in 2025 are never in the future). */
function setup() {
  const store = createMockStore();
  const record = store.accreditations.find((item) => item.id === "accr-seed-4")!;
  Object.assign(record, { adminStatus: "active", effectiveDate: "2024-02-10", originalAccreditationDate: "2024-02-10", expiryDate: "2025-02-10" });
  const member = store.members.find((item) => item.id === record.memberId)!;
  return { store, record, member, oldNumber: record.aaNumber! };
}

describe("accreditation renewal (doc 03 section 5)", () => {
  it("issues a new AA number from the renewal month, valid one year from the renewal date", async () => {
    const { store, record, member, oldNumber } = setup();
    const renewed = await as(store, "dev-admin").accreditations.renew(record.id, { renewalDate: "2025-02-18" });
    expect(renewed.aaNumber).toBe("AAO25020001");
    expect(renewed.aaNumber).not.toBe(oldNumber);
    expect(renewed.effectiveDate).toBe("2025-02-18");
    expect(renewed.expiryDate).toBe("2026-02-18");
    expect(renewed.originalAccreditationDate).toBe("2024-02-10");
    expect(renewed.aaNumberHistory).toEqual([expect.objectContaining({ aaNumber: oldNumber, replacedBy: "AAO25020001", replacedOn: "2025-02-18", actorId: "dev-admin" })]);
    expect(renewed.history.at(-1)).toMatchObject({ operation: "renewed", previousValue: oldNumber, newValue: "AAO25020001" });
    expect(member.aaNumber).toBe("AAO25020001");
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "ACCREDITATION_RENEWED", entityId: record.id, previousValue: oldNumber, newValue: "AAO25020001", actorId: "dev-admin" });
  });

  it("shares the monthly sequence with new accreditations and never reissues a history number", async () => {
    const { store, record } = setup();
    store.accreditations.push({ ...record, id: "accr-other", memberId: "mem-other", aaNumber: "AAO25020001", history: [] });
    store.accreditations.push({ ...record, id: "accr-hist", memberId: "mem-hist", aaNumber: "AAO25020009", aaNumberHistory: [{ aaNumber: "AAO25020002", replacedBy: "AAO25020009", replacedOn: "2025-02-02", actorId: "x", changedAt: "2025-02-02T00:00:00.000Z" }], history: [] });
    const renewed = await as(store, "dev-super-admin").accreditations.renew(record.id, { renewalDate: "2025-02-18" });
    expect(renewed.aaNumber).toBe("AAO25020003");
  });

  it("accepts a late renewal and counts one year from the actual date", async () => {
    const { store, record } = setup();
    const renewed = await as(store, "dev-admin").accreditations.renew(record.id, { renewalDate: "2025-06-01" });
    expect(renewed.aaNumber).toBe("AAO25060001");
    expect(renewed.expiryDate).toBe("2026-06-01");
  });

  it("holds early papers: a renewal before the expiry month is refused and changes nothing", async () => {
    const { store, record, oldNumber } = setup();
    await expect(as(store, "dev-admin").accreditations.renew(record.id, { renewalDate: "2025-01-31" })).rejects.toThrow(/expiry month/i);
    expect(record.aaNumber).toBe(oldNumber);
    expect(record.expiryDate).toBe("2025-02-10");
    expect(store.auditEvents.some((event) => event.action === "ACCREDITATION_RENEWED")).toBe(false);
  });

  it("prevents a duplicate renewal", async () => {
    const { store, record, oldNumber } = setup();
    const repo = as(store, "dev-admin").accreditations;
    await repo.renew(record.id, { renewalDate: "2025-02-18" });
    await expect(repo.renew(record.id, { renewalDate: "2025-02-19" })).rejects.toThrow(/expiry month/i);
    await expect(repo.renew(record.id, { renewalDate: "2026-02-18", expectedAaNumber: oldNumber })).rejects.toThrow(/already been renewed|changed/i);
  });

  it("refuses a future renewal date", async () => {
    const { store, record } = setup();
    await expect(as(store, "dev-admin").accreditations.renew(record.id, { renewalDate: "2999-01-01" })).rejects.toThrow(/future/i);
  });

  it("requires the Administrator or the Super Administrator", async () => {
    const { store, record } = setup();
    for (const id of ["dev-clerk", "dev-hr", "dev-finance", "dev-ost-a1", "dev-svd-a"]) {
      await expect(as(store, id).accreditations.renew(record.id, { renewalDate: "2025-02-18" })).rejects.toThrow(/authorization/i);
    }
  });

  it("never renews a leaver or an unapproved record", async () => {
    const { store, record } = setup();
    const repo = as(store, "dev-admin").accreditations;
    record.endDate = "2025-01-31";
    await expect(repo.renew(record.id, { renewalDate: "2025-02-18" })).rejects.toThrow(/resigned|terminated|accredited again/i);
    record.endDate = null;
    record.adminStatus = "revoked";
    await expect(repo.renew(record.id, { renewalDate: "2025-02-18" })).rejects.toThrow(/approved|accredited again/i);
    record.adminStatus = "pending";
    await expect(repo.renew(record.id, { renewalDate: "2025-02-18" })).rejects.toThrow(/approved/i);
  });

  it("does not change the account status", async () => {
    const { store, record, member } = setup();
    const account = store.accounts.find((item) => item.id === member.accountId);
    const before = account?.status;
    await as(store, "dev-admin").accreditations.renew(record.id, { renewalDate: "2025-02-18" });
    expect(account?.status).toBe(before);
  });
});

describe("AA Number History lookup and public verification", () => {
  it("resolves an old number to the member's current number, for admins and the public", async () => {
    const { store, record, member, oldNumber } = setup();
    record.expiryDate = "2099-12-31";
    record.aaNumberHistory = [{ aaNumber: "AAO24020001", replacedBy: oldNumber, replacedOn: "2025-02-18", actorId: "dev-admin", changedAt: "2025-02-18T00:00:00.000Z" }];
    const admin = as(store, "dev-admin").accreditations;
    expect(await admin.resolveAaNumber("aao24020001")).toEqual({ memberId: member.id, recordId: record.id, currentAaNumber: oldNumber, quotedNumberIsCurrent: false });
    expect(await admin.resolveAaNumber(oldNumber)).toMatchObject({ quotedNumberIsCurrent: true });
    expect(await admin.resolveAaNumber("AAO99990001")).toBeNull();

    const publicRepo = as(store, "dev-inactive").accreditations;
    expect(await publicRepo.verifyPublic("AAO24020001")).toEqual({ aaNumber: oldNumber, status: "valid", classification: "OST", validUntil: "2099-12-31", quotedNumberSuperseded: true });
    expect(await publicRepo.verifyPublic(oldNumber)).toMatchObject({ quotedNumberSuperseded: false });
  });

  it("shows an expired seller as Expired with restricted fields: IST hides Valid Until, OST shows it", async () => {
    const { store } = setup();
    const ist = store.accreditations.find((item) => item.id === "accr-seed-1")!;
    const ost = store.accreditations.find((item) => item.id === "accr-seed-4")!;
    Object.assign(ist, { adminStatus: "active", expiryDate: "2020-01-01" });
    const publicRepo = as(store, "dev-inactive").accreditations;
    expect(await publicRepo.verifyPublic(ist.aaNumber!)).toEqual({ aaNumber: ist.aaNumber, status: "expired", classification: "IST", validUntil: null, quotedNumberSuperseded: false });
    expect(await publicRepo.verifyPublic(ost.aaNumber!)).toMatchObject({ status: "expired", classification: "OST", validUntil: "2025-02-10" });
  });

  it("does not show a suspended, departed, pending or cancelled seller as valid", async () => {
    const { store, record } = setup();
    const publicRepo = as(store, "dev-inactive").accreditations;
    record.adminStatus = "suspended";
    expect(await publicRepo.verifyPublic(record.aaNumber!)).toBeNull();
    record.adminStatus = "active";
    record.endDate = "2025-01-01";
    expect(await publicRepo.verifyPublic(record.aaNumber!)).toBeNull();
    record.endDate = null;
    record.adminStatus = "cancelled";
    expect(await publicRepo.verifyPublic(record.aaNumber!)).toBeNull();
    record.adminStatus = "pending";
    expect(await publicRepo.verifyPublic(record.aaNumber!)).toBeNull();
  });
});

describe("action-specific eligibility (doc 03 section 9)", () => {
  it("keeps an expired seller eligible and flags the expiry; refuses a suspension or departure", async () => {
    const { store, record, member } = setup();
    const repo = new MockAccreditationRepository(store, () => getDevIdentity("dev-admin"));
    expect(await repo.checkEligibility(member.id, "2025-03-01")).toEqual({ eligible: true, reason: null, expired: true });
    expect(await repo.checkEligibility(member.id, "2025-02-10")).toEqual({ eligible: true, reason: null, expired: false });
    record.adminStatus = "suspended";
    record.suspensionEffectiveDate = "2025-02-01";
    expect(await repo.checkEligibility(member.id, "2025-01-31")).toMatchObject({ eligible: true });
    expect(await repo.checkEligibility(member.id, "2025-02-01")).toEqual({ eligible: false, reason: "SUSPENDED", expired: false });
    record.adminStatus = "active";
    record.suspensionEffectiveDate = null;
    record.endDate = "2025-01-31";
    expect(await repo.checkEligibility(member.id, "2025-02-01")).toEqual({ eligible: false, reason: "ENDED", expired: false });
  });
});
