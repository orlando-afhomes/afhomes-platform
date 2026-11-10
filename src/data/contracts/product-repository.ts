import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";

export type ProductUpdateInput = Partial<
  Pick<
    VipProduct,
    | "name" | "priceCentavos" | "priceStatus" | "validityYears" | "earningCycles" | "vipDiscountPercent" | "lifetimePoints"
    | "pointsPerCycle" | "weekdayPointsPerCycle" | "weekendPointsPerCycle" | "minSpendPerCycleCentavos" | "supplementaryHolders" | "status"
  >
>;

export type PaymentSchemeInput = Partial<
  Pick<
    PaymentScheme,
    "label" | "paymentCode" | "applicableTiers" | "reservationCentavos" | "installmentCount" | "installmentCentavosByTier" | "priceCentavosByTier" | "installmentCountByTier" | "downPaymentBasisPoints" | "availability"
  >
>;

export interface ProductRepository {
  list(options?: MockAsyncOptions): Promise<VipProduct[]>;
  /** Creates a new configuration version. Finalized contracts keep their own snapshot (05 section 3.1). */
  update(code: VipTierCode, input: ProductUpdateInput, reason: string, options?: MockAsyncOptions): Promise<VipProduct>;
  listSchemes(options?: MockAsyncOptions): Promise<PaymentScheme[]>;
  createScheme(input: PaymentSchemeInput & { label: string }, options?: MockAsyncOptions): Promise<PaymentScheme>;
  updateScheme(id: string, input: PaymentSchemeInput, reason: string, options?: MockAsyncOptions): Promise<PaymentScheme>;
}
