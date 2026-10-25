import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Customer, CustomerDraftInput } from "@/modules/customers/types";

export interface CustomerRepository {
  list(options?: MockAsyncOptions): Promise<Customer[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<Customer | null>;
  createDraft(input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  updateDraft(id: string, input: CustomerDraftInput, options?: MockAsyncOptions): Promise<Customer>;
  discardDraft(id: string, options?: MockAsyncOptions): Promise<void>;
}
