import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AuditPage, AuditQuery } from "@/modules/audit/types";

/** Read-only audit history. There is intentionally no write, update, or delete operation. */
export interface AuditRepository {
  list(query?: AuditQuery, options?: MockAsyncOptions): Promise<AuditPage>;
}
