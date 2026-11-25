// No "server-only" here: proxy.ts reads the cookie name too.
export const SESSION_COOKIE = "afhomes_session";

// Owner decision 2026-11-25: production sessions last 8 hours (Firebase allows 5 minutes to 14 days).
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** How recently the person must have typed their password to open a session. */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;
