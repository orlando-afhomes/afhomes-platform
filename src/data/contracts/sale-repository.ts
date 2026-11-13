import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Sale } from "@/modules/sales/types";
import type { ClosedMonth } from "@/modules/finance/month-close";

export type SaleView = Sale & { customerName: string; sellerName: string | null; schemeLabel: string; defaultEligible?: boolean };

/** Sales are created by the contract workflow and approved separately. */
export interface SaleRepository {
  approve(id: string, options?: MockAsyncOptions): Promise<SaleView>;
  markDefaulted(id: string, reason: string, options?: MockAsyncOptions): Promise<SaleView>;
  listClosedMonths(options?: MockAsyncOptions): Promise<ClosedMonth[]>;
  closeMonth(month: string, options?: MockAsyncOptions): Promise<ClosedMonth>;
  list(options?: MockAsyncOptions): Promise<SaleView[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<SaleView | null>;
}
