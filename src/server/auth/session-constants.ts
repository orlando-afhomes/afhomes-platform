// No "server-only" here: proxy.ts reads the cookie name too.
export const SESSION_COOKIE = "afhomes_session";

// shortcut: 12 hours for local work. Production session length is an open owner decision
// (docs/development/security.md); Firebase allows 5 minutes to 14 days.
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

/** How recently the person must have typed their password to open a session. */
export const RECENT_SIGN_IN_SECONDS = 5 * 60;
