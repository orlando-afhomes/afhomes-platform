import { expect, it } from "vitest";
import { invalidateChangedHolderCodes } from "./member-qr-repository";
import { createMockStore } from "./seed";
import { createMockRepositories } from "./repositories";
import { getDevIdentity } from "./dev-identities";

it("resolves a seeded holder QR exactly and rejects a replaced code", async () => {
  const { memberQr } = createMockRepositories(createMockStore(), () => getDevIdentity("dev-admin"), { delayMs: 0 });
  const first = (await memberQr.holders("memb-1"))[0]!;
  expect(await memberQr.resolve(first.code)).toMatchObject({ membershipId: "memb-1", holder: "primary" });
  const replacement = await memberQr.replace("memb-1", "primary");
  expect(replacement.code).not.toBe(first.code);
  await expect(memberQr.resolve(first.code)).rejects.toThrow();
});

it("uses stable seeded codes and protects lookup and replacement by role", async () => {
  const store = createMockStore();
  const as = (id: string, data = store) => createMockRepositories(data, () => getDevIdentity(id), { delayMs: 0 }).memberQr;
  const admin = as("dev-admin");
  const [first] = await admin.holders("memb-1");
  expect((await as("dev-admin", createMockStore()).holders("memb-1"))[0].code).toBe(first.code);
  await expect(admin.resolve("https://example.com/")).rejects.toThrow(/AFhomes membership QR/);
  await expect(as("dev-ost-a1").resolve(first.code)).rejects.toThrow(/cannot look up/);
  await expect(as("dev-clerk").replace("memb-1", "primary")).rejects.toThrow(/Administrator/);
});

it("gives each membership and Gold holder a distinct code and rejects former holders", async () => {
  const store = createMockStore();
  const [member] = store.memberships;
  const customer = store.customers.find((item) => item.id === member.customerId)!;
  const contract = store.contracts.find((item) => item.id === member.contractId)!;
  contract.benefits.supplementaryHolders = 1;
  customer.supplementaryHolder = {
    firstName: "Sample", lastName: "Gold Holder", middleName: null, suffix: null,
    gender: null, dateOfBirth: null, citizenship: null,
  };
  store.memberships.push({ ...member, id: "second-membership", cardId: "second-vip" });
  const repo = createMockRepositories(store, () => getDevIdentity("dev-admin"), { delayMs: 0 }).memberQr;
  const [primary, extra] = await repo.holders(member.id);
  const [second] = await repo.holders("second-membership");
  expect(new Set([primary.code, extra.code, second.code]).size).toBe(3);
  await expect(repo.resolve(extra.code)).resolves.toMatchObject({ membershipId: member.id, holder: "supplementary" });
  await expect(repo.resolve(second.code)).resolves.toMatchObject({ membershipId: "second-membership" });
  const oldExtra = customer.supplementaryHolder;
  customer.supplementaryHolder = null;
  invalidateChangedHolderCodes(store, customer.id);
  customer.supplementaryHolder = oldExtra;
  await expect(repo.resolve(extra.code)).rejects.toThrow(/no longer available/);
  await expect(repo.resolve(primary.code)).resolves.toMatchObject({ holder: "primary" });
  member.customerId = store.customers.find((item) => item.id !== customer.id)!.id;
  await expect(repo.resolve(primary.code)).rejects.toThrow(/no longer available/);
});

