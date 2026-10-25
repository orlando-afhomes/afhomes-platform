import type { CustomerRepository } from "@/data/contracts/customer-repository";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { MockStore } from "./seed";
import { canManageCustomers, getVisibleCustomerIds, getVisibleMemberIds, isActiveIdentity } from "./scope";
import { simulateAsync } from "@/data/contracts/async-options";

export class MockCustomerRepository implements CustomerRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private mergeOptions(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  async list(options?: MockAsyncOptions): Promise<Customer[]> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    const visibleMembers = getVisibleMemberIds(identity, this.store);
    const visibleCustomers = getVisibleCustomerIds(identity, this.store, visibleMembers);
    return this.store.customers.filter((customer) => visibleCustomers.has(customer.id)).map((customer) => ({ ...customer }));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<Customer | null> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const visible = await this.list(merged);
    return visible.find((customer) => customer.id === id) ?? null;
  }

  async createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity) || !canManageCustomers(identity)) {
      throw new Error("Customer draft creation is not allowed for this identity.");
    }
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Customer display name is required.");
    const branchId = input.branchId ?? identity.branchId ?? "branch-a";
    const customer: Customer = {
      id: `cust-draft-${this.store.customerSequence}`,
      displayName,
      branchId,
      ownerMemberId: identity.memberId,
      status: "draft",
    };
    this.store.customerSequence += 1;
    this.store.customers.push(customer);
    return { ...customer };
  }

  async updateDraft(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity) || !canManageCustomers(identity)) {
      throw new Error("Customer draft update is not allowed for this identity.");
    }
    const customer = this.store.customers.find((item) => item.id === id);
    if (!customer) throw new Error("Customer not found.");
    if (customer.status !== "draft") throw new Error("Only draft customers can be updated.");
    const visible = await this.list(merged);
    if (!visible.some((item) => item.id === id)) throw new Error("Customer not visible to this identity.");
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Customer display name is required.");
    customer.displayName = displayName;
    if (input.branchId) customer.branchId = input.branchId;
    return { ...customer };
  }

  async discardDraft(id: string, options?: MockAsyncOptions): Promise<void> {
    const merged = this.mergeOptions(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity) || !canManageCustomers(identity)) {
      throw new Error("Customer draft discard is not allowed for this identity.");
    }
    const index = this.store.customers.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("Customer not found.");
    if (this.store.customers[index].status !== "draft") {
      throw new Error("Only draft customers can be discarded.");
    }
    const visible = await this.list(merged);
    if (!visible.some((item) => item.id === id)) throw new Error("Customer not visible to this identity.");
    this.store.customers.splice(index, 1);
  }
}
