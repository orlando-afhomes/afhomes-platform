import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { OutletRepository, OutletView } from "@/data/contracts/outlet-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { OUTLET_TYPES, type ListEntryStatus, type Outlet, type OutletType } from "@/modules/settings/lists";
import { BusinessRepository } from "./business-base";
import { holdsValue } from "./reference-list-repository";
import type { MockStore } from "./seed";

const NAME_MAX = 80;
const DENIED = "Managing outlets is not allowed for this identity.";
const OUTLET_FIELDS: ReadonlySet<string> = new Set(["venueId", "outletId"]);

/**
 * An outlet is used once a resort bill, booking or points table row refers to it.
 * Extend this when another record starts storing `outletId` (for example Promo Points).
 */
export function outletInUse(store: MockStore, id: string): boolean {
  return holdsValue([store.resortSpends, store.redemption.bookings, store.redemption.tableVersions, store.promoPoints], OUTLET_FIELDS, id)
    || store.promos.some((promo) => promo.earnOutletIds.includes(id) || promo.redeemOutletIds.includes(id));
}

export class MockOutletRepository extends BusinessRepository implements OutletRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(outlet: Outlet): OutletView {
    return { ...outlet, inUse: outletInUse(this.store, outlet.id) };
  }

  private find(id: string): Outlet {
    const outlet = this.store.outlets.find((item) => item.id === id);
    if (!outlet) throw new Error("Outlet not found.");
    return outlet;
  }

  private cleanName(raw: string, ignoreId?: string): string {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name) throw new Error("A name is required.");
    if (name.length > NAME_MAX) throw new Error(`The name must be ${NAME_MAX} characters or fewer.`);
    if (this.store.outlets.some((item) => item.id !== ignoreId && item.name.toLowerCase() === name.toLowerCase())) throw new Error("An outlet with this name already exists.");
    return name;
  }

  private checkType(type: OutletType) {
    if (!OUTLET_TYPES.some((item) => item.value === type)) throw new Error("Select an outlet type.");
  }

  private record(identity: DevIdentity, action: string, outlet: Outlet, previousValue: string | null, newValue: string | null) {
    this.audit(identity, { module: "organization", action, entityType: "outlet", entityId: outlet.id, previousValue, newValue });
  }

  async list(options?: MockAsyncOptions): Promise<OutletView[]> {
    return this.run(options, () => this.store.outlets.map((outlet) => this.view(outlet)));
  }

  async create(input: { name: string; type: OutletType }, options?: MockAsyncOptions): Promise<OutletView> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      this.checkType(input.type);
      const name = this.cleanName(input.name);
      const sequence = (this.store.counters.outlet ?? 100) + 1;
      this.store.counters.outlet = sequence;
      const outlet: Outlet = { id: `outlet-${sequence}`, name, type: input.type, status: "active", sample: false };
      this.store.outlets.push(outlet);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.OUTLET_CREATED, outlet, null, `${outlet.type}:${outlet.status}`);
      return this.view(outlet);
    });
  }

  async update(id: string, input: { name?: string; type?: OutletType; status?: ListEntryStatus }, options?: MockAsyncOptions): Promise<OutletView> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      const outlet = this.find(id);
      if (input.type !== undefined) this.checkType(input.type);
      if (input.status !== undefined && input.status !== "active" && input.status !== "inactive") throw new Error("The status must be active or inactive.");
      const name = input.name === undefined ? outlet.name : this.cleanName(input.name, id);
      const type = input.type ?? outlet.type;
      const status = input.status ?? outlet.status;
      const changes: Array<[string, string, string]> = [];
      if (name !== outlet.name) changes.push(["name", outlet.name, name]);
      if (type !== outlet.type) changes.push(["type", outlet.type, type]);
      if (status !== outlet.status) changes.push(["status", outlet.status, status]);
      Object.assign(outlet, { name, type, status });
      for (const [field, before, after] of changes) this.record(identity, BUSINESS_AUDIT_ACTIONS.OUTLET_UPDATED, outlet, `${field}:${before}`, `${field}:${after}`);
      return this.view(outlet);
    });
  }

  async deactivate(id: string, options?: MockAsyncOptions): Promise<OutletView> {
    return this.update(id, { status: "inactive" }, options);
  }

  async delete(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      const outlet = this.find(id);
      if (outletInUse(this.store, id)) throw new Error(`"${outlet.name}" is used by existing records. Deactivate it instead.`);
      this.store.outlets.splice(this.store.outlets.indexOf(outlet), 1);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.OUTLET_DELETED, outlet, `${outlet.type}:${outlet.status}`, null);
    });
  }
}
