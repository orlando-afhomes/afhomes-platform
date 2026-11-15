import { describe, expect, it } from "vitest";
import { areaTabHref, redirectToAreaTab } from "./area-redirect";

describe("area redirects", () => {
  it("builds the area tab URL and keeps the former route's query", () => {
    expect(areaTabHref("stay-points", "promos")).toBe("/admin/stay-points?tab=promos");
    expect(areaTabHref("organization", "staff", { view: "account", tab: "old", empty: undefined })).toBe("/admin/organization?tab=staff&view=account");
    expect(areaTabHref("finance", "payments", { status: ["a", "b"] })).toBe("/admin/finance?tab=payments&status=a&status=b");
  });

  it("redirects a former route to its tab", async () => {
    await expect(redirectToAreaTab("finance", "month-end-close", Promise.resolve({ month: "2026-10" }))).rejects.toMatchObject({
      digest: expect.stringContaining("/admin/finance?tab=month-end-close&month=2026-10"),
    });
  });
});
