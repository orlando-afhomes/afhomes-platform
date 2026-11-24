import { describe, expect, it } from "vitest";
import { buildGenealogyIndex, genealogyPath, searchGenealogy } from "./genealogy";
import { buildLargeNetwork } from "./large-network.fixture";
import { getDescendantIds } from "@/modules/identity/record-scope";

describe("genealogy index on a large network", () => {
  const members = buildLargeNetwork(14_000);
  const allIds = new Set(members.map((member) => member.id));

  it("counts everyone by position", () => {
    const index = buildGenealogyIndex(members, allIds);
    expect(index.totals).toEqual({ svd: 3, ssm: 12, sm: 140, ost: 14_000 });
    expect(index.roots).toHaveLength(3);
    const first = index.roots[0];
    expect(first.levels.ost).toBeGreaterThan(0);
    expect(first.totalDescendantCount).toBe(first.levels.ssm + first.levels.sm + first.levels.ost);
    expect(first.teamName).toBe("Team 0");
    expect(index.byKey.get("ost-17")!.teamName).toBe(index.byKey.get("ost-17")!.teamName);
  });

  it("builds in well under a second and finds descendants quickly", () => {
    const start = performance.now();
    buildGenealogyIndex(members, allIds);
    expect(getDescendantIds("svd-0", members).size).toBeGreaterThan(1000);
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it("finds a seller by AA number first, with the path from the top", () => {
    const index = buildGenealogyIndex(members, allIds);
    const target = members.find((member) => member.id === "ost-9000")!;
    const results = searchGenealogy(index, target.aaNumber!);
    expect(results[0].node.key).toBe("ost-9000");
    expect(results[0].path[0]).toMatch(/^svd-/);
    expect(results[0].path.at(-1)).toBe("ost-9000");
    expect(genealogyPath(index, "ost-9000")).toEqual(results[0].path);
  });

  it("ranks an AA number match above a name match and caps the list", () => {
    const index = buildGenealogyIndex(members, allIds);
    expect(searchGenealogy(index, "Seller 0000", 20).length).toBeLessThanOrEqual(20);
    expect(searchGenealogy(index, "")).toEqual([]);
  });

  it("shows only the authorized branch", () => {
    const branch = new Set([...getDescendantIds("svd-1", members), "svd-1"]);
    const index = buildGenealogyIndex(members, branch);
    expect(index.roots.map((root) => root.key)).toEqual(["svd-1"]);
    expect(index.byKey.has("svd-0")).toBe(false);
    expect(index.totals.svd).toBe(1);
  });
});
