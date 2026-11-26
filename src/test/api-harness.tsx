import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { DevIdentity } from "@/modules/identity/types";
import { DEV_IDENTITIES } from "@/data/seed/dev-identities";
import { getGrantedModuleIds, getGrantedOperations } from "@/modules/identity/permissions";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";

/** Answers one API call; return undefined to fall through to the default empty list. */
export type ApiHandler = (url: URL, init?: RequestInit) => Response | undefined | Promise<Response | undefined>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function identityById(id: string): DevIdentity {
  const identity = DEV_IDENTITIES.find((item) => item.id === id);
  if (!identity) throw new Error(`Unknown test identity ${id}`);
  return identity;
}

/** The /api/v1/session body for an identity, with the grants the server would answer. */
export function sessionBody(identityId: string) {
  const identity = identityById(identityId);
  return { identity, modules: [...getGrantedModuleIds(identity)], operations: [...getGrantedOperations(identity)] };
}

/**
 * Installs a fetch stub for the API: the session route answers with the identity's grants,
 * handled routes answer from `handler`, and everything else answers an empty page.
 */
export function stubApi(identityId: string, handler?: ApiHandler) {
  const session = sessionBody(identityId);
  const fetchMock = vi.fn(async (input?: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string"
      ? input
      : input && typeof (input as { url?: unknown }).url === "string"
        ? (input as { url: string }).url
        : String(input ?? "");
    const url = new URL(raw, "http://localhost");
    if (url.pathname === "/api/v1/session") {
      return init?.method === "DELETE" ? json({ ok: true }) : json(session);
    }
    const custom = await handler?.(url, init);
    return custom ?? json({ items: [], nextCursor: null });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function ApiWrapper({ children }: { children: ReactNode; identityId?: string }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <SessionIdentityProvider>{children}</SessionIdentityProvider>
    </QueryClientProvider>
  );
}

/** Renders under the real session provider with the API stubbed for `identityId`. */
export function renderWithApi(ui: ReactNode, identityId = "dev-admin", handler?: ApiHandler): RenderResult {
  stubApi(identityId, handler);
  return render(<ApiWrapper identityId={identityId}>{ui}</ApiWrapper>);
}
