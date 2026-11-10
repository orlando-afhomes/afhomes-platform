import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { VipCardChoiceGrid } from "./vip-card-choice";

const peso = (amount: number) => amount * 100;

function product(overrides: Partial<VipProduct> & Pick<VipProduct, "code" | "name" | "tier" | "priceCentavos" | "priceStatus">): VipProduct {
  return {
    priceNote: null,
    validityYears: 7,
    earningCycles: 5,
    vipDiscountPercent: 15,
    lifetimePoints: 50_000,
    pointsPerCycle: 10_000,
    weekdayPointsPerCycle: 7_000,
    weekendPointsPerCycle: 3_000,
    minSpendPerCycleCentavos: peso(1_000),
    supplementaryHolders: 0,
    status: "active",
    configVersion: 1,
    effectiveDate: null,
    changes: [],
    ...overrides,
  };
}

const products: VipProduct[] = [
  product({ code: "B1", name: "Bronze VIP", tier: "Bronze", priceCentavos: peso(72_000), priceStatus: "contract_stated" }),
  product({ code: "S1", name: "Silver VIP", tier: "Silver", priceCentavos: peso(240_000), priceStatus: "contract_stated" }),
  product({ code: "G1", name: "Gold VIP", tier: "Gold", priceCentavos: peso(390_000), priceStatus: "conflict" }),
];

function scheme(overrides: Partial<PaymentScheme> & Pick<PaymentScheme, "id" | "availability" | "priceCentavosByTier">): PaymentScheme {
  return {
    label: overrides.id,
    historicalLabel: null,
    category: "cash",
    paymentCode: "C01",
    applicableTiers: ["B1", "S1", "G1"],
    reservationCentavos: peso(10_000),
    installmentCount: null,
    installmentCentavosByTier: {},
    commercialStatus: "configured",
    source: "test",
    configVersion: 1,
    effectiveDate: null,
    changes: [],
    ...overrides,
  };
}

const schemes: PaymentScheme[] = [
  scheme({ id: "scheme-spot-cash", availability: "available", priceCentavosByTier: { B1: peso(54_000), S1: peso(192_000), G1: peso(312_000) } }),
  scheme({ id: "scheme-installment-4m", availability: "available", priceCentavosByTier: {} }),
  // Lower than every available price, but unavailable so it must never set the headline.
  scheme({ id: "scheme-draft", availability: "unavailable", priceCentavosByTier: { B1: peso(1_000), S1: peso(1_000), G1: peso(1_000) } }),
];

afterEach(cleanup);

describe("VipCardChoiceGrid from-prices", () => {
  it("shows the minimum available-scheme price with a From prefix", () => {
    render(<VipCardChoiceGrid products={products} schemes={schemes} value="" onChange={() => {}} />);
    expect(screen.getByText(/From ₱54,000/)).toBeInTheDocument();
    expect(screen.getByText(/From ₱192,000/)).toBeInTheDocument();
    expect(screen.getByText(/From ₱312,000/)).toBeInTheDocument();
  });

  it("shows no conflict warning on the card grid regardless of priceStatus", () => {
    render(<VipCardChoiceGrid products={products} schemes={schemes} value="" onChange={() => {}} />);
    expect(screen.queryByText(/Price under review/)).toBeNull();
    expect(screen.queryByText(/contract sources disagree/)).toBeNull();
  });

  it("falls back to the catalog price without a From prefix when schemes are absent", () => {
    render(<VipCardChoiceGrid products={products} value="" onChange={() => {}} />);
    expect(screen.queryByText(/From/)).toBeNull();
    expect(screen.getByText(/₱72,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱240,000/)).toBeInTheDocument();
    expect(screen.getByText(/₱390,000/)).toBeInTheDocument();
  });

  it("falls back to the catalog price without a From prefix when schemes are empty", () => {
    render(<VipCardChoiceGrid products={products} schemes={[]} value="" onChange={() => {}} />);
    expect(screen.queryByText(/From/)).toBeNull();
    expect(screen.getByText(/₱72,000/)).toBeInTheDocument();
  });
});
