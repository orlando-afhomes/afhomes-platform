import type { MockAsyncOptions } from "@/data/contracts/async-options";
import { hasRedemptionReceiptReference, hasResortReceiptReference } from "./resort-receipt-reference";
import { findReferenceConflict } from "@/modules/finance/rules";
import type { HistoryImportRepository } from "@/data/contracts/history-import-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { MAX_IMPORT_ROWS } from "@/modules/customers/import";
import type { DevIdentity } from "@/modules/identity/types";
import { buildReceiptImportRows, type ReceiptImportBatch, type ReceiptImportRecord } from "@/modules/imports/receipt-import";
import { BusinessRepository, nowIso, today } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Historical receipt import (F11.5). Batches live apart from live payments: they never overwrite a payment,
 * allocate a VIP Number or trigger a commission. Receipts count only after an Administrator signs the batch.
 */
export class MockHistoryImportRepository extends BusinessRepository implements HistoryImportRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private batchFor(id: string): ReceiptImportBatch {
    const batch = this.store.receiptImportBatches.find((item) => item.id === id);
    if (!batch) throw new Error("Import batch not found.");
    return batch;
  }

  async listBatches(options?: MockAsyncOptions): Promise<ReceiptImportBatch[]> {
    return this.run(options, (identity) => {
      if (!this.can(identity, "history-import.manage")) return [];
      return copy([...this.store.receiptImportBatches].reverse());
    });
  }

  async createBatch(input: { fileName: string; records: ReceiptImportRecord[]; declaration: boolean }, options?: MockAsyncOptions): Promise<ReceiptImportBatch> {
    return this.run(options, (identity) => {
      this.require(identity, "history-import.manage", "Historical import is not allowed for this identity.");
      if (!input.declaration) throw new Error("Confirm that the rows come from official company records.");
      if (input.records.length === 0) throw new Error("The file has no rows to import.");
      if (input.records.length > MAX_IMPORT_ROWS) throw new Error(`A file may contain at most ${MAX_IMPORT_ROWS} rows.`);
      const rows = buildReceiptImportRows(input.records, { payments: this.store.payments, batches: this.store.receiptImportBatches, today: today() });
      const ready = rows.filter((row) => row.status === "ready");
      if (ready.some(({ receipt }) => receipt && (hasResortReceiptReference(this.store, receipt.referenceNo) || hasRedemptionReceiptReference(this.store, receipt.referenceNo)))) {
        throw new Error("A receipt reference is already on a resort bill or Redemption payment. Remove that row and retry.");
      }
      if (ready.length === 0) throw new Error("No row can be imported. Fix the file and try again.");
      const id = nextId(this.store, "receiptImport", "rimp");
      const batch: ReceiptImportBatch = {
        id,
        fileName: input.fileName.trim().slice(0, 200) || "upload",
        createdAt: nowIso(),
        createdBy: identity.id,
        status: "pending_signoff",
        totalRows: rows.length,
        receipts: ready.map((row, index) => ({ ...row.receipt!, id: `${id}-r${index + 1}`, batchId: id })),
        skipped: rows.filter((row) => row.status === "invalid").map((row) => ({ rowNumber: row.rowNumber, reason: row.errors.join(" ") })),
        decidedBy: null,
        decidedAt: null,
        decisionReason: null,
        selfSignedOff: false,
      };
      this.store.receiptImportBatches.push(batch);
      // Counts only: no reference numbers, names or amounts in the audit payload (doc 12).
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_CREATED, entityType: "receipt-import", entityId: batch.id, newValue: `pending_signoff;receipts:${batch.receipts.length};skipped:${batch.skipped.length}` });
      return copy(batch);
    });
  }

  async signOff(id: string, options?: MockAsyncOptions): Promise<ReceiptImportBatch> {
    return this.run(options, (identity) => {
      this.require(identity, "history-import.signoff", "Only an Administrator can sign off an import batch.");
      const batch = this.batchFor(id);
      if (batch.status !== "pending_signoff") throw new Error("Only a batch awaiting sign-off can be signed off.");
      if (batch.receipts.some(({ referenceNo }) => findReferenceConflict(this.store.payments, referenceNo) ||
        hasResortReceiptReference(this.store, referenceNo) || hasRedemptionReceiptReference(this.store, referenceNo))) {
        throw new Error("A receipt reference is already on record. Reject this batch and prepare a corrected copy.");
      }
      batch.status = "signed_off";
      batch.decidedBy = identity.id;
      batch.decidedAt = nowIso();
      batch.selfSignedOff = batch.createdBy === identity.id;
      this.audit(identity, {
        module: "finance",
        action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_SIGNED_OFF,
        entityType: "receipt-import",
        entityId: batch.id,
        previousValue: "pending_signoff",
        newValue: `signed_off;receipts:${batch.receipts.length}`,
        reason: batch.selfSignedOff ? "Self-signed: the signer also prepared this batch." : undefined,
      });
      return copy(batch);
    });
  }

  async reject(id: string, reason: string, options?: MockAsyncOptions): Promise<ReceiptImportBatch> {
    return this.run(options, (identity) => {
      this.require(identity, "history-import.manage", "Historical import is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason is required.");
      const batch = this.batchFor(id);
      if (batch.status !== "pending_signoff") throw new Error("Only a batch awaiting sign-off can be rejected.");
      batch.status = "rejected";
      batch.decidedBy = identity.id;
      batch.decidedAt = nowIso();
      batch.decisionReason = reason.trim().slice(0, 500);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_REJECTED, entityType: "receipt-import", entityId: batch.id, previousValue: "pending_signoff", newValue: "rejected", reason: batch.decisionReason });
      return copy(batch);
    });
  }
}
