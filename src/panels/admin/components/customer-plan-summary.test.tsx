import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanFacts, PlanSummary } from "./customer-plan-summary";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { formatPeso, pesos } from "@/shared/lib/money";

afterEach(() => cleanup());

const WARNING =
  "Price under review: the contract sources disagree. Contract finalization stays on hold until the owner decides.";

const gold: VipProduct = {
  code: "G1",
  name: "Gold VIP",
  tier: "Gold",
  priceCentavos: pesos(390000),
  priceStatus: "contract_stated",
  priceNote: "Resolved by owner ruling effective 2026-11-10: ₱390,000 catalog price (Spot Cash and Move A ₱312,000; 4-Month Installment and Move B ₱390,000).",
  validityYears: 22,
  earningCycles: 20,
  vipDiscountPercent: 25,
  lifetimePoints: 500000,
  pointsPerCycle: 25000,
  weekdayPointsPerCycle: 17500,
  weekendPointsPerCycle: 7500,
  minSpendPerCycleCentavos: pesos(3000),
  supplementaryHolders: 1,
  status: "active",
  configVersion: 1,
  effectiveDate: null,
  changes: [],
};

const bronze: VipProduct = {
  ...gold,
  code: "B1",
  name: "Bronze VIP",
  tier: "Bronze",
  priceCentavos: pesos(72000),
  priceStatus: "contract_stated",
  priceNote: "Stated in the Bronze VIP Grant Contract.",
  validityYears: 7,
  earningCycles: 5,
  vipDiscountPercent: 15,
  lifetimePoints: 50000,
  pointsPerCycle: 10000,
  weekdayPointsPerCycle: 7000,
  weekendPointsPerCycle: 3000,
  minSpendPerCycleCentavos: pesos(1000),
  supplementaryHolders: 0,
};

const silver: VipProduct = {
  ...gold,
  code: "S1",
  name: "Silver VIP",
  tier: "Silver",
  priceCentavos: pesos(240000),
  priceStatus: "contract_stated",
  priceNote: "Stated in Section II and Annex A.",
  validityYears: 12,
  earningCycles: 10,
  vipDiscountPercent: 20,
  lifetimePoints: 200000,
  pointsPerCycle: 20000,
  weekdayPointsPerCycle: 14000,
  weekendPointsPerCycle: 6000,
  minSpendPerCycleCentavos: pesos(2000),
  supplementaryHolders: 0,
};

function makeScheme(
  id: string,
  label: string,
  category: PaymentScheme["category"],
  priceCentavosByTier: PaymentScheme["priceCentavosByTier"],
): PaymentScheme {
  return {
    id,
    label,
    historicalLabel: null,
    category,
    paymentCode: null,
    applicableTiers: ["B1", "S1", "G1"],
    reservationCentavos: pesos(10000),
    installmentCount: category === "cash" ? null : 4,
    installmentCentavosByTier: {},
    priceCentavosByTier,
    commercialStatus: "configured",
    source: "test",
    availability: "available",
    ownerHold: null,
    configVersion: 1,
    effectiveDate: null,
    changes: [],
  };
}

const spotCash = () =>
  makeScheme("scheme-spot-cash", "Spot Cash", "cash", { B1: pesos(54000), S1: pesos(192000), G1: pesos(312000) });
const moveA = () =>
  makeScheme("scheme-move-a", "Move A", "move", { B1: pesos(54000), S1: pesos(192000), G1: pesos(312000) });
const installment = () => makeScheme("scheme-installment-4m", "4-Month Installment", "installment", {});
const moveB = () => makeScheme("scheme-move-b", "Move B", "move", {});

describe("PlanFacts scheme-aware headline and conflict note", () => {
  it("Gold with no scheme headlines the catalog price with no warning", () => {
    render(<PlanFacts product={gold} />);
    expect(screen.getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it("Gold with Spot Cash headlines ₱312,000 with no warning", () => {
    render(<PlanFacts product={gold} scheme={spotCash()} />);
    expect(screen.getByText(formatPeso(pesos(312000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it("Gold with Move A headlines ₱312,000 with no warning", () => {
    render(<PlanFacts product={gold} scheme={moveA()} />);
    expect(screen.getByText(formatPeso(pesos(312000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it("Gold on installment headlines the catalog price with no warning", () => {
    render(<PlanFacts product={gold} scheme={installment()} />);
    expect(screen.getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it("Gold with Move B headlines the catalog price with no warning", () => {
    render(<PlanFacts product={gold} scheme={moveB()} />);
    expect(screen.getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });

  it("renders the icon fact grid with validity, points, discount and supplementary labels", () => {
    render(<PlanFacts product={gold} />);
    expect(screen.getByText("22 years")).toBeInTheDocument();
    expect(screen.getByText("Validity")).toBeInTheDocument();
    expect(screen.getByText("500,000")).toBeInTheDocument();
    expect(screen.getByText("Stay points")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("VIP discount")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Supplementary")).toBeInTheDocument();
  });

  it("shows the Payment scheme caption above the selected scheme row, and none without a scheme", () => {
    render(<PlanFacts product={gold} scheme={spotCash()} />);
    expect(screen.getByText("Payment scheme")).toBeInTheDocument();
    expect(screen.getByText("Spot Cash")).toBeInTheDocument();
    cleanup();
    render(<PlanFacts product={gold} />);
    expect(screen.queryByText("Payment scheme")).toBeNull();
  });

  it("still warns for a synthetic catalog conflict, even on a scheme without its own price", () => {
    const conflictGold = { ...gold, priceStatus: "conflict" as const };
    render(<PlanFacts product={conflictGold} scheme={installment()} />);
    expect(screen.getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(screen.getByText(WARNING)).toBeDefined();
    cleanup();
    render(<PlanFacts product={conflictGold} />);
    expect(screen.getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(screen.getByText(WARNING)).toBeDefined();
  });

  it("Bronze and Silver never warn, with or without a scheme", () => {
    render(<PlanFacts product={bronze} />);
    expect(screen.getByText(formatPeso(pesos(72000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
    cleanup();

    render(<PlanFacts product={bronze} scheme={spotCash()} />);
    expect(screen.getByText(formatPeso(pesos(54000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
    cleanup();

    render(<PlanFacts product={silver} />);
    expect(screen.getByText(formatPeso(pesos(240000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
    cleanup();

    render(<PlanFacts product={silver} scheme={installment()} />);
    expect(screen.getByText(formatPeso(pesos(240000)))).toBeDefined();
    expect(screen.queryByText(WARNING)).toBeNull();
  });
});

describe("PlanSummary scheme pass-through", () => {
  it("shows the Spot Cash price without warning on desktop, in the bar, and in the Details sheet", async () => {
    const user = userEvent.setup();
    render(<PlanSummary product={gold} scheme={spotCash()} onChange={() => {}} />);

    const aside = screen.getByRole("complementary", { name: "Selected VIP card" });
    expect(within(aside).getByText(formatPeso(pesos(312000)))).toBeDefined();
    expect(within(aside).queryByText(WARNING)).toBeNull();
    expect(screen.getByText(`${formatPeso(pesos(312000))} · Spot Cash`)).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(formatPeso(pesos(312000)))).toBeDefined();
    expect(within(dialog).queryByText(WARNING)).toBeNull();
  });

  it("shows the Gold catalog price without a scheme and without warning", () => {
    render(<PlanSummary product={gold} onChange={() => {}} />);
    const aside = screen.getByRole("complementary", { name: "Selected VIP card" });
    expect(within(aside).getByText(formatPeso(pesos(390000)))).toBeDefined();
    expect(within(aside).queryByText(WARNING)).toBeNull();
  });

  it("shows no warning for Gold on installment and Move B", () => {
    for (const current of [installment(), moveB()]) {
      cleanup();
      render(<PlanSummary product={gold} scheme={current} onChange={() => {}} />);
      const aside = screen.getByRole("complementary", { name: "Selected VIP card" });
      expect(within(aside).getByText(formatPeso(pesos(390000)))).toBeDefined();
      expect(within(aside).queryByText(WARNING)).toBeNull();
    }
  });

  it("renders the tier as a pill, the facts grid, the scheme caption, and a pencil Change card button", async () => {
    const user = userEvent.setup();
    render(<PlanSummary product={gold} scheme={spotCash()} onChange={() => {}} />);

    const aside = screen.getByRole("complementary", { name: "Selected VIP card" });
    expect(within(aside).getByText("Gold tier")).toBeInTheDocument();
    expect(within(aside).getByText("Validity")).toBeInTheDocument();
    expect(within(aside).getByText("Stay points")).toBeInTheDocument();
    expect(within(aside).getByText("VIP discount")).toBeInTheDocument();
    expect(within(aside).getByText("Supplementary")).toBeInTheDocument();
    expect(within(aside).getByText("Payment scheme")).toBeInTheDocument();
    expect(within(aside).getByText("Spot Cash")).toBeInTheDocument();
    const change = within(aside).getByRole("button", { name: "Change card" });
    expect(change.querySelector("svg")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Gold tier")).toBeInTheDocument();
    const dialogChange = within(dialog).getByRole("button", { name: "Change card" });
    expect(dialogChange.querySelector("svg")).not.toBeNull();
  });
});
