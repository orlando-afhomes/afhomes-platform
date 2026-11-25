// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ApiRequestError, apiFetch, SESSION_EXPIRED_EVENT } from "./client";

afterEach(() => vi.unstubAllGlobals());

it("announces a 401 so the session provider can clear protected data and sign the person out", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ error: { code: "unauthenticated", message: "Sign in to continue." } }), { status: 401, headers: { "Content-Type": "application/json" } })),
  );
  const listener = vi.fn();
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  await expect(apiFetch("/contracts")).rejects.toBeInstanceOf(ApiRequestError);
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
});
