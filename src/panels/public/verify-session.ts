/**
 * Visitor state for the public seller check, copied from the v2 flow (UI21): a contact "receipt"
 * that lasts 24 hours and a daily allowance of 3 successful searches.
 * Held in module memory only, so a full page load clears it. Contact details are never stored:
 * only the time they were accepted.
 * shortcut: mock limit, move to a server rate limit (per IP, with a robot check) when the backend exists.
 */
export const VERIFY_DAILY_LIMIT = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export type VerifySession = {
  hasValidReceipt: () => boolean;
  saveReceipt: () => void;
  remainingSearches: () => number;
  recordSuccess: () => void;
};

export function createVerifySession(now: () => number = Date.now): VerifySession {
  let receiptExpiresAt = 0;
  let successes: number[] = [];
  const prune = () => {
    const cutoff = now() - DAY_MS;
    successes = successes.filter((at) => at > cutoff);
  };
  return {
    hasValidReceipt: () => receiptExpiresAt > now(),
    saveReceipt: () => {
      receiptExpiresAt = now() + DAY_MS;
    },
    remainingSearches: () => {
      prune();
      return Math.max(0, VERIFY_DAILY_LIMIT - successes.length);
    },
    recordSuccess: () => {
      prune();
      successes.push(now());
    },
  };
}

/** One shared session per browser tab. */
export const verifySession = createVerifySession();
