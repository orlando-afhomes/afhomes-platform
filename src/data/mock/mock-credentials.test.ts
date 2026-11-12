// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { describe, expect, it } from "vitest";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";
import { MOCK_ACCOUNTS, authenticateMock } from "@/data/mock/mock-credentials";

const PW = "Afhomes@2026";

describe("mock credentials", () => {
  it("has exactly one unique account per identity", () => {
    expect(MOCK_ACCOUNTS).toHaveLength(DEV_IDENTITIES.length);
    expect(new Set(MOCK_ACCOUNTS.map((a) => a.email)).size).toBe(MOCK_ACCOUNTS.length);
    for (const identity of DEV_IDENTITIES) {
      expect(MOCK_ACCOUNTS.filter((a) => a.identityId === identity.id)).toHaveLength(1);
    }
  });

  it("signs in on the matching portal", () => {
    expect(authenticateMock("admin@afhomes.test", PW, "admin")).toEqual({ ok: true, identityId: "dev-admin" });
    expect(authenticateMock("finance@afhomes.test", PW, "staff")).toEqual({ ok: true, identityId: "dev-finance" });
    expect(authenticateMock("multirole@afhomes.test", PW, "sales")).toEqual({ ok: true, identityId: "dev-multi-role" });
  });

  it("ignores email case and surrounding spaces", () => {
    expect(authenticateMock("  HR@AFHomes.test ", PW, "staff")).toEqual({ ok: true, identityId: "dev-hr" });
  });

  it("rejects wrong password and unknown email generically", () => {
    const generic = { ok: false, error: "Incorrect email or password." };
    expect(authenticateMock("admin@afhomes.test", "nope", "admin")).toEqual(generic);
    expect(authenticateMock("ghost@afhomes.test", PW, "admin")).toEqual(generic);
  });

  it("names the right login for the wrong portal", () => {
    expect(authenticateMock("admin@afhomes.test", PW, "staff")).toEqual({ ok: false, error: "This account signs in through Admin." });
    expect(authenticateMock("finance@afhomes.test", PW, "admin")).toEqual({ ok: false, error: "This account signs in through Staff." });
    expect(authenticateMock("ost.alpha1@afhomes.test", PW, "admin")).toEqual({ ok: false, error: "Sales accounts sign in at the sales login." });
    expect(authenticateMock("ost.alpha1@afhomes.test", PW, "staff")).toEqual({ ok: false, error: "Use the sales login at /login/sales." });
    expect(authenticateMock("admin@afhomes.test", PW, "sales")).toEqual({ ok: false, error: "This account signs in through Admin." });
  });

  it("rejects inactive identities", () => {
    expect(authenticateMock("inactive@afhomes.test", PW, "sales")).toEqual({
      ok: false,
      error: "This account is not active. Contact your administrator.",
    });
  });
});
