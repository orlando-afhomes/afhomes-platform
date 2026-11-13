import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentSchemeInput, ProductCreateInput, ProductRepository, ProductUpdateInput } from "@/data/contracts/product-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { installmentCountFor, schemeTermErrors } from "@/modules/vip/rules";
import { isValidTierCode, NON_ACTIVE_TIER_CODES, type PaymentScheme, type VipProduct, type VipTierCode } from "@/modules/vip/types";
import { BusinessRepository, today } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Resolves the Card ID payment code for a tier: per-tier entry, else the single code. */
// TODO: replace with paymentCodeFor from "@/modules/vip/rules" once the sibling worker lands it.
function paymentCodeFor(scheme: Pick<PaymentScheme, "paymentCode" | "paymentCodeByTier">, tier: VipTierCode): string | null {
  return scheme.paymentCodeByTier?.[tier] ?? scheme.paymentCode;
}

/** Scheme terms are complete only when every documented field for its category is present. */
function termsComplete(scheme: PaymentScheme): boolean {
  if (scheme.ownerHold) return false;
  if (scheme.applicableTiers.length === 0) return false;
  // Card ID payment code (06 section 6.3) must resolve for every applicable tier via the
  // single code or a per-tier entry; schemes without full tier coverage stay pending.
  if (!scheme.applicableTiers.every((tier) => paymentCodeFor(scheme, tier))) return false;
  if (scheme.category === "cash") return true;
  return scheme.applicableTiers.every((tier) => (installmentCountFor(scheme, tier) ?? 0) > 0 && (scheme.installmentCentavosByTier[tier] ?? 0) > 0);
}

function productTermErrors(next: VipProduct): string | null {
  if (!Number.isInteger(next.priceCentavos) || next.priceCentavos <= 0) return "The price must be a positive amount.";
  if (next.weekdayPointsPerCycle + next.weekendPointsPerCycle !== next.pointsPerCycle) return "Weekday and weekend points must add up to the points per cycle.";
  if (next.pointsPerCycle * next.earningCycles !== next.lifetimePoints) return "Lifetime points must equal points per cycle times earning cycles.";
  if (next.earningCycles > next.validityYears) return "Earning cycles cannot exceed the validity years.";
  return null;
}

export class MockProductRepository extends BusinessRepository implements ProductRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  async list(options?: MockAsyncOptions): Promise<VipProduct[]> {
    return this.run(options, () => clone(this.store.products));
  }

  async listSchemes(options?: MockAsyncOptions): Promise<PaymentScheme[]> {
    return this.run(options, () => clone(this.store.paymentSchemes));
  }

  async update(code: VipTierCode, input: ProductUpdateInput, reason: string, options?: MockAsyncOptions): Promise<VipProduct> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", "Managing VIP products is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason or approval reference is required for a configuration change.");
      const product = this.store.products.find((item) => item.code === code);
      if (!product) throw new Error("Product not found.");
      const next = { ...product, ...input } as VipProduct;
      const invalidTerms = productTermErrors(next);
      if (invalidTerms) throw new Error(invalidTerms);
      const changed = (Object.keys(input) as Array<keyof ProductUpdateInput>).filter((key) => input[key] !== undefined && input[key] !== product[key]);
      if (changed.length === 0) throw new Error("Nothing was changed.");
      if (input.priceStatus !== undefined && input.priceStatus !== "contract_stated" && input.priceStatus !== "conflict") throw new Error("The price status must be contract_stated or conflict.");
      const priceChanged = changed.includes("priceCentavos");
      const statusChanged = changed.includes("priceStatus");
      const retired = changed.includes("status") && next.status === "retired";
      Object.assign(product, next, {
        configVersion: product.configVersion + 1,
        effectiveDate: today(),
        priceStatus: statusChanged ? next.priceStatus : product.priceStatus,
        priceNote: priceChanged || statusChanged ? `Updated in configuration version ${product.configVersion + 1}: ${reason.trim()}` : product.priceNote,
      });
      product.changes.push({ version: product.configVersion, date: today(), actorId: identity.id, reason: reason.trim(), summary: changed.join(", ") });
      this.audit(identity, {
        module: "vip-products",
        action: retired ? BUSINESS_AUDIT_ACTIONS.PRODUCT_RETIRED : BUSINESS_AUDIT_ACTIONS.PRODUCT_UPDATED,
        entityType: "product",
        entityId: product.code,
        previousValue: `v${product.configVersion - 1}`,
        newValue: `v${product.configVersion}`,
        reason: reason.trim(),
      });
      return clone(product);
    });
  }

  /** Why a product cannot be deleted: every kind of record that still references its code. */
  private usageReason(code: string): string | null {
    const { store } = this;
    const uses: Array<[number, string]> = [
      [store.contracts.filter((item) => item.productCode === code).length, "contract"],
      [store.sales.filter((item) => item.productCode === code).length, "sale"],
      [store.memberships.filter((item) => item.productCode === code).length, "membership"],
      [store.customers.filter((item) => item.vipPlan === code).length, "customer plan"],
      [store.paymentSchemes.filter((item) => item.applicableTiers.includes(code) || code in item.priceCentavosByTier || code in item.installmentCentavosByTier).length, "payment scheme"],
      [store.members.filter((item) => item.sellerProfile?.vipCardLevel === code).length, "seller profile"],
      [store.registrationApplications.filter((item) => item.completion?.vipCardLevel === code).length, "seller registration"],
    ];
    const used = uses.filter(([count]) => count > 0);
    if (used.length === 0) return null;
    return `Already used by ${used.map(([count, label]) => `${count} ${label}${count === 1 ? "" : "s"}`).join(", ")}. Retire it instead.`;
  }

  async deleteBlockers(options?: MockAsyncOptions): Promise<Record<string, string | null>> {
    return this.run(options, () => Object.fromEntries(this.store.products.map((product) => [product.code, this.usageReason(product.code)])));
  }

  async create(input: ProductCreateInput, reason: string, options?: MockAsyncOptions): Promise<VipProduct> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", "Managing VIP products is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason or approval reference is required for a configuration change.");
      const code = input.code.trim().toUpperCase();
      if (!isValidTierCode(code)) throw new Error("The product code must be exactly 2 characters: one letter and one digit, for example B3.");
      const reserved = NON_ACTIVE_TIER_CODES.find((item) => item.code === code);
      if (reserved) throw new Error(`${code} is a ${reserved.state} tier code and cannot be used.`);
      if (this.store.products.some((item) => item.code === code)) throw new Error("A product with this code already exists.");
      const name = input.name.trim();
      if (!name) throw new Error("A product name is required.");
      if (this.store.products.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new Error("A product with this name already exists.");
      if (!Number.isInteger(input.vipDiscountPercent) || input.vipDiscountPercent < 0 || input.vipDiscountPercent > 100) throw new Error("The VIP discount must be between 0 and 100 percent.");
      if (!Number.isInteger(input.supplementaryHolders) || input.supplementaryHolders < 0) throw new Error("Supplementary holders cannot be negative.");
      const product: VipProduct = {
        code,
        name,
        tier: input.tier,
        priceCentavos: input.priceCentavos,
        priceStatus: "contract_stated",
        priceNote: `Created in configuration version 1: ${reason.trim()}`,
        validityYears: input.validityYears,
        earningCycles: input.earningCycles,
        vipDiscountPercent: input.vipDiscountPercent,
        lifetimePoints: input.lifetimePoints,
        pointsPerCycle: input.pointsPerCycle,
        weekdayPointsPerCycle: input.weekdayPointsPerCycle,
        weekendPointsPerCycle: input.weekendPointsPerCycle,
        minSpendPerCycleCentavos: input.minSpendPerCycleCentavos,
        supplementaryHolders: input.supplementaryHolders,
        status: "active",
        configVersion: 1,
        effectiveDate: today(),
        changes: [{ version: 1, date: today(), actorId: identity.id, reason: reason.trim(), summary: "created" }],
      };
      const invalid = productTermErrors(product);
      if (invalid) throw new Error(invalid);
      this.store.products.push(product);
      this.audit(identity, { module: "vip-products", action: BUSINESS_AUDIT_ACTIONS.PRODUCT_CREATED, entityType: "product", entityId: code, newValue: `v1 ${name}`, reason: reason.trim() });
      return clone(product);
    });
  }

  async delete(code: VipTierCode, reason: string, options?: MockAsyncOptions): Promise<void> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", "Managing VIP products is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason or approval reference is required to delete a product.");
      const index = this.store.products.findIndex((item) => item.code === code);
      if (index < 0) throw new Error("Product not found.");
      const blocked = this.usageReason(code);
      if (blocked) throw new Error(blocked);
      const [removed] = this.store.products.splice(index, 1);
      this.audit(identity, { module: "vip-products", action: BUSINESS_AUDIT_ACTIONS.PRODUCT_DELETED, entityType: "product", entityId: code, previousValue: `v${removed.configVersion} ${removed.name}`, reason: reason.trim() });
    });
  }

  async createScheme(input: PaymentSchemeInput & { label: string }, options?: MockAsyncOptions): Promise<PaymentScheme> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", "Managing payment schemes is not allowed for this identity.");
      const label = input.label.trim();
      if (!label) throw new Error("A scheme name is required.");
      if (this.store.paymentSchemes.some((item) => item.label.toLowerCase() === label.toLowerCase())) throw new Error("A scheme with this name already exists.");
      const scheme: PaymentScheme = {
        id: nextId(this.store, "scheme", "scheme"),
        label,
        historicalLabel: null,
        category: input.installmentCount ? "installment" : "cash",
        paymentCode: input.paymentCode ?? null,
        paymentCodeByTier: input.paymentCodeByTier ?? {},
        applicableTiers: input.applicableTiers ?? [],
        reservationCentavos: input.reservationCentavos ?? null,
        installmentCount: input.installmentCount ?? null,
        installmentCentavosByTier: input.installmentCentavosByTier ?? {},
        priceCentavosByTier: input.priceCentavosByTier ?? {},
        commercialStatus: "pending_owner_decision",
        source: "Configured by an authorized Admin.",
        availability: "unavailable",
        configVersion: 1,
        effectiveDate: today(),
        changes: [{ version: 1, date: today(), actorId: identity.id, reason: "Created", summary: "created" }],
      };
      const invalid = schemeTermErrors(scheme, this.store.products);
      if (invalid.length > 0) throw new Error(invalid[0]);
      scheme.commercialStatus = termsComplete(scheme) ? "configured" : "pending_owner_decision";
      if (scheme.commercialStatus === "configured") scheme.availability = input.availability ?? "available";
      this.store.paymentSchemes.push(scheme);
      this.audit(identity, { module: "vip-products", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SCHEME_CREATED, entityType: "payment-scheme", entityId: scheme.id, newValue: scheme.commercialStatus });
      return clone(scheme);
    });
  }

  async updateScheme(id: string, input: PaymentSchemeInput, reason: string, options?: MockAsyncOptions): Promise<PaymentScheme> {
    return this.run(options, (identity) => {
      this.require(identity, "vip-products.manage", "Managing payment schemes is not allowed for this identity.");
      if (!reason.trim()) throw new Error("A reason or approval reference is required for a configuration change.");
      const scheme = this.store.paymentSchemes.find((item) => item.id === id);
      if (!scheme) throw new Error("Payment scheme not found.");
      const before = scheme.commercialStatus;
      const changed = (Object.keys(input) as Array<keyof PaymentSchemeInput>).filter((key) => input[key] !== undefined && JSON.stringify(input[key]) !== JSON.stringify(scheme[key]));
      if (changed.length === 0) throw new Error("Nothing was changed.");
      const next: PaymentScheme = { ...scheme, ...input };
      // Only a cash scheme becomes an installment scheme by gaining installments; a Move scheme keeps its category.
      if (input.installmentCount && next.category === "cash") next.category = "installment";
      const invalid = schemeTermErrors(next, this.store.products);
      if (invalid.length > 0) throw new Error(invalid[0]);
      Object.assign(scheme, next);
      scheme.commercialStatus = termsComplete(scheme) ? "configured" : "pending_owner_decision";
      if (scheme.commercialStatus !== "configured") scheme.availability = "unavailable";
      scheme.configVersion += 1;
      // Contracts already prepared keep their snapshot; the new version applies from today.
      scheme.effectiveDate = today();
      scheme.changes.push({ version: scheme.configVersion, date: today(), actorId: identity.id, reason: reason.trim(), summary: changed.join(", ") });
      this.audit(identity, {
        module: "vip-products",
        action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SCHEME_UPDATED,
        entityType: "payment-scheme",
        entityId: scheme.id,
        previousValue: before,
        newValue: scheme.commercialStatus,
        reason: reason.trim(),
      });
      return clone(scheme);
    });
  }
}
