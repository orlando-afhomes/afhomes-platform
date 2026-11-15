import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { TierColorKey, TierLevel } from "@/modules/vip/types";

/** `productCount` counts every product in the level, retired ones too. A level with products can only be deactivated. */
export type TierLevelView = TierLevel & { productCount: number; inUse: boolean };

export type TierLevelInput = { name: string; colorKey: TierColorKey; sortOrder?: number };

export interface TierLevelRepository {
  /** Readable by every identity: product forms and filters read their tier choices from it. */
  list(options?: MockAsyncOptions): Promise<TierLevelView[]>;
  /** Needs `vip-products.manage`. Names are unique ignoring case. */
  create(input: TierLevelInput, options?: MockAsyncOptions): Promise<TierLevelView>;
  update(id: string, input: Partial<TierLevelInput> & { status?: TierLevel["status"] }, options?: MockAsyncOptions): Promise<TierLevelView>;
  deactivate(id: string, options?: MockAsyncOptions): Promise<TierLevelView>;
  /** Throws with the reason when a product uses the level (05 section 3.2: retire, never destroy). */
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
}
