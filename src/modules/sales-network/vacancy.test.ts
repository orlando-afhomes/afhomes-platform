import { describe, expect, it } from "vitest";
import type { OrgMember } from "@/modules/organization/types";
import {
  findOpenVacancy,
  getEffectiveChildIds,
  getEffectiveParentId,
  isSeatVacantOn,
  openVacancyStartByMember,
  seatEarnsAllowanceOn,
  vacancyStartDate,
  type SeatVacancy,
} from "@/modules/sales-network/vacancy";

function member(id: string, designation: OrgMember["designation"], parentId: string | null): OrgMember {
  return { id, displayName: id, designation, branchId: "b", parentId, status: "active" };
}

// svd -> ssm -> sm -> ost1 ; ssm -> ost2 ; svd -> ost3
const members = [
  member("svd", "SVD", null),
  member("ssm", "SSM", "svd"),
  member("sm", "SM", "ssm"),
  member("ost1", "OST", "sm"),
  member("ost2", "OST", "ssm"),
  member("ost3", "OST", "svd"),
];

function vacancy(seatMemberId: string, holderEndDate: string, filledOn: string | null = null): SeatVacancy {
  return {
    id: `vac-${seatMemberId}`,
    seatMemberId,
    holderEndDate,
    startDate: vacancyStartDate(holderEndDate),
    filledOn,
    filledMethod: filledOn ? "promotion" : null,
    filledByMemberId: null,
    recordedBy: "dev-admin",
    recordedAt: "2026-11-13T00:00:00.000Z",
  };
}

describe("seat vacancy dates (doc 02 section 5.1.1)", () => {
  it("starts the day after the holder's end date, across month and year ends", () => {
    expect(vacancyStartDate("2026-09-30")).toBe("2026-10-01");
    expect(vacancyStartDate("2026-12-31")).toBe("2027-01-01");
    expect(vacancyStartDate("2028-02-28")).toBe("2028-02-29");
  });

  it("is vacant from the start date until the day before the fill date", () => {
    const vacancies = [vacancy("ssm", "2026-09-30", "2026-12-01")];
    expect(isSeatVacantOn(vacancies, "ssm", "2026-09-30")).toBe(false);
    expect(isSeatVacantOn(vacancies, "ssm", "2026-10-01")).toBe(true);
    expect(isSeatVacantOn(vacancies, "ssm", "2026-11-30")).toBe(true);
    expect(isSeatVacantOn(vacancies, "ssm", "2026-12-01")).toBe(false);
  });

  it("stays vacant with no end until filled", () => {
    expect(isSeatVacantOn([vacancy("ssm", "2026-09-30")], "ssm", "2099-01-01")).toBe(true);
    expect(findOpenVacancy([vacancy("ssm", "2026-09-30")], "ssm")?.startDate).toBe("2026-10-01");
    expect(findOpenVacancy([vacancy("ssm", "2026-09-30", "2026-12-01")], "ssm")).toBeNull();
  });

  it("maps only open vacancies to their start date for the read-only indicator", () => {
    const map = openVacancyStartByMember([vacancy("ssm", "2026-09-30"), vacancy("sm", "2026-08-31", "2026-11-01")]);
    expect([...map.entries()]).toEqual([["ssm", "2026-10-01"]]);
  });

  it("earns no seat allowance only while vacant; past periods are unchanged", () => {
    const vacancies = [vacancy("ssm", "2026-09-30", "2026-12-01")];
    expect(seatEarnsAllowanceOn(vacancies, "ssm", "2026-09-15")).toBe(true);
    expect(seatEarnsAllowanceOn(vacancies, "ssm", "2026-10-15")).toBe(false);
    expect(seatEarnsAllowanceOn(vacancies, "ssm", "2027-01-15")).toBe(true);
    expect(seatEarnsAllowanceOn(vacancies, "sm", "2026-10-15")).toBe(true);
  });
});

describe("roll-up to the next active level (doc 02 section 5.1.1 item 3)", () => {
  const vacancies = [vacancy("ssm", "2026-09-30", "2026-12-01")];

  it("credits a vacant seat's downline to the next active level above", () => {
    expect(getEffectiveParentId("sm", members, vacancies, "2026-10-15")).toBe("svd");
    expect(getEffectiveParentId("ost2", members, vacancies, "2026-10-15")).toBe("svd");
    expect(getEffectiveParentId("ost1", members, vacancies, "2026-10-15")).toBe("sm");
  });

  it("changes nothing before the vacancy and after the seat is filled", () => {
    expect(getEffectiveParentId("sm", members, vacancies, "2026-09-30")).toBe("ssm");
    expect(getEffectiveParentId("sm", members, vacancies, "2026-12-01")).toBe("ssm");
  });

  it("leaves the genealogy untouched: the team stays under the vacant seat", () => {
    expect(members.find((item) => item.id === "sm")?.parentId).toBe("ssm");
    getEffectiveParentId("sm", members, vacancies, "2026-10-15");
    expect(members.find((item) => item.id === "sm")?.parentId).toBe("ssm");
  });

  it("lists the effective children of the level above, without the vacant seat itself", () => {
    expect(getEffectiveChildIds("svd", members, vacancies, "2026-10-15").sort()).toEqual(["ost2", "ost3", "sm"]);
    expect(getEffectiveChildIds("svd", members, vacancies, "2026-12-01").sort()).toEqual(["ost3", "ssm"]);
  });

  it("rolls up across consecutive vacant seats", () => {
    const both = [vacancy("ssm", "2026-09-30"), vacancy("sm", "2026-09-30")];
    expect(getEffectiveParentId("ost1", members, both, "2026-10-15")).toBe("svd");
  });

  it("earns nothing at the top of the tree: no effective parent above a vacant root", () => {
    const rootVacant = [vacancy("svd", "2026-09-30")];
    expect(getEffectiveParentId("ssm", members, rootVacant, "2026-10-15")).toBeNull();
    expect(getEffectiveParentId("ost3", members, rootVacant, "2026-10-15")).toBeNull();
  });

  it("survives a malformed cycle", () => {
    const cyclic = [member("a", "SM", "b"), member("b", "SM", "a")];
    expect(getEffectiveParentId("a", cyclic, [vacancy("b", "2026-09-30")], "2026-10-15")).toBeNull();
  });
});
