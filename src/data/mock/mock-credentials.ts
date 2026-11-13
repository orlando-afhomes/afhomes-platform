// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { resolveActorAccountId } from "@/data/mock/authorization";
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";
import type { MockStore } from "@/data/mock/seed";

export type MockPortal = "admin" | "staff" | "sales";

export type MockAccount = { email: string; password: string; identityId: string; portal: MockPortal };

const PASSWORD = "Afhomes@2026";

const ACCOUNT_ROWS: Array<[string, string, MockPortal]> = [
  ["superadmin@afhomes.test", "dev-super-admin", "admin"],
  ["admin@afhomes.test", "dev-admin", "admin"],
  ["finance@afhomes.test", "dev-finance", "staff"],
  ["hr@afhomes.test", "dev-hr", "staff"],
  ["clerk@afhomes.test", "dev-clerk", "staff"],
  ["svd.alpha@afhomes.test", "dev-svd-a", "sales"],
  ["ssm.alpha@afhomes.test", "dev-ssm-a", "sales"],
  ["sm.alpha@afhomes.test", "dev-sm-a", "sales"],
  ["ost.alpha1@afhomes.test", "dev-ost-a1", "sales"],
  ["ost.alpha2@afhomes.test", "dev-ost-a2", "sales"],
  ["svd.beta@afhomes.test", "dev-svd-b", "sales"],
  ["ost.beta1@afhomes.test", "dev-ost-b1", "sales"],
  ["inactive@afhomes.test", "dev-inactive", "sales"],
  ["multirole@afhomes.test", "dev-multi-role", "sales"],
];

export const MOCK_ACCOUNTS: MockAccount[] = ACCOUNT_ROWS.map(([email, identityId, portal]) => ({
  email,
  password: PASSWORD,
  identityId,
  portal,
}));

const WRONG_PORTAL_MESSAGE: Record<MockPortal, string> = {
  admin: "This account signs in through Admin.",
  staff: "This account signs in through Staff.",
  sales: "Use the sales login at /login/sales.",
};

/** Store slice sign-in reads: the live account and staff records, plus Administrator-set passwords. */
export type MockLoginStore = Pick<MockStore, "accounts" | "staff" | "temporaryPasswords">;

const ACCOUNT_STATUS_MESSAGE: Record<string, string> = {
  pending: "This account is not active yet. Contact your administrator.",
  suspended: "This account is suspended. Contact your administrator.",
  deactivated: "This account has been deactivated. Contact your administrator.",
};

/**
 * Mock sign-in. With the live `store` it honors the stored account status
 * (Pending, Suspended and Deactivated cannot sign in) and a temporary
 * password an Administrator set for the linked account. Without it only the
 * static identity status applies.
 */
export function authenticateMock(
  email: string,
  password: string,
  portal: MockPortal,
  store?: MockLoginStore,
): { ok: true; identityId: string } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find((item) => item.email === normalized);
  const identity = account ? DEV_IDENTITIES.find((item) => item.id === account.identityId) : undefined;
  const accountId = identity && store ? resolveActorAccountId(store, identity) : null;
  const expectedPassword = (accountId ? store?.temporaryPasswords[accountId] : undefined) ?? account?.password;
  if (!account || expectedPassword !== password) return { ok: false, error: "Incorrect email or password." };
  if (account.portal !== portal) {
    return {
      ok: false,
      error: account.portal === "sales" && portal === "admin" ? "Sales accounts sign in at the sales login." : WRONG_PORTAL_MESSAGE[account.portal],
    };
  }
  if (!identity || identity.status !== "active") return { ok: false, error: "This account is not active. Contact your administrator." };
  const stored = accountId ? store?.accounts.find((item) => item.id === accountId) : undefined;
  if (accountId && (!stored || stored.status !== "active")) {
    return { ok: false, error: ACCOUNT_STATUS_MESSAGE[stored?.status ?? "deactivated"] };
  }
  return { ok: true, identityId: account.identityId };
}
