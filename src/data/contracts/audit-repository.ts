import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AuditActorOption, AuditPage, AuditQuery } from "@/modules/audit/types";

/** Read-only audit history. There is intentionally no write, update, or delete operation. */
export interface AuditRepository {
  list(query?: AuditQuery, options?: MockAsyncOptions): Promise<AuditPage>;
  /** Everyone who appears as an actor in the history (System included), sorted by name. */
  listActors(options?: MockAsyncOptions): Promise<AuditActorOption[]>;
}
