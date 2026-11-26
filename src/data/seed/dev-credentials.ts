/**
 * Sign-in identities for the local synthetic seed (db:seed) and the emulator test suites.
 * These accounts exist only in the local database and tests; production accounts are created
 * through the staff and account workflows.
 */
export type SeedPortal = "admin" | "staff" | "sales";

export type SeedAccount = { email: string; password: string; identityId: string; portal: SeedPortal };

const PASSWORD = "Afhomes@2026";

const ACCOUNT_ROWS: Array<[string, string, SeedPortal]> = [
  ["orlandodelacruz@afhomes.com.ph", "dev-super-admin", "admin"],
  ["eduardo.ocampo@afhomes.com.ph", "dev-admin", "admin"],
  ["rosalinda.tan@afhomes.com.ph", "dev-finance", "staff"],
  ["carmela.rivera@afhomes.com.ph", "dev-hr", "staff"],
  ["marites.gonzales@afhomes.com.ph", "dev-clerk", "staff"],
  ["joel.fernandez@afhomes.com.ph", "dev-gsd", "staff"],
  ["ramon.delrosario@afhomes.com.ph", "dev-svd-a", "sales"],
  ["maria.santos@afhomes.com.ph", "dev-ssm-a", "sales"],
  ["jose.reyes@afhomes.com.ph", "dev-sm-a", "sales"],
  ["ana.mendoza@afhomes.com.ph", "dev-ost-a1", "sales"],
  ["mark.villanueva@afhomes.com.ph", "dev-ost-a2", "sales"],
  ["liza.aquino@afhomes.com.ph", "dev-svd-b", "sales"],
  ["paolo.ramos@afhomes.com.ph", "dev-ost-b1", "sales"],
  ["teresita.navarro@afhomes.com.ph", "dev-svd-c", "sales"],
  ["rowena.castillo@afhomes.com.ph", "dev-ost-c1", "sales"],
  ["amendoza.former@afhomes.com.ph", "dev-inactive", "sales"],
  ["jreyes.multirole@afhomes.com.ph", "dev-multi-role", "sales"],
];

export const SEED_ACCOUNTS: SeedAccount[] = ACCOUNT_ROWS.map(([email, identityId, portal]) => ({
  email,
  password: PASSWORD,
  identityId,
  portal,
}));
