// shortcut: mock login only, remove when real authentication (Better Auth/API) is implemented
import { DEV_IDENTITIES } from "@/data/mock/dev-identities";

export const MOCK_SESSION_KEY = "afhomes.mock-session.v1";

export function readSession(): { identityId: string } | null {
  try {
    const raw = window.localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    const id = (JSON.parse(raw) as { identityId?: unknown }).identityId;
    return typeof id === "string" && DEV_IDENTITIES.some((item) => item.id === id) ? { identityId: id } : null;
  } catch {
    return null;
  }
}

export function writeSession(identityId: string) {
  try {
    window.localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify({ identityId }));
  } catch {
    // Storage unavailable: session lasts only for this page load.
  }
}

export function clearSession() {
  try {
    window.localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}
