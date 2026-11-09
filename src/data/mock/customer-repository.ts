import { CustomerValidationError, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { composeCustomerName, restrictCustomer, validateCustomerForSubmit } from "@/modules/customers/rules";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import type { DevIdentity } from "@/modules/identity/types";
import { BusinessRepository, today } from "./business-base";
import type { MockStore } from "./seed";
import { getVisibleCustomerIds, getVisibleMemberIds, isActiveIdentity, activeIdentityRoles } from "./scope";

const BROAD = new Set(["super_admin", "admin"]);

const COPY_KEYS = [
  "customerNumber", "firstName", "middleName", "lastName", "suffix", "gender", "civilStatus", "dateOfBirth", "mobileNumber",
  "email", "address", "governmentIdType", "governmentIdNumber", "vipPlan", "paymentSchemeId", "contractClassification",
  "recommenderMemberId", "acquisitionChannel", "consentDataPrivacy", "idReceivedCertified",
] as const;

export class MockCustomerRepository extends BusinessRepository implements CustomerRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  /** Full records for the owner and Admin; restricted projections for downline views (04 section 11). */
  private visible(identity: DevIdentity): Customer[] {
    if (!isActiveIdentity(identity)) return [];
    const members = getVisibleMemberIds(identity, this.store);
    const ids = getVisibleCustomerIds(identity, this.store, members);
    const broad = activeIdentityRoles(identity).some((role) => BROAD.has(role));
    return this.store.customers
      .filter((customer) => ids.has(customer.id))
      .map((customer) => (broad || customer.ownerMemberId === identity.memberId ? this.copy(customer) : restrictCustomer(customer)));
  }

  private copy(customer: Customer): Customer {
    return JSON.parse(JSON.stringify(customer)) as Customer;
  }

  private canManage(identity: DevIdentity): boolean {
    return this.can(identity, "customers.manage");
  }

  private ownRecord(identity: DevIdentity, id: string): Customer {
    const customer = this.store.customers.find((item) => item.id === id);
    if (!customer) throw new Error("Customer not found.");
    const broad = activeIdentityRoles(identity).some((role) => BROAD.has(role));
    if (!broad && customer.ownerMemberId !== identity.memberId) throw new Error("Customer not visible to this identity.");
    return customer;
  }

  private assertReferences(input: CustomerDraftInput) {
    if (input.recommenderMemberId) {
      const member = this.store.members.find((item) => item.id === input.recommenderMemberId);
      if (!member || member.designation !== "OST") throw new Error("The recommender must be an OST member.");
    }
    if (input.vipPlan && !this.store.products.some((item) => item.code === input.vipPlan && item.status === "active")) {
      throw new Error("The selected VIP plan is not available.");
    }
    if (input.paymentSchemeId && !this.store.paymentSchemes.some((item) => item.id === input.paymentSchemeId)) {
      throw new Error("The selected payment scheme does not exist.");
    }
  }

  private apply(customer: Customer, input: CustomerDraftInput) {
    const target = customer as unknown as Record<string, unknown>;
    for (const key of COPY_KEYS) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) target[key] = value;
    }
    const composed = composeCustomerName(customer);
    customer.displayName = composed || input.displayName.trim() || customer.displayName;
  }

  async list(options?: MockAsyncOptions): Promise<Customer[]> {
    return this.run(options, (identity) => this.visible(identity));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<Customer | null> {
    return this.run(options, (identity) => this.visible(identity).find((customer) => customer.id === id) ?? null);
  }

  async createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer draft creation is not allowed for this identity.");
      const displayName = (composeCustomerName(input) || input.displayName).trim();
      if (!displayName) throw new Error("Customer display name is required.");
      this.assertReferences(input);
      const ownerFromInput = !identity.memberId && input.ownerMemberId ? this.store.members.find((m) => m.id === input.ownerMemberId) : undefined;
      const ownerMemberId = identity.memberId ?? ownerFromInput?.id ?? null;
      const owner = this.store.members.find((member) => member.id === ownerMemberId);
      const customer: Customer = {
        id: `cust-draft-${this.store.customerSequence}`,
        displayName,
        branchId: input.branchId ?? owner?.branchId ?? identity.branchId ?? "branch-a",
        ownerMemberId,
        status: "draft",
        createdAt: today(),
        submittedAt: null,
      };
      this.store.customerSequence += 1;
      this.apply(customer, input);
      this.store.customers.push(customer);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer", entityId: customer.id, newValue: "draft" });
      return this.copy(customer);
    });
  }

  async updateDraft(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer draft update is not allowed for this identity.");
      const customer = this.ownRecord(identity, id);
      if (customer.status !== "draft") throw new Error("Only draft customers can be updated.");
      if (!(composeCustomerName(input) || input.displayName).trim()) throw new Error("Customer display name is required.");
      this.assertReferences(input);
      this.apply(customer, input);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_UPDATED, entityType: "customer", entityId: customer.id, newValue: "draft" });
      return this.copy(customer);
    });
  }

  async discardDraft(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer draft discard is not allowed for this identity.");
      const customer = this.ownRecord(identity, id);
      if (customer.status !== "draft") throw new Error("Only draft customers can be discarded.");
      this.store.customers.splice(this.store.customers.indexOf(customer), 1);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_DISCARDED, entityType: "customer", entityId: id, previousValue: "draft" });
    });
  }

  async submit(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer submission is not allowed for this identity.");
      const customer = this.ownRecord(identity, id);
      if (customer.status !== "draft") throw new Error("Only draft customers can be submitted.");
      const merged = { ...this.copy(customer), ...input, displayName: input.displayName || customer.displayName } as CustomerDraftInput;
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id);
      if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
      this.assertReferences(merged);
      this.apply(customer, input);
      customer.status = "submitted";
      customer.submittedAt = today();
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_SUBMITTED, entityType: "customer", entityId: customer.id, previousValue: "draft", newValue: "submitted" });
      return this.copy(customer);
    });
  }

  async correct(id: string, input: CustomerDraftInput, reason: string, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer correction is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required for a data correction.");
      const customer = this.ownRecord(identity, id);
      if (customer.status === "draft") throw new Error("Draft customers are edited directly.");
      const merged = { ...this.copy(customer), ...input, displayName: input.displayName || customer.displayName } as CustomerDraftInput;
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id);
      if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
      this.assertReferences(merged);
      const previousNumber = customer.customerNumber ?? null;
      this.apply(customer, input);
      // A change to the official Customer ID keeps its previous and new value; other corrected fields stay out of the audit payload.
      const nextNumber = customer.customerNumber ?? null;
      const numberChange = nextNumber !== previousNumber
        ? { previousValue: `customerNumber:${previousNumber ?? "none"}`, newValue: `customerNumber:${nextNumber ?? "none"}` }
        : { newValue: customer.status };
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_CORRECTED, entityType: "customer", entityId: customer.id, ...numberChange, reason: reason.trim() });
      return this.copy(customer);
    });
  }
}
