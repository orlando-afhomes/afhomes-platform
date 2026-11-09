import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Sale } from "@/modules/sales/types";

export type SaleView = Sale & { customerName: string; sellerName: string | null; schemeLabel: string };

/** Read-only: sales are created and moved by the contract and payment workflows. */
export interface SaleRepository {
  list(options?: MockAsyncOptions): Promise<SaleView[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<SaleView | null>;
}
