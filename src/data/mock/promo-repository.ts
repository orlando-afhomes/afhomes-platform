import { projectPromoOffer, projectPublicOffers } from "./public-content-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type {
  PromoInput, PromoLedgerRow, PromoMembershipBalance, PromoRepository, PromoView, PublicPromoOffer, RecordPromoUseInput,
} from "@/data/contracts/promo-repository";
import { currentCardHolders, requireCurrentScan } from "./member-qr-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { canUsePoints, isUseVoided, promoBalance, promoBalanceByPromo } from "@/modules/promos/rules";
import type { Promo, PromoPointsEntry, PromoReward } from "@/modules/promos/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import { BusinessRepository, canSeeContract, customerName, nowIso, today } from "./business-base";
import { activeRoles } from "./dev-identities";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

const NAME_MAX = 80;
const NOTE_MAX = 200;
const REWARD_NAME_MAX = 80;
const REWARD_DESCRIPTION_MAX = 300;
const PUBLIC_TITLE_MAX = 120;
const PUBLIC_TEXT_MAX = 600;
const MANAGE_DENIED = "Managing promos is not allowed for this identity.";
const USE_DENIED = "Recording Promo Points use is not allowed for this identity.";

export class MockPromoRepository extends BusinessRepository implements PromoRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(promo: Promo): PromoView {
    const pointsEarned = this.store.promoPoints.filter((e) => e.promoId === promo.id && e.type === "earn").reduce((sum, e) => sum + e.points, 0);
    return {
      ...promo,
      earnOutletIds: [...promo.earnOutletIds],
      redeemOutletIds: [...promo.redeemOutletIds],
      rewards: promo.rewards.map((reward) => ({ ...reward })),
      pointsEarned,
    };
  }

  private find(id: string): Promo {
    const promo = this.store.promos.find((item) => item.id === id);
    if (!promo) throw new Error("Promo not found.");
    return promo;
  }

  private hasEntries(promoId: string): boolean {
    return this.store.promoPoints.some((e) => e.promoId === promoId);
  }

  private checkOutlets(ids: string[], label: string): string[] {
    const unique = [...new Set(ids)];
    if (unique.length === 0) throw new Error(`Select at least one ${label} outlet.`);
    if (unique.some((id) => !this.store.outlets.some((outlet) => outlet.id === id))) throw new Error("Select outlets from the outlet list.");
    return unique;
  }

  private clean(input: PromoInput, current?: Promo): Omit<Promo, "id" | "createdAt" | "updatedAt" | "sample"> {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (!name) throw new Error("A promo name is required.");
    if (name.length > NAME_MAX) throw new Error(`The name must be ${NAME_MAX} characters or fewer.`);
    if (this.store.promos.some((item) => item.id !== current?.id && item.name.toLowerCase() === name.toLowerCase())) throw new Error("A promo with this name already exists.");
    if (input.status !== "draft" && input.status !== "active") throw new Error("Select draft or active.");
    if (!parseManilaDateOnly(input.startDate) || !parseManilaDateOnly(input.endDate)) throw new Error("Enter valid start and end dates.");
    if (input.endDate < input.startDate) throw new Error("The end date cannot be before the start date.");
    if (!Number.isSafeInteger(input.earnPesosPerPointCentavos) || input.earnPesosPerPointCentavos <= 0) throw new Error("Enter pesos per point above zero.");
    const expiry = input.pointsExpiryDate || null;
    if (expiry !== null && (!parseManilaDateOnly(expiry) || expiry < input.endDate)) throw new Error("Points must expire on or after the promo end date.");
    const redeemOutletIds = this.checkOutlets(input.redeemOutletIds, "redeeming");
    const rewards = this.cleanRewards(input.rewards ?? current?.rewards ?? [], redeemOutletIds);
    const publicTitle = (input.publicTitle ?? current?.publicTitle ?? "").trim();
    const publicSummary = (input.publicSummary ?? current?.publicSummary ?? "").trim();
    const publicTerms = (input.publicTerms ?? current?.publicTerms ?? "").trim();
    if (publicTitle.length > PUBLIC_TITLE_MAX) throw new Error(`The public title must be ${PUBLIC_TITLE_MAX} characters or fewer.`);
    if (publicSummary.length > PUBLIC_TEXT_MAX) throw new Error(`The public summary must be ${PUBLIC_TEXT_MAX} characters or fewer.`);
    if (publicTerms.length > PUBLIC_TEXT_MAX) throw new Error(`The public terms must be ${PUBLIC_TEXT_MAX} characters or fewer.`);
    const published = input.published ?? current?.published ?? false;
    if (published) {
      if (input.status !== "active") throw new Error("Only an active promo can be published.");
      if (!publicTitle || !publicSummary || !publicTerms) throw new Error("Enter the public title, summary and terms before publishing.");
      if (rewards.filter((reward) => reward.status === "active").length === 0) throw new Error("Configure at least one reward before publishing.");
      for (const reward of rewards.filter((item) => item.status === "active")) {
        if (!Number.isSafeInteger(reward.pointsCost) || reward.pointsCost <= 0) throw new Error(`Enter the approved point cost for ${reward.name}.`);
      }
    }
    return {
      name, status: input.status, startDate: input.startDate, endDate: input.endDate,
      earnOutletIds: this.checkOutlets(input.earnOutletIds, "earning"),
      earnPesosPerPointCentavos: input.earnPesosPerPointCentavos,
      redeemOutletIds,
      pointsExpiryDate: expiry,
      rewards,
      publicTitle,
      publicSummary,
      publicTerms,
      published,
    };
  }

  private cleanRewards(rewards: PromoInput["rewards"], redeemOutletIds: string[]): PromoReward[] {
    const rows = rewards ?? [];
    const seenNames = new Set<string>();
    const seenIds = new Set<string>();
    return rows.map((input) => {
      const name = input.name.trim().replace(/\s+/g, " ");
      if (!name) throw new Error("Every reward needs a name.");
      if (name.length > REWARD_NAME_MAX) throw new Error(`Reward names must be ${REWARD_NAME_MAX} characters or fewer.`);
      if (seenNames.has(name.toLowerCase())) throw new Error("Reward names must be unique within a promo.");
      seenNames.add(name.toLowerCase());
      const description = input.description.trim();
      if (description.length > REWARD_DESCRIPTION_MAX) throw new Error(`Reward descriptions must be ${REWARD_DESCRIPTION_MAX} characters or fewer.`);
      if (!this.store.outlets.some((outlet) => outlet.id === input.outletId)) throw new Error("Select a reward outlet from the outlet list.");
      if (!redeemOutletIds.includes(input.outletId)) throw new Error("A reward outlet must also be one of the promo's redeem outlets.");
      if (!Number.isSafeInteger(input.pointsCost) || input.pointsCost <= 0) throw new Error(`Enter the approved point cost for ${name}.`);
      const status = input.status === "archived" ? "archived" : "active";
      const id = input.id && !seenIds.has(input.id) ? input.id : nextId(this.store, "promoReward", "pr");
      seenIds.add(id);
      return { id, name, description, outletId: input.outletId, pointsCost: input.pointsCost, status };
    });
  }

  private visibleMemberships(identity: DevIdentity) {
    return this.store.memberships.filter((membership) => {
      const contract = this.store.contracts.find((item) => item.id === membership.contractId);
      return contract && canSeeContract(identity, contract);
    });
  }

  /** GSD reaches only the scanned membership for a Promo Points use and its balance. */
  private promoMemberships(identity: DevIdentity) {
    if (activeRoles(identity).includes("gsd")) return this.store.memberships;
    return this.visibleMemberships(identity);
  }

  private row(entry: PromoPointsEntry): PromoLedgerRow {
    const membership = this.store.memberships.find((item) => item.id === entry.membershipId);
    return {
      ...entry,
      promoName: this.store.promos.find((item) => item.id === entry.promoId)?.name ?? "Unknown promo",
      customerName: membership ? customerName(this.store, membership.customerId) : "Unknown customer",
      vipNumber: membership?.cardId ?? null,
      outletName: entry.outletId ? this.store.outlets.find((item) => item.id === entry.outletId)?.name ?? null : null,
      voided: entry.type === "use" && isUseVoided(this.store.promoPoints, entry.id),
    };
  }

  private record(identity: DevIdentity, action: string, promoId: string, previousValue: string | null, newValue: string | null, extra?: { reason?: string; related?: string[] }) {
    this.audit(identity, { module: "stay-points", action, entityType: "promo", entityId: promoId, previousValue, newValue, reason: extra?.reason, relatedRecordIds: extra?.related });
  }

  async list(options?: MockAsyncOptions): Promise<PromoView[]> {
    return this.run(options, () => this.store.promos.map((promo) => this.view(promo)));
  }

  /** Public projection of one promo, with no publication or date gate. Read-only. */
  private offer(promo: Promo): PublicPromoOffer {
    return projectPromoOffer(this.store, promo);
  }

  async publicOffers(options?: MockAsyncOptions): Promise<PublicPromoOffer[]> {
    return this.run(options, () => {
      return projectPublicOffers(this.store);
    });
  }

  async previewOffer(id: string, options?: MockAsyncOptions): Promise<PublicPromoOffer> {
    return this.run(options, () => this.offer(this.find(id)));
  }

  async create(input: PromoInput, options?: MockAsyncOptions): Promise<PromoView> {
    return this.run(options, (identity) => {
      this.require(identity, "promos.manage", MANAGE_DENIED);
      const fields = this.clean(input);
      const now = nowIso();
      const promo: Promo = { id: nextId(this.store, "promo", "promo"), ...fields, createdAt: now, updatedAt: now };
      this.store.promos.push(promo);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_CREATED, promo.id, null, `${promo.status}:${promo.name}`);
      return this.view(promo);
    });
  }

  async update(id: string, input: PromoInput, options?: MockAsyncOptions): Promise<PromoView> {
    return this.run(options, (identity) => {
      this.require(identity, "promos.manage", MANAGE_DENIED);
      const promo = this.find(id);
      if (promo.status === "ended") throw new Error("An ended promo cannot be edited.");
      const fields = this.clean(input, promo);
      if (this.hasEntries(id)) {
        const same = (a: string[], b: string[]) => a.length === b.length && a.every((value) => b.includes(value));
        if (fields.earnPesosPerPointCentavos !== promo.earnPesosPerPointCentavos || fields.startDate !== promo.startDate
          || fields.endDate !== promo.endDate || !same(fields.earnOutletIds, promo.earnOutletIds)) {
          throw new Error("Points were already earned, so the earning rule and dates cannot change. End the promo and create a new one.");
        }
        if (fields.status === "draft") throw new Error("A promo that has points cannot go back to draft.");
      }
      const previous = `${promo.status}:${promo.name}`;
      Object.assign(promo, fields, { updatedAt: nowIso() });
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_UPDATED, promo.id, previous, `${promo.status}:${promo.name}`);
      return this.view(promo);
    });
  }

  async end(id: string, options?: MockAsyncOptions): Promise<PromoView> {
    return this.run(options, (identity) => {
      this.require(identity, "promos.manage", MANAGE_DENIED);
      const promo = this.find(id);
      if (promo.status === "ended") throw new Error("This promo has already ended.");
      const previous = `${promo.status}:${promo.endDate}`;
      const now = today();
      promo.status = "ended";
      if (now < promo.endDate) promo.endDate = now < promo.startDate ? promo.startDate : now;
      promo.updatedAt = nowIso();
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_ENDED, promo.id, previous, `ended:${promo.endDate}`);
      return this.view(promo);
    });
  }

  async delete(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "promos.manage", MANAGE_DENIED);
      const promo = this.find(id);
      if (this.hasEntries(id)) throw new Error(`"${promo.name}" already has Promo Points activity. End it instead.`);
      this.store.promos.splice(this.store.promos.indexOf(promo), 1);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_DELETED, promo.id, `${promo.status}:${promo.name}`, null);
    });
  }

  async ledger(options?: MockAsyncOptions): Promise<PromoLedgerRow[]> {
    return this.run(options, (identity) => {
      const visible = new Set(this.visibleMemberships(identity).map((membership) => membership.id));
      return this.store.promoPoints.filter((entry) => visible.has(entry.membershipId)).map((entry) => this.row(entry)).reverse();
    });
  }

  async balances(options?: MockAsyncOptions): Promise<PromoMembershipBalance[]> {
    return this.run(options, (identity) => {
      const result: PromoMembershipBalance[] = [];
      for (const membership of this.promoMemberships(identity)) {
        const entries = this.store.promoPoints.filter((entry) => entry.membershipId === membership.id);
        if (entries.length === 0) continue;
        result.push({
          membershipId: membership.id,
          customerName: customerName(this.store, membership.customerId),
          vipNumber: membership.cardId ?? null,
          total: promoBalance(entries, today(), this.store.promos),
          byPromo: [...promoBalanceByPromo(entries, today(), this.store.promos)].map(([promoId, balance]) => ({
            promoId, promoName: this.store.promos.find((item) => item.id === promoId)?.name ?? "Unknown promo", balance,
          })),
        });
      }
      return result;
    });
  }

  async recordUse(input: RecordPromoUseInput, options?: MockAsyncOptions): Promise<PromoLedgerRow> {
    return this.run(options, (identity) => {
      this.require(identity, "promo-points.use", USE_DENIED);
      const membership = this.promoMemberships(identity).find((item) => item.id === input.membershipId);
      if (!membership || !membership.cardId) throw new Error("Select a membership with a VIP Number.");
      const promo = this.find(input.promoId);
      const note = input.note.trim();
      if (note.length > NOTE_MAX) throw new Error(`The note must be ${NOTE_MAX} characters or fewer.`);
      if (input.identityChecked !== true) throw new Error("Confirm you checked the cardholder's ID.");
      if (!input.requestId?.trim()) throw new Error("A request key is required.");
      const reward = input.rewardId
        ? promo.rewards.find((item) => item.id === input.rewardId && item.status === "active")
        : undefined;
      if (input.rewardId && !reward) throw new Error("This reward is not available.");
      const outletId = reward ? reward.outletId : (input.outletId ?? "");
      const points = reward ? reward.pointsCost : Number(input.points);
      const previous = this.store.promoPoints.find((entry) => entry.type === "use" && entry.actorId === identity.id && entry.requestId === input.requestId);
      if (previous) {
        if (previous.membershipId !== input.membershipId || previous.promoId !== input.promoId || previous.outletId !== outletId
          || previous.points !== points || (previous.note ?? "") !== note || previous.holder !== input.holder
          || previous.rewardId !== input.rewardId) {
          throw new Error("This request key was already used with different details.");
        }
        return this.row(previous);
      }
      requireCurrentScan(this.store, input.scannedCode, membership.id, input.holder);
      const holder = currentCardHolders(this.store, membership.id).find((item) => item.info.holder === input.holder);
      if (holder?.info.status !== "active") throw new Error("Select an active cardholder.");
      const entries = this.store.promoPoints.filter((entry) => entry.membershipId === membership.id);
      const available = promoBalance(entries, today(), this.store.promos, promo.id).available;
      const check = canUsePoints(available, points, promo, outletId, today());
      if (!check.ok) throw new Error(check.error);
      const entry: PromoPointsEntry = {
        id: nextId(this.store, "promoPoints", "pp"), promoId: promo.id, membershipId: membership.id, type: "use",
        points, outletId, note: note || undefined, date: today(), actorId: identity.id,
        requestId: input.requestId, holder: input.holder, identityChecked: true,
        rewardId: reward?.id, rewardName: reward?.name, rewardPointsCost: reward?.pointsCost,
      };
      this.store.promoPoints.push(entry);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_POINTS_USED, promo.id, String(available), String(available - points), { related: [membership.id, entry.id] });
      return this.row(entry);
    });
  }

  async voidUse(entryId: string, reason: string, options?: MockAsyncOptions): Promise<PromoLedgerRow> {
    return this.run(options, (identity) => {
      this.require(identity, "promo-points.use", USE_DENIED);
      const use = this.store.promoPoints.find((entry) => entry.id === entryId);
      const visible = this.visibleMemberships(identity).some((membership) => membership.id === use?.membershipId);
      if (!use || use.type !== "use" || !visible) throw new Error("Promo Points use not found.");
      if (isUseVoided(this.store.promoPoints, use.id)) throw new Error("This use was already voided.");
      const text = reason.trim();
      if (!text) throw new Error("Enter a reason for the void.");
      const entry: PromoPointsEntry = {
        id: nextId(this.store, "promoPoints", "pp"), promoId: use.promoId, membershipId: use.membershipId, type: "use_void",
        points: use.points, outletId: use.outletId, note: text, date: today(), actorId: identity.id, voidsEntryId: use.id,
      };
      this.store.promoPoints.push(entry);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.PROMO_POINTS_USE_VOIDED, use.promoId, "use", "use_void", { reason: text, related: [use.membershipId, use.id, entry.id] });
      return this.row(entry);
    });
  }
}
