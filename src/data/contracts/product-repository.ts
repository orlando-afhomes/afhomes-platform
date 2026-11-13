import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";

export type ProductUpdateInput = Partial<
  Pick<
    VipProduct,
    | "name" | "priceCentavos" | "priceStatus" | "validityYears" | "earningCycles" | "vipDiscountPercent" | "lifetimePoints"
    | "pointsPerCycle" | "weekdayPointsPerCycle" | "weekendPointsPerCycle" | "minSpendPerCycleCentavos" | "supplementaryHolders" | "status"
  >
>;

/** Everything a new catalog product needs; version, status and history are set by the repository. */
export type ProductCreateInput = Pick<
  VipProduct,
  | "code" | "name" | "tier" | "priceCentavos" | "validityYears" | "earningCycles" | "vipDiscountPercent" | "lifetimePoints"
  | "pointsPerCycle" | "weekdayPointsPerCycle" | "weekendPointsPerCycle" | "minSpendPerCycleCentavos" | "supplementaryHolders"
>;

export type PaymentSchemeInput = Partial<
  Pick<
    PaymentScheme,
    "label" | "paymentCode" | "paymentCodeByTier" | "applicableTiers" | "reservationCentavos" | "installmentCount" | "installmentCentavosByTier" | "priceCentavosByTier" | "installmentCountByTier" | "downPaymentBasisPoints" | "availability"
  >
>;

export interface ProductRepository {
  list(options?: MockAsyncOptions): Promise<VipProduct[]>;
  /** Creates a new configuration version. Finalized contracts keep their own snapshot (05 section 3.1). */
  update(code: VipTierCode, input: ProductUpdateInput, reason: string, options?: MockAsyncOptions): Promise<VipProduct>;
  /** Adds a product at configuration version 1. Needs a free, valid, non-reserved 2-character code (05 sections 4 and 19). */
  create(input: ProductCreateInput, reason: string, options?: MockAsyncOptions): Promise<VipProduct>;
  /** Removes a product that nothing references. Used products can only be retired (05 section 3.2). */
  delete(code: VipTierCode, reason: string, options?: MockAsyncOptions): Promise<void>;
  /** For each product code, why it cannot be deleted, or null when it is unused. */
  deleteBlockers(options?: MockAsyncOptions): Promise<Record<string, string | null>>;
  listSchemes(options?: MockAsyncOptions): Promise<PaymentScheme[]>;
  createScheme(input: PaymentSchemeInput & { label: string }, options?: MockAsyncOptions): Promise<PaymentScheme>;
  updateScheme(id: string, input: PaymentSchemeInput, reason: string, options?: MockAsyncOptions): Promise<PaymentScheme>;
}
