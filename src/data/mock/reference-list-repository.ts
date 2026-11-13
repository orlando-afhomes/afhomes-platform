import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReferenceEntryView, ReferenceListRepository } from "@/data/contracts/reference-list-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { REFERENCE_LISTS, slugify, type ListEntryStatus, type ReferenceEntry, type ReferenceListId } from "@/modules/settings/lists";
import { BusinessRepository } from "./business-base";
import type { MockStore } from "./seed";

const LABEL_MAX = 80;
const DENIED = "Managing the lists is not allowed for this identity.";

/** True when any record under `root` holds `value` in one of the named fields. */
export function holdsValue(root: unknown, fields: ReadonlySet<string>, value: string): boolean {
  if (Array.isArray(root)) return root.some((item) => holdsValue(item, fields, value));
  if (root === null || typeof root !== "object") return false;
  return Object.entries(root).some(([key, item]) => (fields.has(key) && item === value) || holdsValue(item, fields, value));
}

const USAGE_FIELDS: Record<ReferenceListId, ReadonlySet<string>> = {
  "program-category": new Set(["programCategory"]),
  "gov-id-type": new Set(["governmentIdType"]),
  bank: new Set(["bankId"]),
};

/** Banks are stored on payments by entry id; the other lists store the stable value. */
function usedBy(store: MockStore, entry: ReferenceEntry): boolean {
  const key = entry.list === "bank" ? entry.id : entry.value;
  const scope = entry.list === "bank"
    ? store.payments
    : [store.members, store.customers, store.staff, store.registrationApplications];
  return holdsValue(scope, USAGE_FIELDS[entry.list], key);
}

export class MockReferenceListRepository extends BusinessRepository implements ReferenceListRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(entry: ReferenceEntry): ReferenceEntryView {
    return { ...entry, inUse: usedBy(this.store, entry) };
  }

  private find(id: string): ReferenceEntry {
    const entry = this.store.referenceEntries.find((item) => item.id === id);
    if (!entry) throw new Error("List entry not found.");
    return entry;
  }

  private cleanLabel(raw: string, list: ReferenceListId, ignoreId?: string): string {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) throw new Error("A name is required.");
    if (label.length > LABEL_MAX) throw new Error(`The name must be ${LABEL_MAX} characters or fewer.`);
    if (this.store.referenceEntries.some((item) => item.list === list && item.id !== ignoreId && item.label.toLowerCase() === label.toLowerCase())) {
      throw new Error("This name is already in the list.");
    }
    return label;
  }

  private record(identity: DevIdentity, action: string, entry: ReferenceEntry, previousValue: string | null, newValue: string | null) {
    this.audit(identity, { module: "organization", action, entityType: "reference-entry", entityId: entry.id, previousValue, newValue, relatedRecordIds: [entry.list] });
  }

  async list(options?: MockAsyncOptions): Promise<ReferenceEntryView[]> {
    return this.run(options, () => this.store.referenceEntries.map((entry) => this.view(entry)));
  }

  async create(input: { list: ReferenceListId; label: string }, options?: MockAsyncOptions): Promise<ReferenceEntryView> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      if (!REFERENCE_LISTS.some((item) => item.id === input.list)) throw new Error("Unknown list.");
      const label = this.cleanLabel(input.label, input.list);
      // Government ID types are stored as their plain label (as before); the other lists use a slug.
      const value = input.list === "gov-id-type" ? label : slugify(label);
      if (!value) throw new Error("The name must contain letters or numbers.");
      if (this.store.referenceEntries.some((item) => item.list === input.list && item.value.toLowerCase() === value.toLowerCase())) throw new Error("This name is already in the list.");
      const sequence = (this.store.counters.referenceEntry ?? 100) + 1;
      this.store.counters.referenceEntry = sequence;
      const sortOrder = Math.max(0, ...this.store.referenceEntries.filter((item) => item.list === input.list).map((item) => item.sortOrder)) + 1;
      const entry: ReferenceEntry = { id: `ref-${sequence}`, list: input.list, value, label, status: "active", sortOrder };
      this.store.referenceEntries.push(entry);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.REFERENCE_ENTRY_CREATED, entry, null, `${entry.list}:${entry.value}`);
      return this.view(entry);
    });
  }

  async update(id: string, input: { label?: string; status?: ListEntryStatus }, options?: MockAsyncOptions): Promise<ReferenceEntryView> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      const entry = this.find(id);
      if (input.status !== undefined && input.status !== "active" && input.status !== "inactive") throw new Error("The status must be active or inactive.");
      const label = input.label === undefined ? entry.label : this.cleanLabel(input.label, entry.list, id);
      const status = input.status ?? entry.status;
      if (label !== entry.label) {
        this.record(identity, BUSINESS_AUDIT_ACTIONS.REFERENCE_ENTRY_UPDATED, entry, `label:${entry.label}`, `label:${label}`);
        entry.label = label;
      }
      if (status !== entry.status) {
        this.record(identity, BUSINESS_AUDIT_ACTIONS.REFERENCE_ENTRY_UPDATED, entry, `status:${entry.status}`, `status:${status}`);
        entry.status = status;
      }
      return this.view(entry);
    });
  }

  async deactivate(id: string, options?: MockAsyncOptions): Promise<ReferenceEntryView> {
    return this.update(id, { status: "inactive" }, options);
  }

  async delete(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "settings.lists.manage", DENIED);
      const entry = this.find(id);
      if (usedBy(this.store, entry)) throw new Error(`"${entry.label}" is used by existing records. Deactivate it instead.`);
      this.store.referenceEntries.splice(this.store.referenceEntries.indexOf(entry), 1);
      this.record(identity, BUSINESS_AUDIT_ACTIONS.REFERENCE_ENTRY_DELETED, entry, `${entry.list}:${entry.value}`, null);
    });
  }
}
