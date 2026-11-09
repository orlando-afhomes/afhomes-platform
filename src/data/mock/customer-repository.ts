import { CustomerValidationError, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { buildImportRows, MAX_EXPORT_ROWS, MAX_IMPORT_ROWS, type CustomerImportJob, type CustomerImportRecord } from "@/modules/customers/import";
import { composeCustomerName, restrictCustomer, validateCustomerForSubmit } from "@/modules/customers/rules";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";
import type { DevIdentity } from "@/modules/identity/types";
import { BusinessRepository, nowIso, today } from "./business-base";
import { nextId, randomNumericId } from "./ids";
import type { MockStore } from "./seed";
import { BROAD_ROLES, getVisibleCustomerIds, getVisibleMemberIds, isActiveIdentity, activeIdentityRoles } from "./scope";


const COPY_KEYS = [
  "customerNumber", "firstName", "middleName", "lastName", "suffix", "gender", "civilStatus", "dateOfBirth", "mobileNumber",
  "email", "address", "governmentIdType", "governmentIdNumber", "vipPlan", "supplementaryHolder", "paymentSchemeId", "contractClassification",
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
    const broad = activeIdentityRoles(identity).some((role) => BROAD_ROLES.has(role));
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
    const broad = activeIdentityRoles(identity).some((role) => BROAD_ROLES.has(role));
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
    if (input.supplementaryHolder && !this.supplementaryAllowed(input.vipPlan)) {
      throw new Error("The selected VIP plan does not allow a supplementary holder.");
    }
  }

  /** Whether the chosen VIP product permits a supplementary cardholder (Gold). */
  private supplementaryAllowed(plan: CustomerDraftInput["vipPlan"]): boolean {
    return (this.store.products.find((item) => item.code === plan)?.supplementaryHolders ?? 0) > 0;
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
      const customer = this.newDraft(identity, input);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer", entityId: customer.id, newValue: "draft" });
      return this.copy(customer);
    });
  }

  private newDraft(identity: DevIdentity, input: CustomerDraftInput): Customer {
    const displayName = (composeCustomerName(input) || input.displayName).trim();
    if (!displayName) throw new Error("Customer display name is required.");
    this.assertReferences(input);
    const ownerFromInput = !identity.memberId && input.ownerMemberId ? this.store.members.find((m) => m.id === input.ownerMemberId) : undefined;
    const ownerMemberId = identity.memberId ?? ownerFromInput?.id ?? null;
    const owner = this.store.members.find((member) => member.id === ownerMemberId);
    const customer: Customer = {
      // Internal id: secure random, numeric only, no pattern (owner ruling 2026-11-09); it carries over to the database.
      id: randomNumericId(new Set(this.store.customers.map((item) => item.id))),
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
    return customer;
  }

  /**
   * Confirms an import. Re-validates every record against the live store (the
   * preview is never trusted) and creates drafts for "ready" rows only.
   */
  async importCustomers(input: { fileName: string; records: CustomerImportRecord[]; declaration: boolean }, options?: MockAsyncOptions): Promise<CustomerImportJob> {
    return this.run(options, (identity) => {
      this.require(identity, "customers.import", "Customer import is not allowed for this identity.");
      if (!input.declaration) throw new Error("Confirm that the rows come from official company records.");
      if (input.records.length === 0) throw new Error("The file has no rows to import.");
      if (input.records.length > MAX_IMPORT_ROWS) throw new Error(`A file may contain at most ${MAX_IMPORT_ROWS} rows.`);
      const rows = buildImportRows(input.records, { existing: this.store.customers, products: this.store.products, schemes: this.store.paymentSchemes });
      const job: CustomerImportJob = {
        id: nextId(this.store, "customerImport", "imp"),
        fileName: input.fileName.trim().slice(0, 200) || "upload",
        createdAt: nowIso(),
        actorId: identity.id,
        totalRows: rows.length,
        createdCount: 0,
        needsReviewCount: rows.filter((row) => row.status === "needs_review").length,
        invalidCount: rows.filter((row) => row.status === "invalid").length,
        createdCustomerIds: [],
      };
      for (const row of rows.filter((item) => item.status === "ready")) {
        const customer = this.newDraft(identity, row.input);
        job.createdCustomerIds.push(customer.id);
        this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer", entityId: customer.id, newValue: "draft", reason: `Imported in ${job.id}` });
      }
      job.createdCount = job.createdCustomerIds.length;
      this.store.customerImportJobs.push(job);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_IMPORT_COMPLETED, entityType: "customer-import", entityId: job.id, newValue: `created:${job.createdCount}/review:${job.needsReviewCount}/invalid:${job.invalidCount}`, relatedRecordIds: job.createdCustomerIds });
      return JSON.parse(JSON.stringify(job)) as CustomerImportJob;
    });
  }

  async listImportJobs(options?: MockAsyncOptions): Promise<CustomerImportJob[]> {
    return this.run(options, (identity) => {
      if (!this.can(identity, "customers.import")) return [];
      return JSON.parse(JSON.stringify([...this.store.customerImportJobs].reverse())) as CustomerImportJob[];
    });
  }

  /** Full records for export, audited with the row count only (doc 12: no personal data in the audit payload). */
  async exportCustomers(input: { format: "xlsx" | "csv"; count: number }, options?: MockAsyncOptions): Promise<Customer[]> {
    return this.run(options, (identity) => {
      this.require(identity, "customers.import", "Customer export is not allowed for this identity.");
      const records = this.visible(identity).filter((customer) => !customer.restricted).slice(0, MAX_EXPORT_ROWS);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMERS_EXPORTED, entityType: "customer-export", entityId: input.format, newValue: `rows:${Math.min(input.count, records.length)}` });
      return records;
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
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id, this.supplementaryAllowed(merged.vipPlan));
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
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id, this.supplementaryAllowed(merged.vipPlan));
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
