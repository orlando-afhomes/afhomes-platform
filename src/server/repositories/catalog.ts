import "server-only";
import type { PaymentScheme, ProductChange, TierColorKey, TierLevel, VipProduct } from "@/modules/vip/types";
import { listAll } from "@/server/db";
import { int64ToCentavos } from "@/server/money";

/** Confirmed VIP configuration (docs 05 and 06) read from the database, never from sample constants. */

type TierLevelRow = { id: string; key: string; name: string; colorKey: string; sortOrder: number; status: string };

type ProductRow = {
  code: string; name: string; tierLevel: TierLevelRow | null;
  priceCentavos: string; priceStatus: string; priceNote: string | null;
  validityYears: number; earningCycles: number; vipDiscountPercent: number; lifetimePoints: number; pointsPerCycle: number;
  weekdayPointsPerCycle: number; weekendPointsPerCycle: number; minSpendPerCycleCentavos: string; supplementaryHolders: number;
  description: string | null; benefitsSummary: string | null; imageUrl: string | null; imageFileName: string | null;
  status: string; approvalStatus: string; publiclyListed: boolean; configVersion: number; effectiveDate: string | null; changes: ProductChange[] | null;
};

type PaymentSchemeRow = {
  key: string; label: string; historicalLabel: string | null; category: string; paymentCode: string | null;
  paymentCodeByTier: Record<string, string> | null; applicableTiers: string[] | null; reservationCentavos: string | null;
  installmentCount: number | null; installmentCentavosByTier: Record<string, number> | null; priceCentavosByTier: Record<string, number> | null;
  installmentCountByTier: Record<string, number> | null; downPaymentBasisPoints: number | null;
  commercialStatus: string; source: string; availability: string; ownerHold: string | null;
  configVersion: number; effectiveDate: string | null; changes: ProductChange[] | null; sortOrder: number;
};

const TIER_LEVEL_FIELDS = "id key name colorKey sortOrder status";
const PRODUCT_FIELDS = `code name tierLevel { ${TIER_LEVEL_FIELDS} } priceCentavos priceStatus priceNote validityYears earningCycles vipDiscountPercent lifetimePoints pointsPerCycle weekdayPointsPerCycle weekendPointsPerCycle minSpendPerCycleCentavos supplementaryHolders description benefitsSummary imageUrl imageFileName status approvalStatus publiclyListed configVersion effectiveDate changes`;
const SCHEME_FIELDS = "key label historicalLabel category paymentCode paymentCodeByTier applicableTiers reservationCentavos installmentCount installmentCentavosByTier priceCentavosByTier installmentCountByTier downPaymentBasisPoints commercialStatus source availability ownerHold configVersion effectiveDate changes sortOrder";

export async function loadTierLevels(): Promise<TierLevel[]> {
  const rows = await listAll<TierLevelRow>("tierLevels", TIER_LEVEL_FIELDS);
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.key,
      name: row.name,
      colorKey: row.colorKey as TierColorKey,
      sortOrder: row.sortOrder,
      status: row.status === "active" ? "active" : "inactive",
    }));
}

export async function loadProducts(): Promise<VipProduct[]> {
  const rows = await listAll<ProductRow>("products", PRODUCT_FIELDS);
  return rows
    .sort((a, b) => (a.tierLevel?.sortOrder ?? 0) - (b.tierLevel?.sortOrder ?? 0) || a.code.localeCompare(b.code))
    .map((row) => ({
      code: row.code,
      name: row.name,
      tierLevelId: row.tierLevel?.key ?? "",
      tier: row.tierLevel?.name ?? row.code,
      tierColorKey: (row.tierLevel?.colorKey as TierColorKey | undefined) ?? "neutral",
      priceCentavos: int64ToCentavos(row.priceCentavos),
      priceStatus: row.priceStatus === "conflict" ? "conflict" : "contract_stated",
      priceNote: row.priceNote,
      validityYears: row.validityYears,
      earningCycles: row.earningCycles,
      vipDiscountPercent: row.vipDiscountPercent,
      lifetimePoints: row.lifetimePoints,
      pointsPerCycle: row.pointsPerCycle,
      weekdayPointsPerCycle: row.weekdayPointsPerCycle,
      weekendPointsPerCycle: row.weekendPointsPerCycle,
      minSpendPerCycleCentavos: int64ToCentavos(row.minSpendPerCycleCentavos),
      supplementaryHolders: row.supplementaryHolders,
      description: row.description,
      benefitsSummary: row.benefitsSummary,
      imageUrl: row.imageUrl,
      imageFileName: row.imageFileName,
      status: row.status === "retired" ? "retired" : "active",
      approvalStatus: row.approvalStatus === "approved" ? "approved" : "draft",
      publiclyListed: row.publiclyListed,
      configVersion: row.configVersion,
      effectiveDate: row.effectiveDate,
      changes: row.changes ?? [],
    }));
}

export async function loadPaymentSchemes(): Promise<PaymentScheme[]> {
  const rows = await listAll<PaymentSchemeRow>("paymentSchemes", SCHEME_FIELDS);
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder || a.key.localeCompare(b.key))
    .map((row) => ({
      id: row.key,
      label: row.label,
      historicalLabel: row.historicalLabel,
      category: row.category === "cash" ? "cash" : row.category === "move" ? "move" : "installment",
      paymentCode: row.paymentCode,
      ...(row.paymentCodeByTier ? { paymentCodeByTier: row.paymentCodeByTier } : {}),
      applicableTiers: row.applicableTiers ?? [],
      reservationCentavos: row.reservationCentavos === null ? null : int64ToCentavos(row.reservationCentavos),
      installmentCount: row.installmentCount,
      installmentCentavosByTier: row.installmentCentavosByTier ?? {},
      priceCentavosByTier: row.priceCentavosByTier ?? {},
      ...(row.installmentCountByTier ? { installmentCountByTier: row.installmentCountByTier } : {}),
      ...(row.downPaymentBasisPoints !== null ? { downPaymentBasisPoints: row.downPaymentBasisPoints } : {}),
      commercialStatus: row.commercialStatus === "pending_owner_decision" ? "pending_owner_decision" : "configured",
      source: row.source,
      availability: row.availability === "unavailable" ? "unavailable" : "available",
      ownerHold: row.ownerHold,
      configVersion: row.configVersion,
      effectiveDate: row.effectiveDate,
      changes: row.changes ?? [],
    }));
}
