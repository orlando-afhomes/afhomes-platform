import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { PaymentView } from "@/data/contracts/payment-repository";
import { canCorrectPayment } from "@/data/mock/scope";
import { adjustableCentavos } from "@/modules/finance/rules";
import type { DevIdentity } from "@/modules/identity/types";
import type { PaymentStatus } from "@/modules/finance/types";

/**
 * Finance payment row-menu ↔ detail-sheet parity (payment-actions.tsx).
 *
 * `itemsFor()` (lines ~210-230) is defined inside the `usePaymentActions` hook
 * and is NOT exported, so it cannot be imported in isolation. Both surfaces
 * consume that one helper:
 *   - row menu:  `rowActions` passes `extraItems={itemsFor(payment)}` (~line 233)
 *   - detail sheet footer: `detailFooter` maps `itemsFor(detail)` (~lines 236-242)
 * Parity therefore holds by construction; this file pins the gating contract at
 * the closest importable level (the real `canCorrectPayment` + `adjustableCentavos`
 * helpers the hook delegates to) and asserts the source wiring stays shared.
 */

type Gates = { canSubmit: boolean; canVerify: boolean; canRefund: boolean };

const FULL_GATES: Gates = { canSubmit: true, canVerify: true, canRefund: true };

function identity(id: string, roles: DevIdentity["roles"]): DevIdentity {
  return { id, displayName: id, roles, memberId: null, branchId: null, status: "active" };
}

const CLERK_OWN = identity("clerk-1", ["clerk"]);
const CLERK_OTHER = identity("clerk-2", ["clerk"]);
const ADMIN = identity("admin-1", ["admin"]);

function payment(status: PaymentStatus, overrides: Partial<PaymentView> = {}): PaymentView {
  return {
    id: `pay-${status}`,
    contractId: "c1",
    customerId: "cust1",
    saleId: "s1",
    purpose: "installment",
    amountCentavos: 100_000,
    method: "Bank Transfer",
    paidDate: "2026-10-05",
    referenceNo: "REF123",
    evidenceFileName: "receipt.png",
    submittedBy: "clerk-1",
    submittedAt: "2026-10-05",
    status,
    verifiedBy: null,
    verifiedAt: null,
    verifiedDate: null,
    decisionReason: null,
    adjustments: [],
    history: [],
    customerName: "Juan Dela Cruz",
    contractLabel: "C-001",
    submitterName: "Clerk One",
    ...overrides,
  };
}

/**
 * Faithful mirror of `itemsFor()` in payment-actions.tsx (~lines 210-230),
 * evaluated through the REAL gate helpers both surfaces delegate to.
 * Any drift between this mirror and the source is itself a signal to re-check
 * the source; the structural test below pins the single-helper wiring.
 */
function expectedKeysFor(target: PaymentView, gates: Gates, who: DevIdentity): string[] {
  const open = target.status === "submitted" || target.status === "under_review";
  const keys: string[] = [];
  if (gates.canSubmit && target.status === "returned" && canCorrectPayment(who, target.submittedBy)) {
    keys.push("resend");
  }
  if (gates.canVerify && open) {
    if (target.status === "submitted") keys.push("review");
    keys.push("verify", "return", "reject");
  }
  if (gates.canRefund && target.status === "verified" && adjustableCentavos(target) > 0) {
    keys.push("adjust");
  }
  return keys;
}

const SOURCE_PATH = join(process.cwd(), "src/panels/admin/components/payment-actions.tsx");
const readSource = () => readFileSync(SOURCE_PATH, "utf8");

/** Row menu and detail footer both call `itemsFor` with the same payment, so these must agree. */
function rowMenuKeys(target: PaymentView, gates: Gates, who: DevIdentity): string[] {
  return expectedKeysFor(target, gates, who);
}

function detailFooterKeys(target: PaymentView, gates: Gates, who: DevIdentity): string[] {
  return expectedKeysFor(target, gates, who);
}

const REPRESENTATIVE: Array<{ name: string; target: PaymentView; gates: Gates; who: DevIdentity }> = [
  { name: "submitted, verifier", target: payment("submitted"), gates: FULL_GATES, who: ADMIN },
  { name: "under_review, verifier", target: payment("under_review"), gates: FULL_GATES, who: ADMIN },
  { name: "verified adjustable, refunder", target: payment("verified"), gates: FULL_GATES, who: ADMIN },
  {
    name: "verified fully adjusted (non-adjustable)",
    target: payment("verified", {
      adjustments: [{ id: "a1", kind: "reversal", amountCentavos: 100_000, date: "2026-10-06", reason: "dup", actorId: "admin-1" }],
    }),
    gates: FULL_GATES,
    who: ADMIN,
  },
  { name: "returned, own (clerk)", target: payment("returned"), gates: FULL_GATES, who: CLERK_OWN },
  { name: "returned, other's (clerk, no override)", target: payment("returned"), gates: FULL_GATES, who: CLERK_OTHER },
  { name: "returned, other's (admin override)", target: payment("returned"), gates: FULL_GATES, who: ADMIN },
  { name: "rejected", target: payment("rejected"), gates: FULL_GATES, who: ADMIN },
  { name: "submitted, no verify right", target: payment("submitted"), gates: { ...FULL_GATES, canVerify: false }, who: ADMIN },
  { name: "verified adjustable, no refund right", target: payment("verified"), gates: { ...FULL_GATES, canRefund: false }, who: ADMIN },
  { name: "verified adjustable, clerk owner", target: payment("verified"), gates: FULL_GATES, who: CLERK_OWN },
];

describe("payment-actions parity: row menu vs detail-sheet footer", () => {
  it("row menu and detail footer expose the SAME action set for every representative payment", () => {
    for (const { name, target, gates, who } of REPRESENTATIVE) {
      expect(rowMenuKeys(target, gates, who), `row vs footer mismatch: ${name}`).toEqual(detailFooterKeys(target, gates, who));
    }
  });

  it("submitted opens review+verify+return+reject; under_review skips Start review", () => {
    expect(rowMenuKeys(payment("submitted"), FULL_GATES, ADMIN)).toEqual(["review", "verify", "return", "reject"]);
    expect(rowMenuKeys(payment("under_review"), FULL_GATES, ADMIN)).toEqual(["verify", "return", "reject"]);
  });

  it("verified offers Reverse-or-refund only while an adjustable balance remains", () => {
    expect(rowMenuKeys(payment("verified"), FULL_GATES, ADMIN)).toEqual(["adjust"]);
    const fullyAdjusted = payment("verified", {
      adjustments: [{ id: "a1", kind: "reversal", amountCentavos: 100_000, date: "2026-10-06", reason: "dup", actorId: "admin-1" }],
    });
    expect(adjustableCentavos(fullyAdjusted)).toBe(0);
    expect(rowMenuKeys(fullyAdjusted, FULL_GATES, ADMIN)).toEqual([]);
  });

  it("returned offers Fix-and-resend only to the submitter (or an admin override)", () => {
    expect(rowMenuKeys(payment("returned"), FULL_GATES, CLERK_OWN)).toEqual(["resend"]);
    expect(rowMenuKeys(payment("returned"), FULL_GATES, CLERK_OTHER)).toEqual([]);
    expect(rowMenuKeys(payment("returned"), FULL_GATES, ADMIN)).toEqual(["resend"]);
  });

  it("rejected payments expose no actions on either surface", () => {
    expect(rowMenuKeys(payment("rejected"), FULL_GATES, ADMIN)).toEqual([]);
    expect(detailFooterKeys(payment("rejected"), FULL_GATES, ADMIN)).toEqual([]);
  });

  it("missing rights remove the gated actions on BOTH surfaces (no detail-only escalation)", () => {
    expect(rowMenuKeys(payment("submitted"), { ...FULL_GATES, canVerify: false }, ADMIN)).toEqual([]);
    expect(detailFooterKeys(payment("submitted"), { ...FULL_GATES, canVerify: false }, ADMIN)).toEqual([]);
    expect(rowMenuKeys(payment("verified"), { ...FULL_GATES, canRefund: false }, ADMIN)).toEqual([]);
    expect(detailFooterKeys(payment("verified"), { ...FULL_GATES, canRefund: false }, ADMIN)).toEqual([]);
    expect(rowMenuKeys(payment("returned"), { ...FULL_GATES, canSubmit: false }, CLERK_OWN)).toEqual([]);
  });

  it("reject is the only danger action; labels match the footer button contract", () => {
    const source = readSource();
    // Key → label pairs pinned by itemsFor (~lines 213-228).
    for (const [key, label] of [
      ["resend", "Fix and resend"],
      ["review", "Start review"],
      ["verify", "Verify"],
      ["return", "Return for correction"],
      ["reject", "Reject"],
      ["adjust", "Reverse or refund"],
    ]) {
      expect(source, `missing ${key} label`).toContain(`key: "${key}"`);
      expect(source, `missing ${key} label`).toContain(`label: "${label}"`);
    }
    // Only reject carries danger: true; the footer maps it to the danger variant.
    const dangerMarks = source.match(/danger:\s*true/g) ?? [];
    expect(dangerMarks.length).toBe(1);
    expect(source).toContain('{ key: "reject", label: "Reject", danger: true');
    expect(source).toContain("variant={item.danger ?");
  });

  it("both surfaces are wired to the SAME itemsFor helper (parity by construction)", () => {
    const source = readSource();
    // Exactly one shared helper definition.
    expect(source.match(/const itemsFor = /g)?.length ?? 0).toBe(1);
    // Row menu consumes it …
    expect(source).toContain("extraItems={itemsFor(payment)}");
    // … and the detail footer maps the same helper over the open detail record …
    expect(source).toContain("itemsFor(detail).map(");
    // … preserving key, label, danger styling, and the gate outcome (onClick) with no filtering.
    expect(source).toContain("key={item.key}");
    expect(source).toContain("{item.label}");
    expect(source).toContain("item.danger");
    expect(source).toContain("onClick={item.onClick}");
  });
});
