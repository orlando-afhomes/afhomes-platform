import { describe, expect, it } from "vitest";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

function as(store: ReturnType<typeof createMockStore>, id: string) {
  return createMockRepositories(store, () => getDevIdentity(id));
}

describe("seat vacancy records (doc 02 section 5.1.1)", () => {
  it("records a vacancy that starts the day after the holder's end date, keeps the team in place, and ends the holder's selling rights", async () => {
    const store = createMockStore();
    const record = store.accreditations.find((item) => item.memberId === "mem-ssm-a")!;
    const before = store.members.map((member) => `${member.id}:${member.parentId}`);
    const vacancy = await as(store, "dev-admin").members.recordSeatVacancy("mem-ssm-a", "2026-09-30");
    expect(vacancy).toMatchObject({ seatMemberId: "mem-ssm-a", holderEndDate: "2026-09-30", startDate: "2026-10-01", filledOn: null, filledMethod: null });
    expect(store.members.map((member) => `${member.id}:${member.parentId}`)).toEqual(before);
    expect(record.endDate).toBe("2026-09-30");
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "SEAT_VACANCY_RECORDED", entityId: "mem-ssm-a", newValue: "2026-10-01" });
  });

  it("is limited to Administrators, leader seats and one open vacancy per seat", async () => {
    const store = createMockStore();
    await expect(as(store, "dev-hr").members.recordSeatVacancy("mem-ssm-a", "2026-09-30")).rejects.toThrow(/authorization/i);
    await expect(as(store, "dev-svd-a").members.recordSeatVacancy("mem-ssm-a", "2026-09-30")).rejects.toThrow(/authorization/i);
    await expect(as(store, "dev-admin").members.recordSeatVacancy("mem-ost-a1", "2026-09-30")).rejects.toThrow(/leader seat/i);
    await expect(as(store, "dev-admin").members.recordSeatVacancy("mem-ssm-a", "not-a-date")).rejects.toThrow(/valid date/i);
    await as(store, "dev-admin").members.recordSeatVacancy("mem-ssm-a", "2026-09-30");
    await expect(as(store, "dev-super-admin").members.recordSeatVacancy("mem-ssm-a", "2026-10-15")).rejects.toThrow(/already vacant/i);
  });

  it("is filled only by promotion or transfer, from the fill date, without rewriting the past", async () => {
    const store = createMockStore();
    const admin = as(store, "dev-admin").members;
    const vacancy = await admin.recordSeatVacancy("mem-ssm-a", "2026-09-30");
    await expect(admin.fillSeatVacancy(vacancy.id, { method: "acting" as never, filledOn: "2026-12-01", newHolderMemberId: "mem-sm-a" })).rejects.toThrow(/promotion or.*transfer/i);
    await expect(admin.fillSeatVacancy(vacancy.id, { method: "promotion", filledOn: "2026-09-30", newHolderMemberId: "mem-sm-a" })).rejects.toThrow(/after the vacancy starts|on or after/i);
    const filled = await admin.fillSeatVacancy(vacancy.id, { method: "promotion", filledOn: "2026-12-01", newHolderMemberId: "mem-sm-a" });
    expect(filled).toMatchObject({ startDate: "2026-10-01", filledOn: "2026-12-01", filledMethod: "promotion", filledByMemberId: "mem-sm-a" });
    await expect(admin.fillSeatVacancy(vacancy.id, { method: "transfer", filledOn: "2026-12-02", newHolderMemberId: "mem-sm-a" })).rejects.toThrow(/already filled/i);
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "SEAT_VACANCY_FILLED", newValue: "promotion" });
  });

  it("lists vacancies within the caller's visible scope", async () => {
    const store = createMockStore();
    await as(store, "dev-admin").members.recordSeatVacancy("mem-ssm-a", "2026-09-30");
    expect(await as(store, "dev-super-admin").members.listSeatVacancies()).toHaveLength(1);
    expect(await as(store, "dev-svd-a").members.listSeatVacancies()).toHaveLength(1);
    expect(await as(store, "dev-svd-b").members.listSeatVacancies()).toHaveLength(0);
  });
});

describe("AA Number History in the member lookup (doc 03 section 5.2.1)", () => {
  it("finds the member by an old AA number as well as the current one", async () => {
    const store = createMockStore();
    const record = store.accreditations.find((item) => item.id === "accr-seed-4")!;
    const old = record.aaNumber!;
    Object.assign(record, { aaNumber: "AAO27020001", aaNumberHistory: [{ aaNumber: old, replacedBy: "AAO27020001", replacedOn: "2027-02-18", actorId: "dev-admin", changedAt: "2027-02-18T00:00:00.000Z" }] });
    store.members.find((item) => item.id === record.memberId)!.aaNumber = "AAO27020001";
    const members = as(store, "dev-admin").members;
    expect((await members.getByAaNumber("AAO27020001"))?.id).toBe(record.memberId);
    expect((await members.getByAaNumber(old.toLowerCase()))?.id).toBe(record.memberId);
  });
});
