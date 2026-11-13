import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { ListEntryStatus, Outlet, OutletType } from "@/modules/settings/lists";

/** `inUse`: a resort bill, booking or promo already uses the outlet, so it can only be deactivated. */
export type OutletView = Outlet & { inUse: boolean };

export interface OutletRepository {
  /** Readable by every identity; filter on `status === "active"` for entry forms. */
  list(options?: MockAsyncOptions): Promise<OutletView[]>;
  create(input: { name: string; type: OutletType }, options?: MockAsyncOptions): Promise<OutletView>;
  update(id: string, input: { name?: string; type?: OutletType; status?: ListEntryStatus }, options?: MockAsyncOptions): Promise<OutletView>;
  deactivate(id: string, options?: MockAsyncOptions): Promise<OutletView>;
  /** Throws with the reason when the outlet is used. */
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}
