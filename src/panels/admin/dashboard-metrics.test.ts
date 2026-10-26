import { describe, expect, it } from "vitest";
import { countUplines, countVisibleCustomers, countVisibleMembers } from "./dashboard-metrics";

describe("dashboard metrics", () => {
  it("counts visible members", () => {
    expect(countVisibleMembers([{ id: "a" }, { id: "b" }])).toBe(2);
    expect(countVisibleMembers([])).toBe(0);
  });

  it("counts visible customers", () => {
    expect(countVisibleCustomers([{ id: "a" }])).toBe(1);
  });

  it("counts uplines", () => {
    expect(countUplines([{ id: "a" }, { id: "b" }, { id: "c" }])).toBe(3);
  });
});
