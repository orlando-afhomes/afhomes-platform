import { CustomerValidationError, type CustomerRepository } from "@/data/contracts/customer-repository";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { customerAttributionErrors, pendingAttributionMemberIds } from "@/modules/customers/attribution";
import { approvalErrors, canReviewRegistration, isEditableRegistration } from "@/modules/customers/review";
import { buildImportRows, MAX_EXPORT_ROWS, MAX_IMPORT_ROWS, type CustomerImportJob, type CustomerImportRecord } from "@/modules/customers/import";
import { currentManilaYear, nextCustomerId } from "@/modules/customers/customer-number";
import { composeCustomerName, restrictCustomer, validateCustomerForSubmit } from "@/modules/customers/rules";
import type { Customer, CustomerDraftInput, CustomerStatus } from "@/modules/customers/types";
import type { DevIdentity } from "@/modules/identity/types";
import { BusinessRepository, nowIso, today } from "./business-base";
import { nextId, randomNumericId } from "./ids";
import type { MockStore } from "./seed";
import { BROAD_ROLES, getVisibleCustomerIds, getVisibleMemberIds, isActiveIdentity, activeIdentityRoles } from "./scope";


const COPY_KEYS = [
  "customerNumber", "firstName", "middleName", "lastName", "suffix", "gender", "civilStatus", "dateOfBirth", "mobileNumber",
  "email", "address", "governmentIdType", "governmentIdNumber", "vipPlan", "supplementaryHolder", "paymentSchemeId", "contractClassification",
  "recommenderMemberId", "referralReference", "acquisitionChannel", "consentDataPrivacy", "idReceivedCertified",
] as const;
const DRAFT_COPY_KEYS = [
  ...COPY_KEYS, "referrerMemberId", "customerIdMode", "noMiddleName", "citizenship", "landline", "tinNumber",
  "occupation", "businessIndustry", "employedPosition", "officeAddress",
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

  /** Records one registration step on the record (04 section 16); the caller writes the audit event. */
  private step(customer: Customer, identity: DevIdentity, status: CustomerStatus, reason: string | null = null) {
    (customer.statusHistory ??= []).push({ status, at: nowIso(), actorId: identity.id, ...(reason ? { reason } : {}) });
  }

  /**
   * The closing seller is `ownerMemberId` (04 section 7.8, R5). A seller draft is always owned by that seller;
   * office users may name or change the closing seller until the registration is approved.
   */
  private assignClosingSeller(identity: DevIdentity, customer: Customer, input: CustomerDraftInput) {
    if (!this.canManage(identity) || !input.ownerMemberId || input.ownerMemberId === customer.ownerMemberId) return;
    if (!isEditableRegistration(customer.status) && customer.status !== "submitted") return;
    if (!this.store.members.some((member) => member.id === input.ownerMemberId)) throw new CustomerValidationError({ ownerMemberId: "Choose a seller from the Sales Network." });
    customer.ownerMemberId = input.ownerMemberId;
  }

  private ownRecord(identity: DevIdentity, id: string): Customer {
    const customer = this.store.customers.find((item) => item.id === id);
    if (!customer) throw new Error("Customer not found.");
    const broad = activeIdentityRoles(identity).some((role) => BROAD_ROLES.has(role));
    if (!broad && customer.ownerMemberId !== identity.memberId) throw new Error("Customer not visible to this identity.");
    return customer;
  }

  private assertReferences(input: CustomerDraftInput) {
    if (input.recommenderMemberId && !this.store.members.some((item) => item.id === input.recommenderMemberId)) {
      throw new Error("The referrer must be a Sales Network seller.");
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

  private assertRegistrationAttribution(identity: DevIdentity, input: CustomerDraftInput) {
    if (!input.recommenderMemberId && !input.referrerMemberId) return;
    const visibleIds = getVisibleMemberIds(identity, this.store);
    const unavailable: CustomerValidationError["errors"] = {};
    for (const field of ["recommenderMemberId", "referrerMemberId"] as const) {
      const id = input[field];
      if (id && (!visibleIds.has(id) || !this.store.members.some((member) => member.id === id))) {
        unavailable[field] = "Choose a seller available to your account.";
      }
    }
    if (Object.keys(unavailable).length > 0) throw new CustomerValidationError(unavailable);
    const errors = customerAttributionErrors(input, pendingAttributionMemberIds(this.store.accreditations));
    if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
  }

  /** Whether the chosen VIP product permits a supplementary cardholder (Gold). */
  private supplementaryAllowed(plan: CustomerDraftInput["vipPlan"]): boolean {
    return (this.store.products.find((item) => item.code === plan)?.supplementaryHolders ?? 0) > 0;
  }

  private apply(customer: Customer, input: CustomerDraftInput) {
    const target = customer as unknown as Record<string, unknown>;
    const keys = isEditableRegistration(customer.status) ? DRAFT_COPY_KEYS : COPY_KEYS;
    for (const key of keys) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) target[key] = value;
    }
    const composed = composeCustomerName(customer);
    const clearsDraftName = customer.status === "draft" && (input.firstName !== undefined || input.lastName !== undefined);
    customer.displayName = composed || input.displayName.trim() || (clearsDraftName ? "" : customer.displayName);
  }

  async list(options?: MockAsyncOptions): Promise<Customer[]> {
    return this.run(options, (identity) => this.visible(identity));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<Customer | null> {
    return this.run(options, (identity) => this.visible(identity).find((customer) => customer.id === id) ?? null);
  }

  async createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.can(identity, "customers.draft")) throw new Error("Customer draft creation is not allowed for this identity.");
      this.assertRegistrationAttribution(identity, input);
      const customer = this.newDraft(identity, input);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_CREATED, entityType: "customer", entityId: customer.id, newValue: "draft" });
      return this.copy(customer);
    });
  }

  private newDraft(identity: DevIdentity, input: CustomerDraftInput): Customer {
    const displayName = (composeCustomerName(input) || input.displayName).trim();
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
      // A seller holds only customers.draft: their own draft (ownRecord), never a sent-back or submitted record.
      if (!this.can(identity, "customers.draft")) throw new Error("Customer draft update is not allowed for this identity.");
      const customer = this.ownRecord(identity, id);
      const editable = customer.status === "draft" || (customer.status === "sent_back" && this.canManage(identity));
      if (!editable) throw new Error("Only draft customers can be updated.");
      this.assertRegistrationAttribution(identity, input);
      this.assertReferences(input);
      this.assignClosingSeller(identity, customer, input);
      this.apply(customer, input);
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_DRAFT_UPDATED, entityType: "customer", entityId: customer.id, newValue: "draft" });
      return this.copy(customer);
    });
  }

  async discardDraft(id: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      if (!this.can(identity, "customers.draft")) throw new Error("Customer draft discard is not allowed for this identity.");
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
      if (!isEditableRegistration(customer.status)) throw new Error("Only draft or sent-back customers can be submitted.");
      const merged: CustomerDraftInput = {
        ...this.copy(customer),
        ...input,
        displayName: input.displayName || customer.displayName,
        customerIdMode: input.customerIdMode ?? customer.customerIdMode,
        recommenderMemberId: input.recommenderMemberId === undefined ? customer.recommenderMemberId : input.recommenderMemberId,
        referrerMemberId: input.referrerMemberId === undefined ? customer.referrerMemberId : input.referrerMemberId,
      };
      // 04 section 7.7: only Submit consumes the official Customer ID sequence; drafts never do.
      // Automatic (or the legacy/import blank request) generates the next id, and the
      // assignment is part of the audited submission change.
      const customerIdMode = merged.customerIdMode;
      const requestedNumber = typeof merged.customerNumber === "string" ? merged.customerNumber.trim() : "";
      const assignsNumber = !customer.customerNumber && (customerIdMode === "auto" || (customerIdMode === undefined && requestedNumber === ""));
      if (assignsNumber) merged.customerNumber = nextCustomerId(this.store.customers, currentManilaYear());
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id, this.supplementaryAllowed(merged.vipPlan));
      if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
      this.assertRegistrationAttribution(identity, merged);
      this.assertReferences(merged);
      const previousStatus = customer.status;
      this.assignClosingSeller(identity, customer, input);
      this.apply(customer, input);
      if (assignsNumber) customer.customerNumber = merged.customerNumber;
      customer.status = "submitted";
      customer.submittedAt = today();
      customer.reviewReason = null;
      this.step(customer, identity, "submitted");
      const assignedNumber = assignsNumber ? merged.customerNumber : null;
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_SUBMITTED, entityType: "customer", entityId: customer.id, previousValue: previousStatus, newValue: assignedNumber ? `submitted; customerNumber:${assignedNumber}` : "submitted" });
      return this.copy(customer);
    });
  }

  /** Administrator or Super Administrator only; may approve a registration they entered (doc 01 3.7), the audit trail shows both. */
  async approve(id: string, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      this.require(identity, "customers.approve", "Customer approval is not allowed for this identity.");
      const customer = this.reviewable(identity, id);
      const errors = approvalErrors(customer, this.store.accreditations, today());
      if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
      customer.status = "approved";
      customer.approvedAt = today();
      customer.reviewReason = null;
      this.step(customer, identity, "approved");
      this.audit(identity, { module: "customers", action: BUSINESS_AUDIT_ACTIONS.CUSTOMER_APPROVED, entityType: "customer", entityId: customer.id, previousValue: "submitted", newValue: "approved" });
      return this.copy(customer);
    });
  }

  async sendBack(id: string, reason: string, options?: MockAsyncOptions): Promise<Customer> {
    return this.review(id, reason, "sent_back", BUSINESS_AUDIT_ACTIONS.CUSTOMER_SENT_BACK, options);
  }

  async reject(id: string, reason: string, options?: MockAsyncOptions): Promise<Customer> {
    return this.review(id, reason, "rejected", BUSINESS_AUDIT_ACTIONS.CUSTOMER_REJECTED, options);
  }

  private review(id: string, reason: string, status: "sent_back" | "rejected", action: typeof BUSINESS_AUDIT_ACTIONS.CUSTOMER_SENT_BACK | typeof BUSINESS_AUDIT_ACTIONS.CUSTOMER_REJECTED, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      this.require(identity, "customers.approve", "Customer review is not allowed for this identity.");
      const trimmed = reason.trim();
      if (!trimmed) throw new Error("A reason is required.");
      const customer = this.reviewable(identity, id);
      customer.status = status;
      customer.reviewReason = trimmed;
      this.step(customer, identity, status, trimmed);
      this.audit(identity, { module: "customers", action, entityType: "customer", entityId: customer.id, previousValue: "submitted", newValue: status, reason: trimmed });
      return this.copy(customer);
    });
  }

  private reviewable(identity: DevIdentity, id: string): Customer {
    const customer = this.ownRecord(identity, id);
    if (!canReviewRegistration(customer.status)) throw new Error("Only a submitted registration can be reviewed.");
    return customer;
  }

  async correct(id: string, input: CustomerDraftInput, reason: string, options?: MockAsyncOptions): Promise<Customer> {
    return this.run(options, (identity) => {
      if (!this.canManage(identity)) throw new Error("Customer correction is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required for a data correction.");
      const customer = this.ownRecord(identity, id);
      if (isEditableRegistration(customer.status)) throw new Error("Draft customers are edited directly.");
      if (customer.status === "rejected") throw new Error("A rejected registration cannot be corrected.");
      const merged = { ...this.copy(customer), ...input, displayName: input.displayName || customer.displayName } as CustomerDraftInput;
      const errors = validateCustomerForSubmit(merged, this.store.customers, customer.id, this.supplementaryAllowed(merged.vipPlan));
      if (Object.keys(errors).length > 0) throw new CustomerValidationError(errors);
      this.assertReferences(merged);
      const previousNumber = customer.customerNumber ?? null;
      this.assignClosingSeller(identity, customer, input);
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
