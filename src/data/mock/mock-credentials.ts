// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";

export type MockPortal = "admin" | "staff" | "sales";

export type MockAccount = { email: string; password: string; identityId: string; portal: MockPortal };

const PASSWORD = "Afhomes@2026";

const ACCOUNT_ROWS: Array<[string, string, MockPortal]> = [
  ["superadmin@afhomes.test", "dev-super-admin", "admin"],
  ["admin@afhomes.test", "dev-admin", "admin"],
  ["finance@afhomes.test", "dev-finance", "staff"],
  ["hr@afhomes.test", "dev-hr", "staff"],
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

export function authenticateMock(
  email: string,
  password: string,
  portal: MockPortal,
): { ok: true; identityId: string } | { ok: false; error: string } {
  const normalized = email.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find((item) => item.email === normalized);
  if (!account || account.password !== password) return { ok: false, error: "Incorrect email or password." };
  if (account.portal !== portal) {
    return {
      ok: false,
      error: account.portal === "sales" && portal === "admin" ? "Sales accounts sign in at the sales login." : WRONG_PORTAL_MESSAGE[account.portal],
    };
  }
  const identity = DEV_IDENTITIES.find((item) => item.id === account.identityId);
  if (!identity || identity.status !== "active") return { ok: false, error: "This account is not active. Contact your administrator." };
  return { ok: true, identityId: account.identityId };
}
