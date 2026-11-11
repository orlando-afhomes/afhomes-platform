import { describe, expect, it } from "vitest";
import type { Designation, OrgMember } from "@/modules/organization/types";
import { genealogyTeamOstIds, resolveAttributionChain } from "@/modules/sales-network/genealogy";

function makeMember(
  id: string,
  designation: Designation,
  parentId: string | null,
  overrides: Partial<OrgMember> = {},
): OrgMember {
  return {
    id,
    displayName: `Member ${id}`,
    designation,
    branchId: "branch-1",
    parentId,
    status: "active",
    aaNumber: null,
    ...overrides,
  };
}

/** Seed-shaped network: OST → SM → SSM → SVD. */
function seedLikeNetwork(): OrgMember[] {
  return [
    makeMember("svd-1", "SVD", null, { displayName: "SVD One", aaNumber: "AA-0001" }),
    makeMember("ssm-1", "SSM", "svd-1", { displayName: "SSM One", aaNumber: "AA-0002" }),
    makeMember("sm-1", "SM", "ssm-1", { displayName: "SM One", aaNumber: "AA-0003" }),
    makeMember("ost-1", "OST", "sm-1", { displayName: "OST One", aaNumber: "AA-0004" }),
  ];
}

/** Seed-shaped network with two SVD teams: Alpha (two OSTs) and Beta (one OST). */
function twoTeamNetwork(): OrgMember[] {
  return [
    makeMember("svd-a", "SVD", null, { displayName: "SVD Alpha", aaNumber: "AA-1001" }),
    makeMember("ssm-a", "SSM", "svd-a", { displayName: "SSM Alpha", aaNumber: "AA-1002" }),
    makeMember("sm-a", "SM", "ssm-a", { displayName: "SM Alpha", aaNumber: "AA-1003" }),
    makeMember("ost-a1", "OST", "sm-a", { displayName: "OST Alpha One", aaNumber: "AA-1004" }),
    makeMember("ost-a2", "OST", "svd-a", { displayName: "OST Alpha Two", aaNumber: "AA-1005" }),
    makeMember("svd-b", "SVD", null, { displayName: "SVD Beta", aaNumber: "AA-1006" }),
    makeMember("ost-b1", "OST", "svd-b", { displayName: "OST Beta One", aaNumber: "AA-1007" }),
  ];
}

describe("resolveAttributionChain", () => {
  it("resolves the full chain from an active OST referrer", () => {
    const chain = resolveAttributionChain(seedLikeNetwork(), "ost-1");

    expect(chain.referrer).toEqual({
      id: "ost-1",
      displayName: "OST One",
      aaNumber: "AA-0004",
      designation: "OST",
    });
    expect(chain.recommender).toBeNull();
    expect(chain.sm?.id).toBe("sm-1");
    expect(chain.ssm?.id).toBe("ssm-1");
    expect(chain.svd?.id).toBe("svd-1");
    expect(chain.sm?.designation).toBe("SM");
    expect(chain.ssm?.designation).toBe("SSM");
    expect(chain.svd?.designation).toBe("SVD");
  });

  it("leaves sm and ssm null when OST reports directly to an SVD", () => {
    const members = [
      makeMember("svd-1", "SVD", null),
      makeMember("ost-1", "OST", "svd-1"),
    ];

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.referrer?.id).toBe("ost-1");
    expect(chain.sm).toBeNull();
    expect(chain.ssm).toBeNull();
    expect(chain.svd?.id).toBe("svd-1");
  });

  it("fills a direct-to-SVD referrer's missing rungs from the recommender's chain", () => {
    // Mirrors the seed: Ana reports through SM → SSM → SVD, while Mark reports
    // straight to the same SVD. The team's managers must still be shown.
    const members = twoTeamNetwork();

    const chain = resolveAttributionChain(members, "ost-a2", "ost-a1");

    expect(chain.referrer?.id).toBe("ost-a2");
    expect(chain.recommender?.id).toBe("ost-a1");
    expect(chain.sm?.id).toBe("sm-a");
    expect(chain.ssm?.id).toBe("ssm-a");
    expect(chain.svd?.id).toBe("svd-a");
  });

  it("skips an inactive upline and keeps walking to active ancestors", () => {
    const members = [
      makeMember("svd-1", "SVD", null),
      makeMember("ssm-1", "SSM", "svd-1"),
      makeMember("sm-1", "SM", "ssm-1", { status: "inactive" }),
      makeMember("ost-1", "OST", "sm-1"),
    ];

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.referrer?.id).toBe("ost-1");
    // The deactivated SM is not reported, but the SSM above it still is.
    expect(chain.sm).toBeNull();
    expect(chain.ssm?.id).toBe("ssm-1");
    expect(chain.svd?.id).toBe("svd-1");
  });

  it("rejects a referrer whose designation is not OST", () => {
    const chain = resolveAttributionChain(seedLikeNetwork(), "sm-1");

    expect(chain.referrer).toBeNull();
    expect(chain.recommender).toBeNull();
    expect(chain.sm).toBeNull();
    expect(chain.ssm).toBeNull();
    expect(chain.svd).toBeNull();
  });

  it("rejects an inactive OST referrer and an unknown referrer id", () => {
    const members = [
      makeMember("svd-1", "SVD", null),
      makeMember("ost-1", "OST", "svd-1", { status: "inactive" }),
    ];

    expect(resolveAttributionChain(members, "ost-1").referrer).toBeNull();
    expect(resolveAttributionChain(seedLikeNetwork(), "missing-id").referrer).toBeNull();
  });

  it("falls back to the recommender when no referrer resolves", () => {
    const members = [
      makeMember("svd-1", "SVD", null),
      makeMember("ssm-1", "SSM", "svd-1"),
      makeMember("sm-1", "SM", "ssm-1"),
      makeMember("ost-recommender", "OST", "sm-1", { displayName: "Recommender OST" }),
    ];

    const chain = resolveAttributionChain(members, null, "ost-recommender");

    expect(chain.referrer).toBeNull();
    expect(chain.recommender?.id).toBe("ost-recommender");
    expect(chain.sm?.id).toBe("sm-1");
    expect(chain.ssm?.id).toBe("ssm-1");
    expect(chain.svd?.id).toBe("svd-1");
  });

  it("returns both parties but walks the upline from the referrer", () => {
    const members = [
      makeMember("svd-1", "SVD", null),
      makeMember("ssm-1", "SSM", "svd-1"),
      makeMember("sm-1", "SM", "ssm-1"),
      makeMember("sm-2", "SM", "ssm-1"),
      makeMember("ost-referrer", "OST", "sm-1"),
      makeMember("ost-recommender", "OST", "sm-2"),
    ];

    const chain = resolveAttributionChain(members, "ost-referrer", "ost-recommender");

    expect(chain.referrer?.id).toBe("ost-referrer");
    expect(chain.recommender?.id).toBe("ost-recommender");
    expect(chain.sm?.id).toBe("sm-1");
  });

  it("terminates on a genealogy cycle without inventing ancestors", () => {
    const members = [
      makeMember("ost-1", "OST", "sm-1"),
      makeMember("sm-1", "SM", "ssm-1"),
      makeMember("ssm-1", "SSM", "sm-1"),
    ];

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.sm?.id).toBe("sm-1");
    expect(chain.ssm?.id).toBe("ssm-1");
    expect(chain.svd).toBeNull();
  });

  it("terminates on a self-parented member", () => {
    const members = [
      makeMember("ost-1", "OST", "sm-1"),
      makeMember("sm-1", "SM", "sm-1"),
    ];

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.sm?.id).toBe("sm-1");
    expect(chain.ssm).toBeNull();
    expect(chain.svd).toBeNull();
  });

  it("stops at the depth cap instead of walking an unbounded chain", () => {
    const members: OrgMember[] = [makeMember("svd-deep", "SVD", null)];
    let childId = "svd-deep";
    // 40 inactive uplines sit between the OST and the SVD; hops exceed the cap.
    for (let index = 39; index >= 0; index -= 1) {
      const id = `sm-hop-${index}`;
      members.push(makeMember(id, "SM", childId, { status: "inactive" }));
      childId = id;
    }
    members.push(makeMember("ost-1", "OST", childId));

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.referrer?.id).toBe("ost-1");
    expect(chain.sm).toBeNull();
    expect(chain.svd).toBeNull();
  });

  it("normalises a missing or blank aaNumber to null", () => {
    const members = [
      makeMember("svd-1", "SVD", null, { aaNumber: "   " }),
      makeMember("ost-1", "OST", "svd-1"),
    ];

    const chain = resolveAttributionChain(members, "ost-1");

    expect(chain.svd?.aaNumber).toBeNull();
    expect(chain.referrer?.aaNumber).toBeNull();
  });
});

describe("genealogyTeamOstIds", () => {
  it("returns every active OST under the anchor's SVD root and nothing from the other team", () => {
    const members = twoTeamNetwork();

    expect([...genealogyTeamOstIds(members, "ost-a1")].sort()).toEqual(["ost-a1", "ost-a2"]);
    expect([...genealogyTeamOstIds(members, "svd-a")].sort()).toEqual(["ost-a1", "ost-a2"]);
    expect([...genealogyTeamOstIds(members, "ost-b1")]).toEqual(["ost-b1"]);
  });

  it("resolves the team from any member of the chain, not only the SVD root", () => {
    const members = twoTeamNetwork();

    expect([...genealogyTeamOstIds(members, "sm-a")].sort()).toEqual(["ost-a1", "ost-a2"]);
    expect([...genealogyTeamOstIds(members, "ssm-a")].sort()).toEqual(["ost-a1", "ost-a2"]);
  });

  it("returns an empty set for an unknown or missing anchor", () => {
    const members = twoTeamNetwork();

    expect(genealogyTeamOstIds(members, "missing-id").size).toBe(0);
    expect(genealogyTeamOstIds(members, null).size).toBe(0);
    expect(genealogyTeamOstIds(members, undefined).size).toBe(0);
    expect(genealogyTeamOstIds(members, "").size).toBe(0);
  });

  it("returns an empty set when the anchor's chain does not end at an SVD", () => {
    const members = [
      makeMember("ost-root", "OST", null),
      makeMember("sm-root", "SM", null),
      makeMember("ost-under-sm", "OST", "sm-root"),
      makeMember("ssm-orphan", "SSM", "missing-svd"),
      makeMember("ost-under-orphan", "OST", "ssm-orphan"),
    ];

    // The anchor itself is the root and is not an SVD.
    expect(genealogyTeamOstIds(members, "ost-root").size).toBe(0);
    // The chain ends at a rootless SM.
    expect(genealogyTeamOstIds(members, "ost-under-sm").size).toBe(0);
    // The parent link points at a member outside the roster.
    expect(genealogyTeamOstIds(members, "ost-under-orphan").size).toBe(0);
  });

  it("excludes inactive OSTs and non-OST team members", () => {
    const members = [
      ...twoTeamNetwork(),
      makeMember("ost-a3", "OST", "sm-a", { displayName: "OST Alpha Three", status: "inactive" }),
      makeMember("ost-a4", "OST", "svd-a", { displayName: "OST Alpha Four" }),
    ];

    const ids = genealogyTeamOstIds(members, "ost-a1");

    expect([...ids].sort()).toEqual(["ost-a1", "ost-a2", "ost-a4"]);
    expect(ids.has("ost-a3")).toBe(false);
    expect(ids.has("sm-a")).toBe(false);
    expect(ids.has("ssm-a")).toBe(false);
    expect(ids.has("svd-a")).toBe(false);
  });

  it("stops on a genealogy cycle instead of walking forever", () => {
    const members = [
      makeMember("ost-1", "OST", "sm-1"),
      makeMember("sm-1", "SM", "ssm-1"),
      makeMember("ssm-1", "SSM", "sm-1"),
    ];

    expect(genealogyTeamOstIds(members, "ost-1").size).toBe(0);
  });

  it("stops on a self-parented anchor", () => {
    const members = [makeMember("ost-1", "OST", "ost-1")];

    expect(genealogyTeamOstIds(members, "ost-1").size).toBe(0);
  });

  it("still resolves the team when the root's parent link loops back into the team", () => {
    const members = [
      makeMember("svd-1", "SVD", "sm-1"),
      makeMember("sm-1", "SM", "svd-1"),
      makeMember("ost-1", "OST", "sm-1"),
    ];

    // The walk reaches the SVD root; its parent was already visited, so the
    // cycle stops there and the team resolves normally.
    expect([...genealogyTeamOstIds(members, "ost-1")]).toEqual(["ost-1"]);
  });
});
