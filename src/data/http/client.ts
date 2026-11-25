/** Browser event raised when the server says the session is no longer valid. */
export const SESSION_EXPIRED_EVENT = "afhomes:session-expired";

/** A failed API call, carrying the safe error the server returned. */
export class ApiRequestError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly fields?: Record<string, string>) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Raised for a repository the real backend does not serve yet. The screen shows its normal error state. */
export class NotConnectedError extends Error {
  constructor(readonly operation: string) {
    super("This part of the app is not connected to the real backend yet.");
    this.name = "NotConnectedError";
  }
}

type Init = { method?: "GET" | "POST"; body?: unknown; form?: FormData; signal?: AbortSignal };

/**
 * One call to /api/v1 with the session cookie. A write carries a fresh Idempotency-Key, so the server never repeats
 * its effect if the same request is retried; a screen prevents a double click by disabling its button while busy.
 */
export async function apiFetch<T>(path: string, init: Init = {}): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {};
  if (method !== "GET") headers["Idempotency-Key"] = crypto.randomUUID();
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers,
    body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    signal: init.signal,
    cache: "no-store",
  });
  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    // Let the session provider clear protected queries and show the sign-in page.
    if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    const error = (parsed as { error?: { code?: string; message?: string; fields?: Record<string, string> } } | null)?.error;
    throw new ApiRequestError(response.status, error?.code ?? "request_failed", error?.message ?? "The request failed. Try again.", error?.fields);
  }
  return parsed as T;
}

type Page<T> = { items: T[]; total: number; nextCursor: string | null };

/** Reads every page of a list and returns all rows. */
export async function fetchAllPages<T>(path: string, pageSize: number, signal?: AbortSignal): Promise<T[]> {
  const items: T[] = [];
  let after: string | null = null;
  do {
    const page: Page<T> = await apiFetch<Page<T>>(`${path}?limit=${pageSize}${after ? `&after=${after}` : ""}`, { signal });
    items.push(...page.items);
    after = page.nextCursor;
  } while (after);
  return items;
}

/** 404 means "not there for this person": a lookup answers null instead of failing. */
export async function fetchOrNull<T>(path: string, signal?: AbortSignal): Promise<T | null> {
  try {
    return await apiFetch<T>(path, { signal });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
