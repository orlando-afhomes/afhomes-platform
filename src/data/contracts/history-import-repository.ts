import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ReceiptImportBatch, ReceiptImportRecord } from "@/modules/imports/receipt-import";

export interface HistoryImportRepository {
  listBatches(options?: MockAsyncOptions): Promise<ReceiptImportBatch[]>;
  /** Validates again and stores the ready rows as a batch awaiting sign-off. Invalid rows are skipped and listed. */
  createBatch(input: { fileName: string; records: ReceiptImportRecord[]; declaration: boolean }, options?: MockAsyncOptions): Promise<ReceiptImportBatch>;
  /** One Administrator sign-off makes every receipt of the batch Approved (imported). */
  signOff(id: string, options?: MockAsyncOptions): Promise<ReceiptImportBatch>;
  /** Rejects the whole batch; a reason is required and nothing in it ever counts. */
  reject(id: string, reason: string, options?: MockAsyncOptions): Promise<ReceiptImportBatch>;
}
