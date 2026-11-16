import { describe, expect, it } from "vitest";
import { createVerifySession, VERIFY_DAILY_LIMIT } from "./verify-session";

describe("createVerifySession", () => {
  it("keeps the contact receipt for 24 hours", () => {
    let now = 1_000;
    const session = createVerifySession(() => now);
    expect(session.hasValidReceipt()).toBe(false);
    session.saveReceipt();
    now += 24 * 60 * 60 * 1000 - 1;
    expect(session.hasValidReceipt()).toBe(true);
    now += 1;
    expect(session.hasValidReceipt()).toBe(false);
  });

  it("allows 3 successful searches in a rolling 24 hours", () => {
    let now = 0;
    const session = createVerifySession(() => now);
    for (let i = 0; i < VERIFY_DAILY_LIMIT; i += 1) session.recordSuccess();
    expect(session.remainingSearches()).toBe(0);
    now += 24 * 60 * 60 * 1000 + 1;
    expect(session.remainingSearches()).toBe(VERIFY_DAILY_LIMIT);
  });
});
