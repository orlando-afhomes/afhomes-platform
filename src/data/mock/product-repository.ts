import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentSchemeInput, ProductRepository, ProductUpdateInput } from "@/data/contracts/product-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { DevIdentity } from "@/modules/identity/types";
import { installmentCountFor, schemeTermErrors } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import { BusinessRepository, today } from "./business-base";
import { nextId } from "./ids";
import type { MockStore } from "./seed";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Scheme terms are complete only when every documented field for its category is present. */
function termsComplete(scheme: PaymentScheme): boolean {
  if (scheme.ownerHold) return false;
  // A Move scheme's Card ID code is an open owner decision (06 section 6.3): it is enforced at membership
  // activation, not at configuration, so approved Move terms stay available.
  if ((scheme.category !== "move" && !scheme.paymentCode) || scheme.applicableTiers.length === 0) return false;
  if (scheme.category === "cash") return true;
  return scheme.applicableTiers.every((tier) => (installmentCountFor(scheme, tier) ?? 0) > 0 && (scheme.installmentCentavosByTier[tier] ?? 0) > 0);
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
      if (!Number.isInteger(next.priceCentavos) || next.priceCentavos <= 0) throw new Error("The price must be a positive amount.");
      if (next.weekdayPointsPerCycle + next.weekendPointsPerCycle !== next.pointsPerCycle) throw new Error("Weekday and weekend points must add up to the points per cycle.");
      if (next.pointsPerCycle * next.earningCycles !== next.lifetimePoints) throw new Error("Lifetime points must equal points per cycle times earning cycles.");
      if (next.earningCycles > next.validityYears) throw new Error("Earning cycles cannot exceed the validity years.");
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
