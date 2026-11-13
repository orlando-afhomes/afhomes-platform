import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { CustomerImportJob, CustomerImportRecord } from "@/modules/customers/import";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";

export interface CustomerRepository {
  list(options?: MockAsyncOptions): Promise<Customer[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<Customer | null>;
  createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  updateDraft(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  discardDraft(id: string, options?: MockAsyncOptions): Promise<void>;
  /** Validates the full Submit rules (04 section 10); a failed Submit keeps the draft and reports every error. */
  submit(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  /** Administrator or Super Administrator approves a submitted registration; needs an eligible closing seller (04 sections 5, 7.8, 10). */
  approve(id: string, options?: MockAsyncOptions): Promise<Customer>;
  /** Returns a submitted registration to the Clerk; a reason is required and nothing is deleted. */
  sendBack(id: string, reason: string, options?: MockAsyncOptions): Promise<Customer>;
  /** Rejects a submitted registration; a reason is required and nothing is deleted. */
  reject(id: string, reason: string, options?: MockAsyncOptions): Promise<Customer>;
  /** Audited data correction of a submitted customer (04 section 16). */
  correct(id: string, input: CustomerDraftInput, reason: string, options?: MockAsyncOptions): Promise<Customer>;
  /** Re-validates every record and creates drafts for ready rows only; possible duplicates are skipped for review. */
  importCustomers(input: { fileName: string; records: CustomerImportRecord[]; declaration: boolean }, options?: MockAsyncOptions): Promise<CustomerImportJob>;
  listImportJobs(options?: MockAsyncOptions): Promise<CustomerImportJob[]>;
  /** Audited export of the records visible to the identity (capped at 5,000). */
  exportCustomers(input: { format: "xlsx" | "csv"; count: number }, options?: MockAsyncOptions): Promise<Customer[]>;
}

/** Thrown by submit with field-level messages so the form can show them. */
export class CustomerValidationError extends Error {
  constructor(public readonly errors: Record<string, string | undefined>) {
    super("Review the highlighted fields.");
    this.name = "CustomerValidationError";
  }
}
