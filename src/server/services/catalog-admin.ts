import "server-only";
import type { PaymentSchemeInput, ProductCreateInput, ProductUpdateInput } from "@/data/contracts/product-repository";
import type { TierLevelInput, TierLevelView } from "@/data/contracts/tier-level-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Customer } from "@/modules/customers/types";
import type { ProductChange, PaymentScheme, TierColorKey, TierLevel, VipProduct } from "@/modules/vip/types";
import { benefitsLostError, productCodeError, PRODUCT_ECONOMIC_KEYS, productTermErrors, schemeTermErrors, schemeTermsComplete } from "@/modules/vip/rules";
import { productsInLevel, TIER_COLOR_OPTIONS, tierLevelNameError } from "@/modules/vip/tier-levels";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { listAll, dbRead } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import { conflict, invalid, newId, notFound, today, transact } from "@/server/services/common";
import { loadProducts, loadPaymentSchemes, loadTierLevels } from "@/server/repositories/catalog";
import { loadCustomers } from "@/server/repositories/records";

/**
 * Writes for the confirmed VIP catalog (doc 05 sections 3, 4, 8 and 18). Every change is
 * audited, bumps the configuration version and takes effect from today; finalized
 * contracts keep their own snapshot and are never rewritten (05 section 3.1).
 */

type TierLevelRow = { id: string; key: string; name: string; colorKey: string; sortOrder: number; status: string; configVersion: number; effectiveDate: string | null; changes: ProductChange[] | null };
const TIER_LEVEL_ROW_FIELDS = "id key name colorKey sortOrder status configVersion effectiveDate changes";

type ProductRow = {
  id: string; code: string; name: string; tierLevel: { id: string; key: string } | null;
  priceCentavos: string; priceStatus: string; priceNote: string | null;
  validityYears: number; earningCycles: number; vipDiscountPercent: number; lifetimePoints: number; pointsPerCycle: number;
  weekdayPointsPerCycle: number; weekendPointsPerCycle: number; minSpendPerCycleCentavos: string; supplementaryHolders: number;
  description: string | null; benefitsSummary: string | null; imageUrl: string | null; imageFileName: string | null;
  status: string; approvalStatus: string; publiclyListed: boolean; configVersion: number; effectiveDate: string | null; changes: ProductChange[] | null;
};
const PRODUCT_ROW_FIELDS = "id code name tierLevel { id key } priceCentavos priceStatus priceNote validityYears earningCycles vipDiscountPercent lifetimePoints pointsPerCycle weekdayPointsPerCycle weekendPointsPerCycle minSpendPerCycleCentavos supplementaryHolders description benefitsSummary imageUrl imageFileName status approvalStatus publiclyListed configVersion effectiveDate changes";

type SchemeRow = {
  id: string; key: string; label: string; historicalLabel: string | null; category: string; paymentCode: string | null;
  paymentCodeByTier: Record<string, string> | null; applicableTiers: string[] | null; reservationCentavos: string | null;
  installmentCount: number | null; installmentCentavosByTier: Record<string, number> | null; priceCentavosByTier: Record<string, number> | null;
  installmentCountByTier: Record<string, number> | null; downPaymentBasisPoints: number | null;
  commercialStatus: string; source: string; availability: string; ownerHold: string | null;
  configVersion: number; effectiveDate: string | null; changes: ProductChange[] | null; sortOrder: number;
};
const SCHEME_ROW_FIELDS = "id key label historicalLabel category paymentCode paymentCodeByTier applicableTiers reservationCentavos installmentCount installmentCentavosByTier priceCentavosByTier installmentCountByTier downPaymentBasisPoints commercialStatus source availability ownerHold configVersion effectiveDate changes sortOrder";

const changeEntry = (actor: Actor, version: number, reason: string, summary: string): ProductChange => ({ version, date: today(), actorId: actor.userId, reason, summary });

async function loadTierLevelRow(key: string): Promise<TierLevelRow | null> {
  const result = await dbRead<{ tierLevels: TierLevelRow[] }>(`query($k: String!) { tierLevels(where: { key: { eq: $k } }, limit: 1) { ${TIER_LEVEL_ROW_FIELDS} } }`, { k: key });
  return result.tierLevels[0] ?? null;
}

async function loadProductRow(code: string): Promise<ProductRow | null> {
  const result = await dbRead<{ products: ProductRow[] }>(`query($c: String!) { products(where: { code: { eq: $c } }, limit: 1) { ${PRODUCT_ROW_FIELDS} } }`, { c: code });
  return result.products[0] ?? null;
}

async function loadSchemeRow(key: string): Promise<SchemeRow | null> {
  const result = await dbRead<{ paymentSchemes: SchemeRow[] }>(`query($k: String!) { paymentSchemes(where: { key: { eq: $k } }, limit: 1) { ${SCHEME_ROW_FIELDS} } }`, { k: key });
  return result.paymentSchemes[0] ?? null;
}

const toTierLevel = (row: TierLevelRow): TierLevel => ({
  id: row.key, name: row.name, colorKey: row.colorKey as TierColorKey, sortOrder: row.sortOrder,
  status: row.status === "active" ? "active" : "inactive",
  configVersion: row.configVersion, effectiveDate: row.effectiveDate, changes: row.changes ?? [],
});

/** Admin view of a tier level with its product count; a level with products can only be deactivated. */
export async function listTierLevelViews(): Promise<TierLevelView[]> {
  const [levels, products] = await Promise.all([loadTierLevels(), loadProducts()]);
  return levels.map((level) => {
    const productCount = productsInLevel(products, level.id);
    return { ...level, productCount, inUse: productCount > 0 };
  });
}

export async function createTierLevel(actor: Actor, input: TierLevelInput): Promise<TierLevelView> {
  requireOperation(actor, "vip-products.manage");
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  const levels = await loadTierLevels();
  const problem = tierLevelNameError(input.name ?? "", levels);
  if (problem) throw invalid(problem, { name: problem });
  if (!TIER_COLOR_OPTIONS.some((item) => item.value === input.colorKey)) throw invalid("Choose a color.", { colorKey: "Choose a color." });
  const sortOrder = input.sortOrder ?? Math.max(0, ...levels.map((item) => item.sortOrder)) + 1;
  if (!Number.isInteger(sortOrder) || sortOrder < 1) throw invalid("The sort order must be a whole number from 1.", { sortOrder: "The sort order must be a whole number from 1." });
  const base = `tier-level-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "level"}`;
  const keys = new Set(levels.map((item) => item.id));
  let key = base;
  for (let n = 2; keys.has(key); n += 1) key = `${base}-${n}`;
  const row: TierLevelRow = {
    id: newId(), key, name, colorKey: input.colorKey, sortOrder, status: "active",
    configVersion: 1, effectiveDate: today(), changes: [changeEntry(actor, 1, "Created", "created")],
  };
  await transact(actor, {
    variableDefinitions: "$d: TierLevel_Data!",
    fields: "level: tierLevel_insert(data: $d)",
    variables: { d: { id: row.id, key: row.key, name: row.name, colorKey: row.colorKey, sortOrder: row.sortOrder, status: row.status, configVersion: row.configVersion, effectiveDate: row.effectiveDate, changes: row.changes } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_CREATED, entityType: "tier-level", entityId: key, details: { module: "vip-products", newValue: name } }],
  });
  return { ...toTierLevel(row), productCount: 0, inUse: false };
}

export async function updateTierLevel(actor: Actor, id: string, input: Partial<TierLevelInput> & { status?: TierLevel["status"] }): Promise<TierLevelView> {
  requireOperation(actor, "vip-products.manage");
  const row = await loadTierLevelRow(id);
  if (!row) throw notFound("Card level");
  const levels = (await loadTierLevels()).filter((item) => item.id !== id);
  if (input.status !== undefined && input.status !== "active" && input.status !== "inactive") throw invalid("The status must be active or inactive.");
  if (input.colorKey !== undefined && !TIER_COLOR_OPTIONS.some((item) => item.value === input.colorKey)) throw invalid("Choose a color.");
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 1)) throw invalid("The sort order must be a whole number from 1.");
  const name = input.name === undefined ? row.name : (input.name ?? "").trim().replace(/\s+/g, " ");
  if (input.name !== undefined) {
    const problem = tierLevelNameError(input.name ?? "", levels);
    if (problem) throw invalid(problem, { name: problem });
  }
  const next = { name, colorKey: input.colorKey ?? row.colorKey, sortOrder: input.sortOrder ?? row.sortOrder, status: input.status ?? row.status };
  const detailsChanged = next.name !== row.name || next.colorKey !== row.colorKey || next.sortOrder !== row.sortOrder;
  const statusChanged = next.status !== row.status;
  if (!detailsChanged && !statusChanged) return (await listTierLevelViews()).find((item) => item.id === id)!;
  const changes = [...(row.changes ?? []), changeEntry(actor, row.configVersion + 1, "Updated", [detailsChanged ? "details" : null, statusChanged ? `status:${next.status}` : null].filter(Boolean).join(", "))];
  const audits = [
    ...(detailsChanged ? [{ action: BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_UPDATED, entityType: "tier-level", entityId: id, details: { module: "vip-products", previousValue: `${row.name}, ${row.colorKey}, order ${row.sortOrder}`, newValue: `${next.name}, ${next.colorKey}, order ${next.sortOrder}` } }] : []),
    ...(statusChanged ? [{ action: next.status === "inactive" ? BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_DEACTIVATED : BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_REACTIVATED, entityType: "tier-level", entityId: id, details: { module: "vip-products", previousValue: row.status, newValue: next.status } }] : []),
  ];
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: TierLevel_Data!",
    fields: "level: tierLevel_update(id: $id, data: $d)",
    variables: { id: row.id, d: { name: next.name, colorKey: next.colorKey, sortOrder: next.sortOrder, status: next.status, configVersion: row.configVersion + 1, effectiveDate: today(), changes } },
    audit: audits,
  });
  return (await listTierLevelViews()).find((item) => item.id === id)!;
}

export async function deactivateTierLevel(actor: Actor, id: string): Promise<TierLevelView> {
  return updateTierLevel(actor, id, { status: "inactive" });
}

export async function deleteTierLevel(actor: Actor, id: string): Promise<void> {
  requireOperation(actor, "vip-products.manage");
  const row = await loadTierLevelRow(id);
  if (!row) throw notFound("Card level");
  const products = await loadProducts();
  const count = productsInLevel(products, id);
  if (count > 0) throw conflict("tier_level_in_use", `"${row.name}" is used by ${count} product${count === 1 ? "" : "s"}. Deactivate it instead.`);
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "level: tierLevel_delete(id: $id)",
    variables: { id: row.id },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.TIER_LEVEL_DELETED, entityType: "tier-level", entityId: id, details: { module: "vip-products", previousValue: row.name } }],
  });
}

const nextVersion = (row: { configVersion: number }) => row.configVersion + 1;

function productFromRow(row: ProductRow): VipProduct {
  return {
    code: row.code, name: row.name, tierLevelId: row.tierLevel?.key ?? "", tier: row.name, tierColorKey: "neutral",
    priceCentavos: int64ToCentavos(row.priceCentavos), priceStatus: row.priceStatus === "conflict" ? "conflict" : "contract_stated", priceNote: row.priceNote,
    validityYears: row.validityYears, earningCycles: row.earningCycles, vipDiscountPercent: row.vipDiscountPercent, lifetimePoints: row.lifetimePoints,
    pointsPerCycle: row.pointsPerCycle, weekdayPointsPerCycle: row.weekdayPointsPerCycle, weekendPointsPerCycle: row.weekendPointsPerCycle,
    minSpendPerCycleCentavos: int64ToCentavos(row.minSpendPerCycleCentavos), supplementaryHolders: row.supplementaryHolders,
    description: row.description, benefitsSummary: row.benefitsSummary, imageUrl: row.imageUrl, imageFileName: row.imageFileName,
    status: row.status === "retired" ? "retired" : "active", approvalStatus: row.approvalStatus === "approved" ? "approved" : "draft",
    publiclyListed: row.publiclyListed, configVersion: row.configVersion, effectiveDate: row.effectiveDate, changes: row.changes ?? [],
  };
}

const productColumns = (product: VipProduct, tierLevelId: string) => ({
  code: product.code, name: product.name, tierLevelId,
  priceCentavos: centavosToInt64(product.priceCentavos), priceStatus: product.priceStatus, priceNote: product.priceNote,
  validityYears: product.validityYears, earningCycles: product.earningCycles, vipDiscountPercent: product.vipDiscountPercent,
  lifetimePoints: product.lifetimePoints, pointsPerCycle: product.pointsPerCycle, weekdayPointsPerCycle: product.weekdayPointsPerCycle,
  weekendPointsPerCycle: product.weekendPointsPerCycle, minSpendPerCycleCentavos: centavosToInt64(product.minSpendPerCycleCentavos),
  supplementaryHolders: product.supplementaryHolders, description: product.description ?? null, benefitsSummary: product.benefitsSummary ?? null,
  imageUrl: product.imageUrl ?? null, imageFileName: product.imageFileName ?? null, status: product.status,
  approvalStatus: product.approvalStatus, publiclyListed: product.publiclyListed, configVersion: product.configVersion,
  effectiveDate: product.effectiveDate ?? null, changes: product.changes,
});

async function productByCode(code: string): Promise<VipProduct> {
  const products = await loadProducts();
  const product = products.find((item) => item.code === code);
  if (!product) throw notFound("Product");
  return product;
}

export async function createProduct(actor: Actor, input: ProductCreateInput, reason: string): Promise<VipProduct> {
  requireOperation(actor, "vip-products.manage");
  const text = reason.trim();
  if (!text) throw invalid("A reason or approval reference is required for a configuration change.", { reason: "A reason or approval reference is required." });
  const code = (input.code ?? "").trim().toUpperCase();
  const products = await loadProducts();
  const codeProblem = productCodeError(code, products.map((item) => item.code));
  if (codeProblem) throw invalid(codeProblem, { code: codeProblem });
  const tierRow = await loadTierLevelRow(input.tierLevelId ?? "");
  if (!tierRow) throw invalid("Choose a card level.", { tierLevelId: "Choose a card level." });
  if (tierRow.status !== "active") throw invalid("This card level is inactive. Choose an active one.", { tierLevelId: "Choose an active card level." });
  const name = (input.name ?? "").trim();
  if (!name) throw invalid("A product name is required.", { name: "A product name is required." });
  if (products.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw conflict("product_name_exists", "A product with this name already exists.");
  const product: VipProduct = {
    code, name, tierLevelId: tierRow.key, tier: tierRow.name, tierColorKey: tierRow.colorKey as TierColorKey,
    priceCentavos: input.priceCentavos, priceStatus: "contract_stated", priceNote: `Created on ${today()}: ${text}`,
    validityYears: input.validityYears, earningCycles: input.earningCycles, vipDiscountPercent: input.vipDiscountPercent,
    lifetimePoints: input.lifetimePoints, pointsPerCycle: input.pointsPerCycle, weekdayPointsPerCycle: input.weekdayPointsPerCycle,
    weekendPointsPerCycle: input.weekendPointsPerCycle, minSpendPerCycleCentavos: input.minSpendPerCycleCentavos,
    supplementaryHolders: input.supplementaryHolders, description: input.description?.trim() || null, benefitsSummary: input.benefitsSummary?.trim() || null,
    imageUrl: input.imageUrl ?? null, imageFileName: input.imageFileName ?? null, status: "active", approvalStatus: "draft",
    publiclyListed: input.publiclyListed ?? false, configVersion: 1, effectiveDate: today(), changes: [changeEntry(actor, 1, text, "created")],
  };
  const problem = productTermErrors(product);
  if (problem) throw invalid(problem);
  await transact(actor, {
    variableDefinitions: "$d: Product_Data!",
    fields: "product: product_insert(data: $d)",
    variables: { d: { id: newId(), ...productColumns(product, tierRow.id) } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PRODUCT_CREATED, entityType: "product", entityId: code, details: { module: "vip-products", newValue: `v1 ${name}`, reason: text } }],
  });
  return productByCode(code);
}

export async function updateProduct(actor: Actor, code: string, input: ProductUpdateInput, reason: string): Promise<VipProduct> {
  requireOperation(actor, "vip-products.manage");
  const text = reason.trim();
  if (!text) throw invalid("A reason or approval reference is required for a configuration change.", { reason: "A reason or approval reference is required." });
  const row = await loadProductRow(code);
  if (!row) throw notFound("Product");
  const current = productFromRow(row);
  let tierRow: TierLevelRow | null = null;
  if (input.tierLevelId !== undefined && input.tierLevelId !== current.tierLevelId) {
    tierRow = await loadTierLevelRow(input.tierLevelId);
    if (!tierRow) throw invalid("Choose a card level.", { tierLevelId: "Choose a card level." });
    if (tierRow.status !== "active") throw invalid("This card level is inactive. Choose an active one.", { tierLevelId: "Choose an active card level." });
  }
  const next = { ...current, ...input } as VipProduct;
  const problem = benefitsLostError(current, next) ?? productTermErrors(next);
  if (problem) throw invalid(problem);
  const changed = (Object.keys(input) as Array<keyof ProductUpdateInput>).filter((key) => input[key] !== undefined && input[key] !== current[key]);
  if (changed.length === 0) return current;
  if (current.approvalStatus === "approved" && changed.some((key) => PRODUCT_ECONOMIC_KEYS.includes(key))) {
    requireOperation(actor, "vip-products.approve");
  }
  if (input.priceStatus !== undefined && input.priceStatus !== "contract_stated" && input.priceStatus !== "conflict") throw invalid("The price status must be contract_stated or conflict.");
  const priceChanged = changed.includes("priceCentavos");
  const statusChanged = changed.includes("priceStatus");
  const retired = changed.includes("status") && next.status === "retired";
  next.configVersion = nextVersion(row);
  next.effectiveDate = today();
  next.priceStatus = statusChanged ? next.priceStatus : current.priceStatus;
  next.priceNote = priceChanged || statusChanged ? `Updated on ${today()}: ${text}` : current.priceNote;
  next.changes = [...current.changes, changeEntry(actor, next.configVersion, text, changed.join(", "))];
  const tierLevelId = tierRow ? tierRow.id : (row.tierLevel?.id ?? "");
  if (!tierLevelId) throw conflict("product_tier_missing", "The product's card level is missing. Choose one.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: Product_Data!",
    fields: "product: product_update(id: $id, data: $d)",
    variables: { id: row.id, d: productColumns(next, tierLevelId) },
    audit: [{ action: retired ? BUSINESS_AUDIT_ACTIONS.PRODUCT_RETIRED : BUSINESS_AUDIT_ACTIONS.PRODUCT_UPDATED, entityType: "product", entityId: code, details: { module: "vip-products", previousValue: `v${row.configVersion}`, newValue: `v${next.configVersion}`, reason: text } }],
  });
  return productByCode(code);
}

export async function approveProduct(actor: Actor, code: string, reason: string): Promise<VipProduct> {
  requireOperation(actor, "vip-products.approve");
  const text = reason.trim();
  if (!text) throw invalid("A reason or approval reference is required for approval.", { reason: "A reason or approval reference is required." });
  const row = await loadProductRow(code);
  if (!row) throw notFound("Product");
  const product = productFromRow(row);
  if (product.approvalStatus === "approved") throw conflict("already_approved", "This product is already approved.");
  if (product.status !== "active") throw conflict("product_inactive", "Make the product active before approving it.");
  const codeProblem = productCodeError(product.code, (await loadProducts()).filter((item) => item.code !== code).map((item) => item.code));
  if (codeProblem) throw invalid(codeProblem);
  const tierRow = row.tierLevel ? await loadTierLevelRow(row.tierLevel.key) : null;
  if (!tierRow || tierRow.status !== "active") throw conflict("tier_inactive", "Choose an active card level before approval.");
  if (!product.name.trim()) throw invalid("A product name is required before approval.");
  const problem = productTermErrors(product);
  if (problem) throw invalid(problem);
  if (!product.benefitsSummary?.trim()) throw invalid("State the product benefits before approval.");
  const schemes = await loadPaymentSchemes();
  if (!schemes.some((scheme) => scheme.availability === "available" && scheme.applicableTiers.includes(product.code))) {
    throw conflict("scheme_missing", "Configure an available payment plan for this product before approval.");
  }
  const version = nextVersion(row);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: Product_Data!",
    fields: "product: product_update(id: $id, data: $d)",
    variables: { id: row.id, d: { approvalStatus: "approved", configVersion: version, effectiveDate: today(), changes: [...product.changes, changeEntry(actor, version, text, "approved")] } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PRODUCT_APPROVED, entityType: "product", entityId: code, details: { module: "vip-products", previousValue: "draft", newValue: "approved", reason: text } }],
  });
  return productByCode(code);
}

/** Why a product cannot be deleted, or null when nothing references it (05 section 3.2: retire, never destroy). */
export async function productDeleteBlockers(actor: Actor): Promise<Record<string, string | null>> {
  requireOperation(actor, "vip-products.manage");
  const [products, schemes, customers] = await Promise.all([loadProducts(), loadPaymentSchemes(), loadCustomers()]);
  const contractCounts = await countByProductCode("contracts");
  const saleCounts = await countByProductCode("sales");
  return Object.fromEntries(products.map((product) => {
    const uses: Array<[number, string]> = [
      [contractCounts[product.code] ?? 0, "contract"],
      [saleCounts[product.code] ?? 0, "sale"],
      [customers.filter((customer: Customer) => customer.vipPlan === product.code).length, "customer plan"],
      [schemes.filter((scheme) => scheme.applicableTiers.includes(product.code) || product.code in scheme.priceCentavosByTier || product.code in scheme.installmentCentavosByTier).length, "payment plan"],
    ];
    const used = uses.filter(([count]) => count > 0);
    return [product.code, used.length === 0 ? null : `Already used by ${used.map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`).join(", ")}. Retire it instead.`];
  }));
}

async function countByProductCode(table: "contracts" | "sales"): Promise<Record<string, number>> {
  const rows = await listAll<{ productCode: string }>(table, "productCode");
  return rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.productCode]: (counts[row.productCode] ?? 0) + 1 }), {});
}

export async function deleteProduct(actor: Actor, code: string, reason: string): Promise<void> {
  requireOperation(actor, "vip-products.manage");
  const text = reason.trim();
  if (!text) throw invalid("A reason or approval reference is required to delete a product.", { reason: "A reason or approval reference is required." });
  const row = await loadProductRow(code);
  if (!row) throw notFound("Product");
  const blocked = (await productDeleteBlockers(actor))[code];
  if (blocked) throw conflict("product_in_use", blocked);
  await transact(actor, {
    variableDefinitions: "$id: UUID!",
    fields: "product: product_delete(id: $id)",
    variables: { id: row.id },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PRODUCT_DELETED, entityType: "product", entityId: code, details: { module: "vip-products", previousValue: `v${row.configVersion} ${row.name}`, reason: text } }],
  });
}

const schemeFromRow = (row: SchemeRow): PaymentScheme => ({
  id: row.key, label: row.label, historicalLabel: row.historicalLabel,
  category: row.category === "cash" ? "cash" : row.category === "move" ? "move" : "installment",
  paymentCode: row.paymentCode, ...(row.paymentCodeByTier ? { paymentCodeByTier: row.paymentCodeByTier } : {}),
  applicableTiers: row.applicableTiers ?? [], reservationCentavos: row.reservationCentavos === null ? null : int64ToCentavos(row.reservationCentavos),
  installmentCount: row.installmentCount, installmentCentavosByTier: row.installmentCentavosByTier ?? {},
  priceCentavosByTier: row.priceCentavosByTier ?? {}, ...(row.installmentCountByTier ? { installmentCountByTier: row.installmentCountByTier } : {}),
  ...(row.downPaymentBasisPoints !== null ? { downPaymentBasisPoints: row.downPaymentBasisPoints } : {}),
  commercialStatus: row.commercialStatus === "pending_owner_decision" ? "pending_owner_decision" : "configured",
  source: row.source, availability: row.availability === "unavailable" ? "unavailable" : "available", ownerHold: row.ownerHold,
  configVersion: row.configVersion, effectiveDate: row.effectiveDate, changes: row.changes ?? [],
});

const schemeColumns = (scheme: PaymentScheme) => ({
  label: scheme.label, historicalLabel: scheme.historicalLabel ?? null, category: scheme.category,
  paymentCode: scheme.paymentCode ?? null, paymentCodeByTier: scheme.paymentCodeByTier ?? {},
  applicableTiers: scheme.applicableTiers, reservationCentavos: scheme.reservationCentavos == null ? null : centavosToInt64(scheme.reservationCentavos),
  installmentCount: scheme.installmentCount ?? null, installmentCentavosByTier: scheme.installmentCentavosByTier,
  priceCentavosByTier: scheme.priceCentavosByTier, installmentCountByTier: scheme.installmentCountByTier ?? {},
  downPaymentBasisPoints: scheme.downPaymentBasisPoints ?? null, commercialStatus: scheme.commercialStatus, source: scheme.source,
  availability: scheme.availability, ownerHold: scheme.ownerHold ?? null, configVersion: scheme.configVersion,
  effectiveDate: scheme.effectiveDate ?? null, changes: scheme.changes,
});

async function schemeByKey(key: string): Promise<PaymentScheme> {
  const schemes = await loadPaymentSchemes();
  const scheme = schemes.find((item) => item.id === key);
  if (!scheme) throw notFound("Payment plan");
  return scheme;
}

export async function createScheme(actor: Actor, input: PaymentSchemeInput & { label: string }): Promise<PaymentScheme> {
  requireOperation(actor, "vip-products.manage");
  const label = (input.label ?? "").trim();
  if (!label) throw invalid("A payment plan name is required.", { label: "A payment plan name is required." });
  const schemes = await loadPaymentSchemes();
  if (schemes.some((item) => item.label.toLowerCase() === label.toLowerCase())) throw conflict("scheme_exists", "A payment plan with this name already exists.");
  const scheme: PaymentScheme = {
    id: `scheme-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || newId()}`, label, historicalLabel: null,
    category: input.installmentCount ? "installment" : "cash", paymentCode: input.paymentCode ?? null,
    paymentCodeByTier: input.paymentCodeByTier ?? {}, applicableTiers: input.applicableTiers ?? [],
    reservationCentavos: input.reservationCentavos ?? null, installmentCount: input.installmentCount ?? null,
    installmentCentavosByTier: input.installmentCentavosByTier ?? {}, priceCentavosByTier: input.priceCentavosByTier ?? {},
    ...(input.installmentCountByTier ? { installmentCountByTier: input.installmentCountByTier } : {}),
    ...(input.downPaymentBasisPoints ? { downPaymentBasisPoints: input.downPaymentBasisPoints } : {}),
    commercialStatus: "pending_owner_decision", source: "Configured by an authorized Admin.", availability: "unavailable",
    configVersion: 1, effectiveDate: today(), changes: [changeEntry(actor, 1, "Created", "created")],
  };
  const problems = schemeTermErrors(scheme, await loadProducts());
  if (problems.length > 0) throw invalid(problems[0]);
  scheme.commercialStatus = schemeTermsComplete(scheme) ? "configured" : "pending_owner_decision";
  if (scheme.commercialStatus === "configured") scheme.availability = input.availability ?? "available";
  const rowId = newId();
  await transact(actor, {
    variableDefinitions: "$d: PaymentScheme_Data!",
    fields: "scheme: paymentScheme_insert(data: $d)",
    variables: { d: { id: rowId, key: scheme.id, sortOrder: schemes.length + 1, ...schemeColumns(scheme) } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SCHEME_CREATED, entityType: "payment-scheme", entityId: scheme.id, details: { module: "vip-products", newValue: scheme.commercialStatus } }],
  });
  return schemeByKey(scheme.id);
}

export async function updateScheme(actor: Actor, id: string, input: PaymentSchemeInput, reason: string): Promise<PaymentScheme> {
  requireOperation(actor, "vip-products.manage");
  const text = reason.trim();
  if (!text) throw invalid("A reason or approval reference is required for a configuration change.", { reason: "A reason or approval reference is required." });
  const row = await loadSchemeRow(id);
  if (!row) throw notFound("Payment plan");
  const current = schemeFromRow(row);
  const changed = (Object.keys(input) as Array<keyof PaymentSchemeInput>).filter((key) => input[key] !== undefined && JSON.stringify(input[key]) !== JSON.stringify(current[key]));
  if (changed.length === 0) return current;
  const next: PaymentScheme = { ...current, ...input };
  if (input.installmentCount && next.category === "cash") next.category = "installment";
  const problems = schemeTermErrors(next, await loadProducts());
  if (problems.length > 0) throw invalid(problems[0]);
  next.commercialStatus = schemeTermsComplete(next) ? "configured" : "pending_owner_decision";
  if (next.commercialStatus !== "configured") next.availability = "unavailable";
  next.configVersion = row.configVersion + 1;
  next.effectiveDate = today();
  next.changes = [...current.changes, changeEntry(actor, next.configVersion, text, changed.join(", "))];
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $d: PaymentScheme_Data!",
    fields: "scheme: paymentScheme_update(id: $id, data: $d)",
    variables: { id: row.id, d: schemeColumns(next) },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SCHEME_UPDATED, entityType: "payment-scheme", entityId: id, details: { module: "vip-products", previousValue: current.commercialStatus, newValue: next.commercialStatus, reason: text } }],
  });
  return schemeByKey(id);
}


