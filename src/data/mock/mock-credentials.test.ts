// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { describe, expect, it } from "vitest";
import { createMockStore } from "@/data/mock/seed";
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

  it("blocks sign-in when the stored account is not active, with a clear message", () => {
    const store = createMockStore();
    expect(authenticateMock("hr@afhomes.test", PW, "staff", store)).toEqual({ ok: true, identityId: "dev-hr" });
    const account = store.accounts.find((item) => item.id === "acct-hr")!;
    account.status = "suspended";
    expect(authenticateMock("hr@afhomes.test", PW, "staff", store)).toEqual({ ok: false, error: "This account is suspended. Contact your administrator." });
    account.status = "deactivated";
    expect(authenticateMock("hr@afhomes.test", PW, "staff", store)).toEqual({ ok: false, error: "This account has been deactivated. Contact your administrator." });
  });

  it("honors a temporary password set for the linked account, and a wrong password still fails", () => {
    const store = createMockStore();
    store.temporaryPasswords["acct-hr"] = "Tmp-Example123";
    expect(authenticateMock("hr@afhomes.test", "Tmp-Example123", "staff", store)).toEqual({ ok: true, identityId: "dev-hr" });
    expect(authenticateMock("hr@afhomes.test", PW, "staff", store)).toEqual({ ok: false, error: "Incorrect email or password." });
  });

  it("signs in the seeded Clerk through the staff portal", () => {
    expect(authenticateMock("clerk@afhomes.test", PW, "staff", createMockStore())).toEqual({ ok: true, identityId: "dev-clerk" });
  });
});
