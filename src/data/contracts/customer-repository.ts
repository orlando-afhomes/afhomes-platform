import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";

export interface CustomerRepository {
  list(options?: MockAsyncOptions): Promise<Customer[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<Customer | null>;
  createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  updateDraft(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  discardDraft(id: string, options?: MockAsyncOptions): Promise<void>;
  /** Validates the full Submit rules (04 section 10); a failed Submit keeps the draft and reports every error. */
  submit(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  /** Audited data correction of a submitted customer (04 section 16). */
  correct(id: string, input: CustomerDraftInput, reason: string, options?: MockAsyncOptions): Promise<Customer>;
}

/** Thrown by submit with field-level messages so the form can show them. */
export class CustomerValidationError extends Error {
  constructor(public readonly errors: Record<string, string | undefined>) {
    super("Review the highlighted fields.");
    this.name = "CustomerValidationError";
  }
}
