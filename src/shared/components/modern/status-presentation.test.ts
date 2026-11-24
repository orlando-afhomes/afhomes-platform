import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { statusPresentation, STATUS_KEYS, type BadgeTone } from "./status-badge";

const TOKENS = readFileSync("src/theme/tokens.css", "utf8");
const HUES = Object.fromEntries([...TOKENS.matchAll(/--badge-([a-z]+):\s*(#[0-9a-fA-F]{6});/g)].map((match) => [match[1], match[2]]));
const ALIAS: Partial<Record<BadgeTone, string>> = { success: "green", warning: "amber", danger: "red", info: "blue", cyan: "teal", burgundy: "pink", rose: "pink" };

const rgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
function hue(hex: string): number {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const luminance = (hex: string) => {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hueOf = (tone: BadgeTone) => HUES[ALIAS[tone] ?? tone];

// Statuses that appear together in one list, table or filter.
const GROUPS: Record<string, string[]> = {
  payment: ["submitted", "under_review", "verified", "rejected", "returned"],
  contract: ["draft", "submitted", "under_review", "returned", "finalized", "cancelled"],
  customer: ["draft", "submitted", "approved", "sent_back", "rejected", "active_member", "inactive"],
  sale: ["pending", "confirmed", "defaulted", "cancelled", "rejected"],
  commission: ["released", "approved", "on_hold", "paid", "cancelled"],
  membership: ["pending", "active", "expired", "cancelled", "suspended"],
  account: ["pending", "active", "suspended", "deactivated"],
  schedule: ["paid", "partial", "due", "overdue", "upcoming"],
  booking: ["pending_payment", "confirmed", "completed", "cancelled", "late_cancelled", "no_show", "transfer_cancelled", "checked_in"],
  stayPoints: ["unreleased", "released", "released_by_waiver", "non_activated", "forfeited"],
  igp: ["pending", "approved", "defaulted", "cancelled", "replaced", "pending_review"],
  receiptRows: ["ready", "needs_review", "invalid"],
  receiptBatches: ["pending_signoff", "signed_off", "rejected"],
  unmatched: ["unmatched", "matched", "rejected"],
  accreditationStatus: ["pending", "active", "suspended", "revoked", "cancelled"],
  accreditationValidity: ["valid", "expires_today", "expired", "incomplete"],
  registration: ["draft", "submitted", "pending_review", "approved", "rejected", "withdrawn", "needs_info"],
};

describe("badge hues", () => {
  it("are at least 18 degrees apart", () => {
    const entries = Object.entries(HUES);
    expect(entries).toHaveLength(9);
    for (const [first, a] of entries) {
      for (const [second, b] of entries) {
        if (first >= second) continue;
        const gap = Math.abs(hue(a) - hue(b));
        expect(Math.min(gap, 360 - gap), `${first} and ${second}`).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it("read at 4.5:1 on their own tint", () => {
    for (const [name, hex] of Object.entries(HUES)) {
      const tint = rgb(hex).map((c) => c * 0.1 + 0.9);
      const tintLum = luminance("#" + tint.map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join(""));
      const ratio = (tintLum + 0.05) / (luminance(hex) + 0.05);
      expect(ratio, name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("status presentation", () => {
  it.each(Object.entries(GROUPS))("gives every %s status its own color, or its own icon when it is gray", (_name, statuses) => {
    const styles = statuses.map(statusPresentation);
    const colored = styles.filter(({ tone }) => tone !== "neutral" && tone !== "brand");
    expect(new Set(colored.map(({ tone }) => hueOf(tone))).size).toBe(colored.length);
    expect(new Set(styles.map(({ icon }) => icon)).size).toBe(styles.length);
    const gray = styles.filter(({ tone }) => tone === "neutral");
    expect(new Set(gray.map(({ icon, treatment }) => `${icon.displayName}:${treatment}`)).size).toBe(gray.length);
  });

  it("knows a presentation for every listed status key", () => {
    for (const key of STATUS_KEYS) expect(statusPresentation(key).icon).toBeDefined();
  });
});
