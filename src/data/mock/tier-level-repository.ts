import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { TierLevelInput, TierLevelRepository, TierLevelView } from "@/data/contracts/tier-level-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { productsInLevel, TIER_COLOR_OPTIONS, tierLevelNameError } from "@/modules/vip/tier-levels";
import type { TierLevel } from "@/modules/vip/types";
import { BusinessRepository } from "./business-base";
import type { MockStore } from "./seed";

const DENIED = "Managing VIP tier levels is not allowed for this identity.";

export class MockTierLevelRepository extends BusinessRepository implements TierLevelRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(level: TierLevel): TierLevelView {
    const productCount = productsInLevel(this.store.products, level.id);
    return { ...level, productCount, inUse: productCount > 0 };
  }

  private find(id: string): TierLevel {
    const level = this.store.tierLevels.find((item) => item.id === id);
    if (!level) throw new Error("Tier level not found.");
    return level;
  }

  private cleanName(raw: string, ignoreId?: string): string {
    const problem = tierLevelNameError(raw, this.store.tierLevels.filter((item) => item.id !== ignoreId));
    if (problem) throw new Error(problem);
    return raw.trim().replace(/\s+/g, " ");
  }

  private record(identity: DevIdentity, action: string, level: TierLevel, previousValue: string | null, newValue: string | null) {
    this.audit(identity, { module: "vip-products", action, entityType: "tier-level", entityId: level.id, previousValue, newValue });
  }

  async list(options?: MockAsyncOptions): Promise<TierLevelView[]> {
    return this.run(options, () => [...this.store.tierLevels].sort((a, b) => a.sortOrder - b.sortOrder).map((level) => this.view(level)));
  }

  async create(input: TierLevelInput, options?: MockAsyncOptions): Promise<TierLevelView> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", DENIED);
      const name = this.cleanName(input.name);
      if (!TIER_COLOR_OPTIONS.some((item) => item.value === input.colorKey)) throw new Error("Choose a color.");
      const sortOrder = input.sortOrder ?? Math.max(0, ...this.store.tierLevels.map((item) => item.sortOrder)) + 1;
      if (!Number.isInteger(sortOrder) || sortOrder < 1) throw new Error("The sort order must be a whole number from 1.");
      const sequence = (this.store.counters.tierLevel ?? 100) + 1;
      this.store.counters.tierLevel = sequence;
      const level: TierLevel = { id: `tier-level-${sequence}`, name, colorKey: input.colorKey, sortOrder, status: "active" };
      this.store.tierLevels.push(level);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_CREATED, level, null, name);
      return this.view(level);
    });
  }

  async update(id: string, input: Partial<TierLevelInput> & { status?: TierLevel["status"] }, options?: MockAsyncOptions): Promise<TierLevelView> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", DENIED);
      const level = this.find(id);
      if (input.status !== undefined && input.status !== "active" && input.status !== "inactive") throw new Error("The status must be active or inactive.");
      if (input.colorKey !== undefined && !TIER_COLOR_OPTIONS.some((item) => item.value === input.colorKey)) throw new Error("Choose a color.");
      if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 1)) throw new Error("The sort order must be a whole number from 1.");
      const name = input.name === undefined ? level.name : this.cleanName(input.name, id);
      const before = `${level.name}, ${level.colorKey}, order ${level.sortOrder}`;
      const status = input.status ?? level.status;
      const detailsChanged = name !== level.name || (input.colorKey ?? level.colorKey) !== level.colorKey || (input.sortOrder ?? level.sortOrder) !== level.sortOrder;
      if (detailsChanged) {
        Object.assign(level, { name, colorKey: input.colorKey ?? level.colorKey, sortOrder: input.sortOrder ?? level.sortOrder });
        this.record(identity, BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_UPDATED, level, before, `${level.name}, ${level.colorKey}, order ${level.sortOrder}`);
      }
      if (status !== level.status) {
        level.status = status;
        this.record(identity, status === "inactive" ? BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_DEACTIVATED : BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_REACTIVATED, level, level.name, status);
      }
      return this.view(level);
    });
  }

  async deactivate(id: string, options?: MockAsyncOptions): Promise<TierLevelView> {
    return this.update(id, { status: "inactive" }, options);
  }

  async delete(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", DENIED);
      const level = this.find(id);
      const count = productsInLevel(this.store.products, id);
      if (count > 0) throw new Error(`"${level.name}" is used by ${count} product${count === 1 ? "" : "s"}. Deactivate it instead.`);
      this.store.tierLevels.splice(this.store.tierLevels.indexOf(level), 1);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_DELETED, level, level.name, null);
    });
  }
}
