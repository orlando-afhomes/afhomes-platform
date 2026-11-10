import { describe, expect, it } from "vitest";
import { applicablePriceStatus, displayPriceFor, fromPriceFor } from "./pricing";

const CENTAVOS = 100;
const peso = (amount: number) => amount * CENTAVOS;

const bronze = { code: "B1" as const, priceCentavos: peso(72000), priceStatus: "contract_stated" as const };
const silver = { code: "S1" as const, priceCentavos: peso(240000), priceStatus: "contract_stated" as const };
const gold = { code: "G1" as const, priceCentavos: peso(390000), priceStatus: "contract_stated" as const };

// Mirrors the four seed payment schemes in src/data/mock/seed-data.ts.
const seedSchemes = [
  { id: "scheme-spot-cash", availability: "available" as const, applicableTiers: ["B1", "S1", "G1"] as ("B1" | "S1" | "G1")[], priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) } },
  { id: "scheme-installment-4m", availability: "available" as const, applicableTiers: ["B1", "S1", "G1"] as ("B1" | "S1" | "G1")[], priceCentavosByTier: {} },
  { id: "scheme-move-a", availability: "available" as const, applicableTiers: ["B1", "S1", "G1"] as ("B1" | "S1" | "G1")[], priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) } },
  { id: "scheme-move-b", availability: "available" as const, applicableTiers: ["B1", "S1", "G1"] as ("B1" | "S1" | "G1")[], priceCentavosByTier: {} },
];
const byId = (id: string) => seedSchemes.find((scheme) => scheme.id === id)!;

describe("vip pricing", () => {
  it("displayPriceFor uses the scheme own price when set and the catalog price otherwise", () => {
    expect(displayPriceFor(gold, byId("scheme-spot-cash"))).toBe(peso(312000));
    expect(displayPriceFor(gold, byId("scheme-installment-4m"))).toBe(peso(390000));
    expect(displayPriceFor(bronze, byId("scheme-move-a"))).toBe(peso(54000));
    expect(displayPriceFor(silver, byId("scheme-move-b"))).toBe(peso(240000));
  });

  it("displayPriceFor falls back to the catalog price without a scheme", () => {
    expect(displayPriceFor(gold)).toBe(peso(390000));
    expect(displayPriceFor(gold, undefined)).toBe(peso(390000));
    expect(displayPriceFor(gold, null)).toBe(peso(390000));
  });

  it("fromPriceFor takes the minimum across the available seed schemes", () => {
    expect(fromPriceFor(gold, seedSchemes)).toBe(peso(312000));
    expect(fromPriceFor(bronze, seedSchemes)).toBe(peso(54000));
    expect(fromPriceFor(silver, seedSchemes)).toBe(peso(192000));
  });

  it("fromPriceFor falls back to the catalog price when no available scheme applies", () => {
    const unavailable = seedSchemes.map((scheme) => ({ ...scheme, availability: "unavailable" as const }));
    expect(fromPriceFor(gold, unavailable)).toBe(peso(390000));
    expect(fromPriceFor(gold, [])).toBe(peso(390000));
    const otherTiers = seedSchemes.map((scheme) => ({ ...scheme, applicableTiers: ["B1"] as ("B1" | "S1" | "G1")[] }));
    expect(fromPriceFor(gold, otherTiers)).toBe(peso(390000));
  });

  it("applicablePriceStatus reports contract_stated for Gold under Spot Cash and Move A", () => {
    expect(applicablePriceStatus(gold, byId("scheme-spot-cash"))).toBe("contract_stated");
    expect(applicablePriceStatus(gold, byId("scheme-move-a"))).toBe("contract_stated");
  });

  it("applicablePriceStatus reports contract_stated for resolved Gold under all schemes and without one", () => {
    expect(applicablePriceStatus(gold, byId("scheme-spot-cash"))).toBe("contract_stated");
    expect(applicablePriceStatus(gold, byId("scheme-installment-4m"))).toBe("contract_stated");
    expect(applicablePriceStatus(gold, byId("scheme-move-a"))).toBe("contract_stated");
    expect(applicablePriceStatus(gold, byId("scheme-move-b"))).toBe("contract_stated");
    expect(applicablePriceStatus(gold)).toBe("contract_stated");
    expect(applicablePriceStatus(gold, null)).toBe("contract_stated");
  });

  it("applicablePriceStatus keeps a catalog conflict except where a scheme states its own price", () => {
    const conflicted = { ...gold, priceStatus: "conflict" as const };
    expect(applicablePriceStatus(conflicted, byId("scheme-installment-4m"))).toBe("conflict");
    expect(applicablePriceStatus(conflicted, byId("scheme-move-b"))).toBe("conflict");
    expect(applicablePriceStatus(conflicted)).toBe("conflict");
    expect(applicablePriceStatus(conflicted, null)).toBe("conflict");
    expect(applicablePriceStatus(conflicted, byId("scheme-spot-cash"))).toBe("contract_stated");
    expect(applicablePriceStatus(conflicted, byId("scheme-move-a"))).toBe("contract_stated");
  });

  it("applicablePriceStatus stays contract_stated for Bronze and Silver under any scheme", () => {
    for (const scheme of seedSchemes) {
      expect(applicablePriceStatus(bronze, scheme)).toBe("contract_stated");
      expect(applicablePriceStatus(silver, scheme)).toBe("contract_stated");
    }
    expect(applicablePriceStatus(bronze)).toBe("contract_stated");
    expect(applicablePriceStatus(silver)).toBe("contract_stated");
  });
});
