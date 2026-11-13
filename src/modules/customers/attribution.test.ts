import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
import { sellerUpline } from "./attribution";

describe("closing seller upline", () => {
  const { members } = createMockStore();

  it("reads SM, SSM and SVD from the Sales Network for an OST", () => {
    const upline = sellerUpline(members, "mem-ost-a1");
    expect([upline.sm?.id, upline.ssm?.id, upline.svd?.id]).toEqual(["mem-sm-a", "mem-ssm-a", "mem-svd-a"]);
  });

  it("leaves SM and SSM empty for an OST who reports straight to the SVD", () => {
    const upline = sellerUpline(members, "mem-ost-a2");
    expect([upline.sm, upline.ssm, upline.svd?.id]).toEqual([null, null, "mem-svd-a"]);
  });

  it("counts an IST seller as their own rung and handles no seller", () => {
    expect(sellerUpline(members, "mem-ssm-a")).toMatchObject({ sm: null, ssm: { id: "mem-ssm-a" }, svd: { id: "mem-svd-a" } });
    expect(sellerUpline(members, null)).toEqual({ sm: null, ssm: null, svd: null });
  });
});
