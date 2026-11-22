import type { CardHolder, MemberQrCode, MemberQrHolder, MemberQrRepository } from "@/data/contracts/member-qr-repository";
import type { DevIdentity } from "@/modules/identity/types";
import { BusinessRepository, today } from "./business-base";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";

const prefix = "afhomes:member:1:";
const format = /^afhomes:member:1:[a-f0-9]{32}$/;
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");

export function currentCardHolders(store: MockStore, membershipId: string) {
  const membership = store.memberships.find((item) => item.id === membershipId);
  if (!membership?.cardId) return [];
  const customer = store.customers.find((item) => item.id === membership.customerId);
  if (!customer || customer.status === "inactive" || customer.status === "rejected") return [];
  const grant = store.contracts.find((item) => item.id === membership.contractId);
  const info = {
    membershipId,
    vipNumber: membership.cardId,
    financialHold: membership.financialHold,
    status: membership.status === "active" && membership.validityEndDate && membership.validityEndDate < today()
      ? "expired" : membership.status,
  };
  const owner = JSON.stringify([customer.id, membership.cardId, membership.cardServices?.length ?? 0]);
  const holders: Array<{ key: string; info: MemberQrHolder }> = [
    { key: owner, info: { ...info, holder: "primary", holderName: customer.displayName, photoUrl: customer.profilePhoto?.dataUrl ?? null } },
  ];
  const extra = customer.supplementaryHolder;
  if (grant?.benefits.supplementaryHolders && extra && extra.firstName && extra.lastName) {
    holders.push({
      key: JSON.stringify([owner, extra.firstName, extra.middleName, extra.lastName, extra.suffix, extra.dateOfBirth]),
      info: { ...info, holder: "supplementary", holderName: [extra.firstName, extra.middleName, extra.lastName, extra.suffix].filter(Boolean).join(" ") },
    });
  }
  return holders;
}

export function invalidateChangedHolderCodes(store: MockStore, customerId: string): void {
  for (const membership of store.memberships.filter((item) => item.customerId === customerId)) {
    const holders = currentCardHolders(store, membership.id);
    for (const role of ["primary", "supplementary"] as const) {
      const id = JSON.stringify([membership.id, role]);
      const record = store.memberQr[id];
      if (record && !holders.some(({ key, info }) => info.holder === role && key === record.holderKey)) {
        delete store.memberQr[id];
      }
    }
  }
}

function resolvedHolder(store: MockStore, code: string): MemberQrHolder | undefined {
  const match = Object.entries(store.memberQr).find(([, item]) => prefix + item.token === code);
  if (!match) return undefined;
  const [membershipId, role] = JSON.parse(match[0]) as [string, CardHolder];
  const holder = currentCardHolders(store, membershipId).find(({ info }) => info.holder === role);
  return holder?.key === match[1].holderKey && holder.info.status === "active" ? holder.info : undefined;
}

export function requireCurrentScan(store: MockStore, code: string | undefined, membershipId: string, role: CardHolder): void {
  if (code === undefined) return;
  const holder = resolvedHolder(store, code);
  if (!holder || holder.membershipId !== membershipId || holder.holder !== role) {
    throw new Error("This membership QR is no longer valid for the selected holder. Scan the current code.");
  }
}

/** Stable holder code for a membership; used by staff and the read-only customer portal. */
export function issueHolderCode(store: MockStore, membershipId: string, role: CardHolder): MemberQrCode | undefined {
  const holder = currentCardHolders(store, membershipId).find(({ info }) => info.holder === role && info.status === "active");
  if (!holder) return undefined;
  const { info, key } = holder;
  const id = JSON.stringify([info.membershipId, info.holder]);
  let record = store.memberQr[id];
  if (record?.holderKey !== key) {
    record = { holderKey: key, token: newToken() };
    store.memberQr[id] = record;
  }
  return { ...info, code: prefix + record.token };
}

export class MockMemberQrRepository extends BusinessRepository implements MemberQrRepository {
  private requireLookup(identity: DevIdentity) {
    // A scan is not a customer lookup: the prototype GSD counter may resolve a code for Promo Points use.
    if (this.can(identity, "customers.lookup") || this.can(identity, "promo-points.use")) return;
    throw new Error("Your account cannot look up customers.");
  }

  private issue(holder: ReturnType<typeof currentCardHolders>[number], token?: string): MemberQrCode {
    const { info, key } = holder;
    const id = JSON.stringify([info.membershipId, info.holder]);
    let record = this.store.memberQr[id];
    if (token || record?.holderKey !== key) {
      record = { holderKey: key, token: token ?? newToken() };
      this.store.memberQr[id] = record;
    }
    return { ...info, code: prefix + record.token };
  }

  identify(membershipId: string): Promise<MemberQrHolder[]> {
    return this.run(undefined, (identity) => {
      this.requireLookup(identity);
      return currentCardHolders(this.store, membershipId).map(({ info }) => info);
    });
  }

  holders(membershipId: string): Promise<MemberQrCode[]> {
    return this.run(undefined, (identity) => {
      this.requireLookup(identity);
      return currentCardHolders(this.store, membershipId).filter(({ info }) => info.status === "active").map((holder) => this.issue(holder));
    });
  }

  resolve(code: string): Promise<MemberQrHolder> {
    return this.run(undefined, (identity) => {
      this.requireLookup(identity);
      if (!format.test(code)) throw new Error("Scan an AFhomes membership QR.");
      const holder = resolvedHolder(this.store, code);
      if (holder) return { ...holder, scannedCode: code };
      throw new Error("This membership QR is no longer available.");
    });
  }

  replace(membershipId: string, role: CardHolder): Promise<MemberQrCode> {
    return this.run(undefined, (identity) => {
      this.requireLookup(identity);
      if (!activeRoles(identity).some((role) => role === "admin" || role === "super_admin")) throw new Error("Only an Administrator can replace this QR.");
      const holder = currentCardHolders(this.store, membershipId).find(({ info }) => info.holder === role && info.status === "active");
      if (!holder) throw new Error("Select an active cardholder.");
      const next = this.issue(holder, newToken());
      this.audit(identity, { module: "membership", action: "MEMBER_QR_REPLACED", entityType: "membership", entityId: membershipId, newValue: role });
      return next;
    });
  }
}
